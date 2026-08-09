/**
 * Writing listings to the database.
 *
 * The critical rule here: NEVER use Supabase `.upsert()` on job_listings.
 *
 * Upsert replaces the row, which would reset `status`, `approved_at` and both
 * `*_override` columns on every run — silently resurrecting rejected jobs and
 * discarding every admin decision. Instead we look up existing rows by
 * (source, source_job_id) and UPDATE only the volatile content fields.
 */

import { normaliseCompany } from './normalise.js'

/**
 * Fields worth refreshing when a job we already have reappears in a feed.
 *
 * `company_logo_url` is deliberately NOT here. Every adapter hardcodes
 * `companyLogoUrl: null` — no ATS API returns a logo — so refreshing it can
 * only ever overwrite a resolved logo with null. It is a company-level value
 * owned by lib/logos.js, not something a job feed knows.
 *
 * `ai_summary` and its three companion columns are deliberately NOT here
 * either, for the same class of reason: they are owned by lib/summarise.js and
 * no feed knows them. Adding them would be worse than the logo case, because it
 * would not fail loudly — every listing keeps a summary, it is just replaced by
 * a truncation each night, and the board looks like the feature was never
 * built. `description_snippet` below is that truncation, and stays volatile:
 * it remains the fallback for anything not yet summarised.
 */
const VOLATILE_FIELDS = [
  'title', 'description_html', 'description_text', 'description_snippet',
  'location_raw', 'location_city', 'location_region', 'is_remote',
  'salary_min', 'salary_max', 'salary_currency', 'salary_period', 'salary_is_estimate',
  'contract_type', 'contract_time',
]

/**
 * Look up which of these (source, source_job_id) pairs we already hold.
 * One query for the whole batch rather than one per job.
 *
 * The description columns are selected for the hydrate step in ../index.js: a
 * two-phase source (Workday, Oracle, JSON-LD) has no description in its list
 * response, and re-fetching one per job per night for jobs we already hold
 * would be the most expensive thing the pipeline does. They come from here
 * instead — and they MUST, because description_* are VOLATILE_FIELDS, so a
 * re-seen job persisted without them would blank the text it already had.
 */
export async function loadExisting(supabase, source, sourceJobIds) {
  if (sourceJobIds.length === 0) return new Map()

  const found = new Map()
  // Chunked: a company board can exceed what fits in one `.in()` filter.
  const CHUNK = 200
  for (let i = 0; i < sourceJobIds.length; i += CHUNK) {
    const chunk = sourceJobIds.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('job_listings')
      .select(
        'id, source_job_id, status, expires_at, canonical_url_hash, ' +
        'description_html, description_text, description_snippet, posted_at'
      )
      .eq('source', source)
      .in('source_job_id', chunk)

    if (error) throw new Error(`loadExisting failed: ${error.message}`)
    for (const row of data || []) found.set(row.source_job_id, row)
  }
  return found
}

/**
 * Map a RawJob plus its classification onto job_listings columns.
 *
 * Note there is no `profession` or `seniority` key: those are GENERATED columns
 * and writing them directly errors. Only the *_inferred / *_override columns are
 * writable.
 */
export function buildRow({ raw, source, market, account, classification, seniority, dedupe, trustLevel }) {
  const autoApprove = trustLevel === 'auto' || dedupe?.companyTrust === 'auto'

  return {
    source: source.key,
    source_job_id: raw.sourceJobId,
    source_account: account?.account || null,
    market: market.code,
    display_source: source.key,

    // ATS titles arrive with stray and doubled whitespace often enough that it
    // shows on the board ("Principal  Product Manager").
    title: String(raw.title).replace(/\s+/g, ' ').trim(),
    company: String(raw.company).replace(/\s+/g, ' ').trim(),
    company_norm: normaliseCompany(raw.company),
    company_logo_url: raw.companyLogoUrl || null,
    description_html: raw.descriptionHtml || null,
    description_text: raw.descriptionText || null,
    description_snippet: raw.descriptionSnippet || '',
    is_snippet: Boolean(raw.isSnippet),

    location_raw: raw.locationRaw || null,
    location_city: raw.locationCity || null,
    location_region: raw.locationRegion || null,
    country_code: raw.countryCode || market.code.toUpperCase(),
    // Adapters that know better (Lever workplaceType, Ashby isRemote,
    // Workable telecommuting) override the text-sniffed value.
    is_remote: raw.isRemoteOverride ?? Boolean(raw.isRemote),

    salary_min: raw.salaryMin ?? null,
    salary_max: raw.salaryMax ?? null,
    salary_currency: raw.salaryCurrency || null,
    salary_period: raw.salaryPeriod || null,
    salary_is_estimate: Boolean(raw.salaryIsEstimate),
    contract_type: raw.contractType || null,
    contract_time: raw.contractTime || null,

    profession_inferred: classification.profession,
    seniority_inferred: seniority.tier,
    seniority_source: seniority.source,
    seniority_token: seniority.token,
    seniority_confidence: seniority.confidence,

    canonical_url: dedupe?.canonicalUrl || null,
    canonical_url_hash: dedupe?.canonicalUrlHash || null,
    block_key: dedupe?.blockKey || null,

    status: autoApprove ? 'approved' : 'pending',
    approval_mode: autoApprove
      ? (dedupe?.companyTrust === 'auto' ? 'auto_company' : 'auto_source')
      : null,
    approved_at: autoApprove ? new Date().toISOString() : null,

    posted_at: raw.postedAt || null,
    last_seen_at: new Date().toISOString(),
    expires_at: raw.expiresAt || computeExpiry(raw.postedAt, source.max_age_days),
  }
}

