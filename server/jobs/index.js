/**
 * Job ingest orchestrator.
 *
 * Entry point for both `POST /api/cron/ingest-jobs` (Render cron) and
 * `POST /api/admin/jobs/ingest` (manual trigger from the admin app). Kept as a
 * plain async function so both paths share it — the same shape as
 * aggregateUserMemory() in server.js.
 *
 * Design notes worth knowing before changing anything here:
 *
 *  - Everything is driven by DATABASE CONFIG (job_markets, job_sources,
 *    job_queries, job_source_accounts). Adding a country or a company is an
 *    INSERT, not a deploy.
 *  - The filter cascade drops jobs BEFORE they become rows. That is what keeps
 *    the admin approval queue at tens of rows a day instead of thousands, and
 *    every drop is counted into job_ingest_runs.dropped so the tuning is visible.
 *  - Nothing here writes `profession` or `seniority` — they are GENERATED
 *    columns. Only *_inferred is written, so admin overrides always survive
 *    a re-ingest.
 */

import axios from 'axios'
import { getAdapter, supportsMarket } from './sources/index.js'
import { createRateLimiter } from './lib/rateLimiter.js'
import { getAllowance, fitToBudget } from './lib/budget.js'
import { createRunLog, createDropCounter } from './lib/runLog.js'
import { mapProfession, couldMapProfession } from './lib/profession.js'
import { inferSeniority } from './lib/seniority.js'
import { isBlockedTitle } from './config/titleBlocklist.js'
import { matchesMarket, stripSharedPrefix, buildSnippet, normaliseCompany } from './lib/normalise.js'
import {
  canonicaliseUrl, hashUrl, resolveCanonicalUrl, buildBlockKey,
  rejectionFingerprint, findDuplicate, titleSimilarity, TITLE_MATCH_THRESHOLD,
} from './lib/dedupe.js'
import { loadExisting, buildRow, persistBatch } from './lib/persist.js'
import { sweepExpired, sweepStalePending, updateTypicalVolume, MAX_POSTED_AGE_DAYS } from './lib/expire.js'
import { resolveCompanyLogos } from './lib/logos.js'

const DEFAULT_DEADLINE_MS = Number(process.env.JOBS_INGEST_MAX_SECONDS || 240) * 1000
// Resolving a canonical URL costs one outbound request per NEW job. Cheap at
// normal volume; capped so a source that suddenly returns thousands of new jobs
// cannot turn the run into a crawler.
const MAX_URL_RESOLUTIONS_PER_RUN = 120
// Two-phase sources (Workday, Oracle, JSON-LD) need one request per job to get
// its description. The cheap gates in hydrate() throw out most of a board
// first, and anything we already hold reads its description from the database,
// so this ceiling is a backstop against a board that suddenly triples — not the
// normal operating point. Jobs over the line are dropped as `not_hydrated` and
// simply picked up on the next run.
const MAX_DETAIL_FETCHES_PER_RUN = Number(process.env.JOBS_MAX_DETAIL_FETCHES || 150)
// A dry run is meant to answer "is this board configured correctly", which the
// drop breakdown answers within the first few jobs. Fetching 150 descriptions
// to find that out would make the one tool you reach for while iterating the
// slowest thing in the pipeline.
const MAX_DETAIL_FETCHES_DRY_RUN = 25

const http = axios.create({
  headers: { 'User-Agent': 'IgniteEducationJobBot/1.0 (+https://ignite.education/jobs)' },
  timeout: 30_000,
})

/**
 * @param {object}   options
 * @param {object}   options.supabase   service-role client (required)
 * @param {string[]} [options.sources]  restrict to these source keys
 * @param {string[]} [options.markets]  restrict to these market codes
 * @param {string}   [options.trigger]  'cron' | 'manual' | 'backfill'
 * @param {number}   [options.deadlineMs]
 * @param {boolean}  [options.dryRun]   classify and report, write nothing
 */