/**
 * When should this listing fall off the board if the source stops mentioning it?
 *
 * Anchored on first sighting, not posting date: ATS feeds report a posting date
 * of whenever the requisition record was created, which for evergreen roles can
 * be years ago. Anchoring on posted_at would expire those instantly.
 */
function computeExpiry(postedAt, maxAgeDays = 30) {
  const anchor = Date.now()
  return new Date(anchor + maxAgeDays * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Insert new listings and refresh ones we already hold.
 *
 * @returns {Promise<{inserted: number, updated: number, autoApproved: number, queued: number}>}
 */
export async function persistBatch(supabase, rows, existing) {
  const toInsert = []
  const toUpdate = []

  for (const row of rows) {
    const match = existing.get(row.source_job_id)
    if (match) {
      const patch = { last_seen_at: row.last_seen_at, expires_at: row.expires_at }
      for (const field of VOLATILE_FIELDS) patch[field] = row[field]
      // Deliberately NOT touching status / approval / override columns.
      toUpdate.push({ id: match.id, patch })
    } else {
      toInsert.push(row)
    }
  }

  let inserted = 0
  let autoApproved = 0
  let queued = 0
  const applyUrlRows = []

  if (toInsert.length) {
    const CHUNK = 100
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK)
      // The apply URL rides along on the row object but must never be inserted
      // into job_listings — it goes to job_listing_apply below.
      const payload = chunk.map((row) => {
        const copy = { ...row }
        delete copy._applyUrl
        delete copy._rawApplyUrl
        return copy
      })

      const { data, error } = await supabase
        .from('job_listings')
        .insert(payload)
        .select('id, source_job_id, status')

      if (error) throw new Error(`insert failed: ${error.message}`)

      for (const row of data || []) {
        inserted++
        if (row.status === 'approved') autoApproved++
        else queued++

        const original = chunk.find(c => c.source_job_id === row.source_job_id)
        if (original?._applyUrl) {
          applyUrlRows.push({
            job_id: row.id,
            apply_url: original._applyUrl,
            raw_url: original._rawApplyUrl || original._applyUrl,
          })
        }
      }
    }
  }

  // Apply URLs go to their own table, which has no anon policy — that
  // separation is what makes the sign-in gate unbypassable. See
  // migrations/create_job_board_tables.sql.
  if (applyUrlRows.length) {
    const { error } = await supabase
      .from('job_listing_apply')
      .upsert(applyUrlRows, { onConflict: 'job_id' })
    if (error) throw new Error(`apply url insert failed: ${error.message}`)
  }

  let updated = 0
  for (const { id, patch } of toUpdate) {
    const { error } = await supabase.from('job_listings').update(patch).eq('id', id)
    if (error) {
      console.error(`⚠️  [jobs] update failed for ${id}:`, error.message)
      continue
    }
    updated++
  }

  return { inserted, updated, autoApproved, queued }
}

/**
 * Mark a listing as a duplicate of an existing one.
 * The loser keeps its row (so we do not re-fetch it every night) but never
 * shows on the board.
 */
export async function markDuplicate(supabase, row, canonicalId) {
  const { error } = await supabase
    .from('job_listings')
    .insert({ ...row, status: 'duplicate', canonical_group_id: canonicalId, approval_mode: null, approved_at: null })
  if (error && !/duplicate key/i.test(error.message)) {
    console.error('⚠️  [jobs] could not record duplicate:', error.message)
  }
}