export async function runJobIngest({
  supabase,
  sources: sourceFilter = null,
  markets: marketFilter = null,
  trigger = 'cron',
  deadlineMs = DEFAULT_DEADLINE_MS,
  dryRun = false,
} = {}) {
  if (!supabase) throw new Error('runJobIngest requires a service-role supabase client')

  const startedAt = Date.now()
  const deadline = startedAt + deadlineMs
  const runLog = createRunLog(supabase)

  await runLog.reapAbandoned()

  const [{ data: markets }, { data: allSources }, { data: specialisms }] = await Promise.all([
    supabase.from('job_markets').select('*').eq('enabled', true),
    supabase.from('job_sources').select('*'),
    supabase.from('courses').select('title, name, course_type').in('status', ['live', 'coming_soon']),
  ])

  // The taxonomy is the specialism course list — the same one /prompts filters
  // on. A null course_type counts as a specialism, matching getCoursesByType().
  const allowedProfessions = (specialisms || [])
    .filter(c => !c.course_type || c.course_type === 'specialism')
    .map(c => c.title || c.name)

  warnAboutUnmappedProfessions(allowedProfessions)

  const activeMarkets = (markets || []).filter(m => !marketFilter || marketFilter.includes(m.code))
  const activeSources = (allSources || []).filter(
    s => s.enabled && s.trust_level !== 'blocked' && (!sourceFilter || sourceFilter.includes(s.key))
  )

  const summary = []

  for (const source of activeSources) {
    const adapter = getAdapter(source.key)
    if (!adapter) {
      console.warn(`⚠️  [jobs] no adapter registered for source "${source.key}" — skipping`)
      continue
    }

    for (const market of activeMarkets) {
      if (!supportsMarket(adapter, market.code)) continue
      if (Date.now() > deadline) {
        console.warn('⏱️  [jobs] deadline reached, stopping before', source.key, market.code)
        break
      }

      const result = await ingestSourceMarket({
        supabase, adapter, source, market, trigger, deadline, dryRun,
        allowedProfessions, runLog,
      })
      summary.push(result)
    }
  }

  const totals = summary.reduce(
    (acc, r) => ({
      fetched: acc.fetched + r.stats.fetched,
      inserted: acc.inserted + r.stats.inserted,
      updated: acc.updated + r.stats.updated,
      autoApproved: acc.autoApproved + r.stats.autoApproved,
      queued: acc.queued + r.stats.queued,
      expired: acc.expired + r.stats.expired,
      apiCalls: acc.apiCalls + r.stats.apiCalls,
    }),
    { fetched: 0, inserted: 0, updated: 0, autoApproved: 0, queued: 0, expired: 0, apiCalls: 0 }
  )

  console.log(
    `✅ [jobs] ingest complete in ${Math.round((Date.now() - startedAt) / 1000)}s — ` +
    `${totals.fetched} fetched, ${totals.inserted} new (${totals.autoApproved} auto-approved, ` +
    `${totals.queued} queued), ${totals.updated} refreshed, ${totals.expired} expired`
  )

  return { runs: summary, totals, durationMs: Date.now() - startedAt, dryRun }
}

/** One (source × market) pass. */
async function ingestSourceMarket({
  supabase, adapter, source, market, trigger, deadline, dryRun,
  allowedProfessions, runLog,
}) {
  const label = `${source.key}/${market.code}`
  const runId = dryRun ? null : await runLog.start({ source: source.key, market: market.code, trigger })
  const drops = createDropCounter()
  const stats = {
    fetched: 0, inserted: 0, updated: 0, autoApproved: 0, queued: 0, expired: 0,
    apiCalls: 0, detailCalls: 0,
  }

  const limiter = createRateLimiter({
    perMinute: source.rate_per_minute,
    minDelayMs: source.min_delay_ms,
    label: source.key,
  })

  try {
    // --- 1. What work is there? ---------------------------------------------
    const units = adapter.requiresQuery
      ? await loadQueryUnits(supabase, source, market)
      : await loadAccountUnits(supabase, source, market)

    if (units.length === 0) {
      if (!dryRun) await runLog.finish(runId, { status: 'success', stats, dropped: drops.all })
      return { label, status: 'success', stats, dropped: drops.all, note: 'no work configured' }
    }

    // --- 2. Trim to the remaining API budget --------------------------------
    const { allowed, detail } = await getAllowance(supabase, source)
    const { units: budgeted, dropped: budgetDropped } = fitToBudget(units, allowed)
    if (budgetDropped > 0) {
      drops.count('budget_exhausted')
      console.warn(`💰 [jobs] ${label}: budget trimmed ${budgetDropped} work unit(s) (${detail})`)
    }
    if (budgeted.length === 0) {
      if (!dryRun) await runLog.finish(runId, { status: 'partial', stats, dropped: drops.all })
      return { label, status: 'partial', stats, dropped: drops.all, note: `budget exhausted (${detail})` }
    }

    // --- 3a. Fetch + normalise -----------------------------------------------
    const raws = []
    let hitDeadline = false
    let unitFailures = 0

    for (const unit of budgeted) {
      if (Date.now() > deadline) { hitDeadline = true; break }

      const collected = []
      // Per-unit isolation. One source now fans out over many boards — a single
      // Workday tenant that has been migrated away must not take Roche, Nike,
      // LSEG and Mars down with it, which is what a throw here used to do.
      try {
        for (let page = 1; page <= (unit.maxPages || 1); page++) {
          if (Date.now() > deadline) { hitDeadline = true; break }

          const { items, hasMore, apiCalls } = await adapter.fetchPage({
            market, query: unit.query, account: unit.account, page, http, limiter, env: process.env,
          })
          stats.apiCalls += apiCalls || 0
          stats.fetched += items.length

          for (const item of items) {
            const raw = adapter.normalise(item, { market, query: unit.query, account: unit.account })
            if (raw) collected.push({ raw, unit })
          }
          if (!hasMore || items.length === 0) break
        }
        if (!dryRun && unit.account) await recordUnitResult(supabase, unit.account, null)
      } catch (error) {
        unitFailures++
        const name = unit.account ? `${source.key}/${unit.account.account}` : unit.query?.label
        console.error(`⚠️  [jobs] ${label}: work unit "${name}" failed:`, error.message)
        drops.count('unit_failed')
        if (!dryRun && unit.account) await recordUnitResult(supabase, unit.account, error.message)
        continue
      }

      raws.push(...collected)
    }

    // --- 3b. Hydrate two-phase sources ---------------------------------------
    // Workday, Oracle and JSON-LD sitemaps return a list with no description in
    // it. Fetching one per job is the most expensive thing the pipeline can do,
    // so three gates run first — see hydrate() for why each is sound.
    let existing = null
    if (typeof adapter.hydrateOne === 'function') {
      const result = await hydrate({
        supabase, adapter, source, market, raws, drops, stats, deadline, dryRun,
        allowedProfessions, limiter,
      })
      raws.length = 0
      raws.push(...result.raws)
      // Reused by step 5 rather than re-queried: hydrate already loaded the
      // whole board, and its map is a superset of what the cascade needs.
      existing = result.existing
    }

    // --- 3c. Strip each board's shared boilerplate ---------------------------
    // Every advert from one company opens with the same "About us" pitch, so a
    // naive snippet makes all their roles look identical on the board. We have
    // the whole board in hand here, so strip the shared opening.
    //
    // After hydration, not before: stripSharedPrefix ignores texts shorter than
    // its minimum prefix, so running it on the empty descriptions a two-phase
    // list returns would silently do nothing at all.
    for (const group of groupByUnit(raws).values()) {
      const stripped = stripSharedPrefix(group.map(entry => entry.raw.descriptionText || ''))
      group.forEach((entry, i) => {
        if (stripped[i] !== entry.raw.descriptionText) {
          entry.raw.descriptionText = stripped[i]
          entry.raw.descriptionSnippet = buildSnippet(stripped[i])
        }
      })
    }

    // --- 4. Filter cascade ---------------------------------------------------
    const companyTrust = await loadCompanyTrust(supabase, raws.map(r => r.raw.company))
    const allowedCompanies = await loadCompanyAllowlist(supabase)
    const candidates = []

    for (const { raw, unit } of raws) {
      // (1) Too old. Two limits, and the tighter wins: the per-source
      //     max_age_days from job_sources, and the board-wide MAX_POSTED_AGE_DAYS.
      //
      //     ATS feeds used to be exempt here, because their posted_at is when
      //     the requisition record was created rather than when the advert went
      //     up — presence in the feed was treated as the only "still open"
      //     signal, with delisting (expire.js) as the lifecycle rule. The
      //     exemption is gone deliberately: it let genuinely open but very cold
      //     requisitions onto the board, including some dated 2013. The cost is
      //     that evergreen roles now drop too. See MAX_POSTED_AGE_DAYS in
      //     expire.js for the measured size of that trade before changing it.
      if (raw.postedAt) {
        const ageDays = (Date.now() - new Date(raw.postedAt).getTime()) / 86_400_000
        if (ageDays > Math.min(source.max_age_days, MAX_POSTED_AGE_DAYS)) {
          drops.count('too_old'); continue
        }
      }

      // (2) Not a real vacancy.
      if (isBlockedTitle(raw.title)) { drops.count('title_blocked'); continue }

      // (3) Company allowlist. Placed before profession mapping because it is
      //     the most selective filter we have — for an aggregator it discards
      //     the overwhelming majority of a fetch, and there is no point
      //     classifying a job from a brand we will never display.
      const companyKey = normaliseCompany(raw.company)
      if (allowedCompanies && !allowedCompanies.has(companyKey)) {
        drops.count('company_not_allowed'); continue
      }

      // (4) Not one of our specialisms.
      const classification = mapProfession({
        title: raw.title,
        descriptionText: raw.descriptionText,
        sourceCategory: raw.sourceCategory,
        queryProfession: unit.query?.profession || null,
        allowedProfessions,
      })
      if (!classification) { drops.count('no_profession'); continue }

      // (5) Company blocklist — one rejection stops an agency recurring forever.
      const trust = companyTrust.get(companyKey)
      if (trust === 'blocked') { drops.count('company_blocked'); continue }

      // (6) Wrong market. ATS boards are global; queries are already scoped.
      if (!adapter.requiresQuery &&
          !matchesMarket(raw.locationRaw, market.location_matchers, market.location_excluders)) {
        drops.count('wrong_market'); continue
      }

      // (7) Executive roles. Our taxonomy is three levels — admitting VPs as
      //     "senior" would make the senior filter meaningless.
      const seniority = inferSeniority({
        title: raw.title,
        descriptionText: raw.descriptionText,
        isSnippet: raw.isSnippet,
        profession: classification.profession,
        nativeSeniority: raw.nativeSeniority,
        flags: raw.flags,
        sourceCategory: raw.sourceCategory,
      })
      if (seniority.tier === 'executive') { drops.count('executive'); continue }

      candidates.push({ raw, unit, classification, seniority, companyTrust: trust })
    }

    // --- 5. Rejection memory + dedupe ---------------------------------------
    // Single-phase sources look up only the candidates that survived the
    // cascade — for Greenhouse that is a handful out of 1,400 fetched, so
    // loading the whole board here would be eight chunked queries instead of
    // one. Two-phase sources already hold the full map from hydration.
    existing ??= await loadExisting(supabase, source.key, candidates.map(c => c.raw.sourceJobId))
    const rejected = await loadRejectionFingerprints(
      supabase,
      candidates.map(c => rejectionFingerprint({
        companyNorm: normaliseCompany(c.raw.company), market: market.code, title: c.raw.title,
      }))
    )

    const rows = []
    let urlResolutions = 0

    // Within-run dedupe. findDuplicate() queries the DATABASE, but nothing is
    // written until persistBatch() at the very end — so without this, two
    // postings of the same role in the SAME run never get compared and both
    // land on the board. That is exactly how "Principal Product Manager,
    // Loyalty" appeared three times (one per office location).
    const seenHashes = new Set()
    const seenBlocks = new Map()   // blockKey → title, for fuzzy comparison

    for (const candidate of candidates) {
      const { raw } = candidate
      const isNew = !existing.has(raw.sourceJobId)

      if (isNew) {
        const fingerprint = rejectionFingerprint({
          companyNorm: normaliseCompany(raw.company), market: market.code, title: raw.title,
        })
        if (rejected.has(fingerprint)) { drops.count('rejected_repeat'); continue }
      }

      // Resolving redirects is the highest-signal dedupe step, but it costs an
      // outbound request — so only for genuinely new jobs, and capped.
      let canonicalUrl = canonicaliseUrl(raw.applyUrlRaw)
      if (isNew && urlResolutions < MAX_URL_RESOLUTIONS_PER_RUN && Date.now() < deadline) {
        canonicalUrl = await resolveCanonicalUrl(raw.applyUrlRaw, { http })
        urlResolutions++
      }

      const dedupe = {
        canonicalUrl,
        canonicalUrlHash: hashUrl(canonicalUrl),
        blockKey: buildBlockKey({ company: raw.company, title: raw.title, market: market.code }),
        companyTrust: candidate.companyTrust,
      }

      if (isNew) {
        // (a) against rows already staged in THIS run
        if (dedupe.canonicalUrlHash && seenHashes.has(dedupe.canonicalUrlHash)) {
          drops.count('duplicate')
          continue
        }
        const stagedTitle = seenBlocks.get(dedupe.blockKey)
        if (stagedTitle && titleSimilarity(raw.title, stagedTitle) >= TITLE_MATCH_THRESHOLD) {
          drops.count('duplicate')
          continue
        }

        // (b) against rows already in the database
        const duplicate = await findDuplicate(
          { ...dedupe, title: raw.title, canonicalUrlHash: dedupe.canonicalUrlHash },
          supabase
        )
        if (duplicate) {
          // If the record it collides with was rejected, this is the same role
          // coming back under a new id.
          drops.count(duplicate.status === 'rejected' ? 'rejected_repeat' : 'duplicate')
          continue
        }

        if (dedupe.canonicalUrlHash) seenHashes.add(dedupe.canonicalUrlHash)
        if (dedupe.blockKey && !seenBlocks.has(dedupe.blockKey)) {
          seenBlocks.set(dedupe.blockKey, raw.title)
        }
      }

      const row = buildRow({
        raw, source, market, account: candidate.unit.account,
        classification: candidate.classification,
        seniority: candidate.seniority,
        dedupe,
        trustLevel: source.trust_level,
      })
      // Carried alongside the row, stripped before insert — the apply URL goes
      // to job_listing_apply, never to job_listings.
      row._applyUrl = canonicalUrl || raw.applyUrlRaw
      row._rawApplyUrl = raw.applyUrlRaw
      rows.push(row)
    }

    // --- 6. Persist ----------------------------------------------------------
    if (!dryRun && rows.length) {
      const written = await persistBatch(supabase, rows, existing)
      Object.assign(stats, {
        inserted: written.inserted,
        updated: written.updated,
        autoApproved: written.autoApproved,
        queued: written.queued,
      })
    } else if (dryRun) {
      stats.inserted = rows.filter(r => !existing.has(r.source_job_id)).length
      stats.updated = rows.length - stats.inserted
    }

    // --- 7. Company logos ----------------------------------------------------
    // After persisting, so newly inserted rows get their logo in the same run.
    // Keyed on company, throttled to one lookup per company per 30 days, and
    // never allowed to fail the run — a missing logo falls back to the coloured
    // initial tile on the board, which is a cosmetic outcome, not an outage.
    if (!dryRun && rows.length) {
      try {
        const logoStats = await resolveCompanyLogos(
          supabase, http,
          rows.map(r => ({ company: r.company, source: r.source, account: r.source_account })),
          { log: msg => console.log(`📋 [jobs] ${label}${msg}`) }
        )
        stats.logosResolved = logoStats.resolved
      } catch (error) {
        console.error(`⚠️  [jobs] ${label}: logo resolution failed:`, error.message)
      }
    }

    // --- 8. Expiry -----------------------------------------------------------
    let guardTripped = false
    if (!dryRun) {
      const swept = await sweepExpired(supabase, {
        source, market, fetched: stats.fetched, typicalVolume: source.typical_volume,
      })
      stats.expired = swept.expired
      guardTripped = swept.guardTripped
      await sweepStalePending(supabase, { source, market })
    }

    const status = hitDeadline || guardTripped || budgetDropped > 0 || unitFailures > 0
      ? 'partial'
      : 'success'
    if (!dryRun) {
      await runLog.finish(runId, { status, stats, dropped: drops.all })
      // Not gated on `status === 'success'`: a run whose only fault was tripping
      // the volume guard must still be able to re-baseline, or a legitimate
      // change in configured scope deadlocks the guard permanently. The scope
      // qualifier inside updateTypicalVolume is what keeps that safe — see the
      // comment there before loosening this further.
      if (!hitDeadline) await updateTypicalVolume(supabase, source.key, market.code, stats.apiCalls)
    }

    console.log(
      `📋 [jobs] ${label}: ${stats.fetched} fetched → ${stats.inserted} new ` +
      `(${stats.autoApproved} live, ${stats.queued} queued), ${stats.updated} refreshed, ` +
      `${stats.expired} expired, dropped ${JSON.stringify(drops.all)}`
    )

    return { label, status, stats, dropped: drops.all }
  } catch (error) {
    console.error(`❌ [jobs] ${label} failed:`, error.message)
    if (!dryRun) await runLog.finish(runId, { status: 'failed', stats, dropped: drops.all, error: error.message })
    return { label, status: 'failed', stats, dropped: drops.all, error: error.message }
  }
}

// --- hydration ---------------------------------------------------------------

/**
 * Fill in descriptions for a two-phase source.
 *
 * Workday, Oracle Recruiting Cloud and a sitemap of JSON-LD pages all return a
 * list with no advert text in it, so the description costs one request per job.
 * On a board like Roche's — 1,191 requisitions worldwide — fetching every one
 * would spend the entire run on jobs that were always going to be dropped.
 *
 * Three gates run first, and each is chosen because it is SOUND on title and
 * date alone, i.e. it can only discard jobs the full cascade would also have
 * discarded:
 *
 *   1. isBlockedTitle()      — pure title check, identical to cascade step 2.
 *   2. the age limit         — identical to cascade step 1. Two-phase adapters
 *                              give a conservative date up front (Workday's
 *                              "Posted 30+ Days Ago", a sitemap's <lastmod>),
 *                              never one fresher than the truth.
 *   3. couldMapProfession()  — title evidence is MANDATORY in mapProfession, so
 *                              a title with no rule hit can never score however
 *                              good its description. See that function's note.
 *
 * Then the cheapest branch of all: a job we already hold reads its description
 * from the database. In steady state a 40-job board with two new roles costs
 * two requests, not forty. That branch is also a correctness requirement, not
 * just an optimisation — description_* are VOLATILE_FIELDS in persist.js, so
 * persisting a re-seen job without its text would blank what it already had.
 *
 * Anything still unhydrated when the cap or the deadline is reached is dropped
 * as `not_hydrated` rather than persisted empty, and picked up the next run.
 *
 * @returns {Promise<{raws: Array, existing: Map}>}
 */
async function hydrate({
  supabase, adapter, source, market, raws, drops, stats, deadline, dryRun,
  allowedProfessions, limiter,
}) {
  const existing = await loadExisting(supabase, source.key, raws.map(r => r.raw.sourceJobId))
  const cap = dryRun ? MAX_DETAIL_FETCHES_DRY_RUN : MAX_DETAIL_FETCHES_PER_RUN
  const maxAgeDays = Math.min(source.max_age_days, MAX_POSTED_AGE_DAYS)
  const kept = []

  for (const entry of raws) {
    const { raw, unit } = entry

    // Single-phase items from the same adapter (or already-complete records)
    // pass straight through.
    if (!raw.needsDetail) { kept.push(entry); continue }

    if (isBlockedTitle(raw.title)) { drops.count('title_blocked'); continue }

    if (raw.postedAt) {
      const ageDays = (Date.now() - new Date(raw.postedAt).getTime()) / 86_400_000
      if (ageDays > maxAgeDays) { drops.count('too_old'); continue }
    }

    if (!couldMapProfession({ title: raw.title, allowedProfessions })) {
      drops.count('no_profession'); continue
    }

    const held = existing.get(raw.sourceJobId)
    if (held?.description_text) {
      raw.descriptionHtml = held.description_html
      raw.descriptionText = held.description_text
      raw.descriptionSnippet = held.description_snippet || buildSnippet(held.description_text)
      raw.postedAt = held.posted_at || raw.postedAt
      raw.needsDetail = false
      kept.push(entry)
      continue
    }

    if (stats.detailCalls >= cap || Date.now() > deadline) {
      drops.count('not_hydrated'); continue
    }

    try {
      const patch = await adapter.hydrateOne(raw, {
        account: unit.account, market, http, limiter, env: process.env,
      })
      stats.detailCalls++
      if (!patch) { drops.count('not_hydrated'); continue }
      Object.assign(raw, patch)
      kept.push(entry)
    } catch (error) {
      stats.detailCalls++
      // One dead advert URL is normal — a job closed between the list and the
      // detail call. Logged at debug volume rather than as a run failure.
      drops.count('not_hydrated')
      if (drops.all.not_hydrated === 1) {
        console.warn(`⚠️  [jobs] ${source.key}: first hydration failure — ${error.message}`)
      }
    }
  }

  return { raws: kept, existing }
}

/**
 * Group entries by the work unit they came from, so stripSharedPrefix compares
 * one company's board against itself. Queries have no account, so they group
 * under their own label.
 */
function groupByUnit(raws) {
  const groups = new Map()
  for (const entry of raws) {
    const key = entry.unit.account?.id || entry.unit.query?.id || 'default'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  return groups
}

/**
 * Record whether a board fetched cleanly, so the admin Coverage view can tell
 * "this company has no board" from "this company's board is broken".
 *
 * Never allowed to fail the run: this is bookkeeping about an error, and losing
 * it must not turn a partial run into a failed one.
 */
async function recordUnitResult(supabase, account, errorMessage) {
  try {
    await supabase
      .from('job_source_accounts')
      .update(
        errorMessage
          ? { fail_count: (account.fail_count || 0) + 1, last_error: String(errorMessage).slice(0, 1000) }
          : { fail_count: 0, last_error: null, last_ok_at: new Date().toISOString() }
      )
      .eq('id', account.id)
  } catch (error) {
    console.error('⚠️  [jobs] could not record board result:', error.message)
  }
}

// --- config loaders ---------------------------------------------------------

async function loadQueryUnits(supabase, source, market) {
  const { data } = await supabase
    .from('job_queries')
    .select('*')
    .eq('source', source.key)
    .eq('market', market.code)
    .eq('enabled', true)
  return (data || []).map(query => ({ query, account: null, maxPages: query.max_pages || 1 }))
}

async function loadAccountUnits(supabase, source, market) {
  const { data } = await supabase
    .from('job_source_accounts')
    .select('*')
    .eq('source', source.key)
    .eq('enabled', true)
    .contains('markets', [market.code])
  // maxPages used to be hardcoded to 1, which was right while every ATS here
  // returned a whole board in one response. Workday caps its page size at 20,
  // so a board with more than that in-market needs the column.
  return (data || []).map(account => ({
    query: null,
    account,
    maxPages: account.max_pages || 1,
  }))
}

/**
 * The set of company keys we are willing to display, or null when allowlist
 * mode is off.
 *
 * Returns a flat Set of normalised keys: each allowed company's `name_norm`
 * plus every entry in its `aliases`. ATS feeds take their company name from
 * job_source_accounts.company, which we control, so those match exactly;
 * aliases exist for aggregators, which report whatever the employer typed
 * ("Marks and Spencer plc", "M&S").
 *
 * Loads the whole allowlist rather than filtering to the current batch — it is
 * a curated table of tens of rows, and the alias expansion needs all of it.
 */
async function loadCompanyAllowlist(supabase) {
  if (process.env.JOBS_COMPANY_ALLOWLIST === 'false') return null

  const { data, error } = await supabase
    .from('job_companies')
    .select('name_norm, aliases')
    .eq('allowed', true)

  if (error) throw new Error(`could not read the company allowlist — is migrations/add_job_company_allowlist.sql applied? (${error.message})`)

  // Empty allowlist + allowlist mode on is a configuration error, not a licence
  // to ingest the entire internet. Fail loudly rather than silently opening up.
  if (!data || data.length === 0) {
    throw new Error(
      'company allowlist is enabled but empty — no company would be ingestable. ' +
      'Seed job_companies with allowed = true, or set JOBS_COMPANY_ALLOWLIST=false to disable allowlist mode.'
    )
  }

  const allowed = new Set()
  for (const row of data) {
    allowed.add(row.name_norm)
    for (const alias of row.aliases || []) {
      const key = normaliseCompany(alias)
      if (key) allowed.add(key)
    }
  }
  return allowed
}

async function loadCompanyTrust(supabase, companyNames) {
  const keys = [...new Set(companyNames.map(normaliseCompany).filter(Boolean))]
  if (keys.length === 0) return new Map()

  const trust = new Map()
  const CHUNK = 200
  for (let i = 0; i < keys.length; i += CHUNK) {
    const { data } = await supabase
      .from('job_companies')
      .select('name_norm, trust')
      .in('name_norm', keys.slice(i, i + CHUNK))
    for (const row of data || []) trust.set(row.name_norm, row.trust)
  }
  return trust
}

async function loadRejectionFingerprints(supabase, fingerprints) {
  const unique = [...new Set(fingerprints.filter(Boolean))]
  if (unique.length === 0) return new Set()

  const found = new Set()
  const CHUNK = 200
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data } = await supabase
      .from('job_rejection_fingerprints')
      .select('fingerprint')
      .in('fingerprint', unique.slice(i, i + CHUNK))
      .gt('expires_at', new Date().toISOString())
    for (const row of data || []) found.add(row.fingerprint)
  }
  return found
}

/**
 * A specialism with no mapping rule silently ingests nothing, which looks
 * identical to "there are no jobs". Make it loud instead.
 */
function warnAboutUnmappedProfessions(allowedProfessions) {
  // Imported lazily to keep this file's import list about the pipeline.
  import('./config/professionMap.js').then(({ PROFESSION_RULES }) => {
    const mapped = new Set(Object.keys(PROFESSION_RULES))
    const missing = allowedProfessions.filter(p => !mapped.has(p))
    if (missing.length) {
      console.warn(
        `⚠️  [jobs] these specialisms have no mapping rule and will ingest nothing: ${missing.join(', ')}\n` +
        '   Add them to server/jobs/config/professionMap.js'
      )
    }
  })
}

export default runJobIngest
