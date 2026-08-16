/**
 * Employer logo resolution.
 *
 * Runs once per COMPANY per refresh window, not per listing — a board with 300
 * listings from 25 employers does 25 lookups, not 300.
 *
 * Pipeline: company name -> domain -> favicon bytes -> Supabase storage ->
 * job_companies.logo_url -> denormalised onto job_listings.company_logo_url.
 *
 * The last hop is not redundant. `job_companies` has NO anon SELECT policy
 * (migrations/create_job_board_tables.sql), so the public board physically
 * cannot join to it. The copy on job_listings is the only one the board can read.
 *
 * WHY GOOGLE s2, AND WHY NOT THE ALTERNATIVES
 * Probed against all 36 employer domains in job_source_accounts:
 *   google s2 ....... 36/36, brand-correct, always raster, 404s on unknown domains
 *   ddg ip3 ......... independent infrastructure, also fails loudly — the fallback
 *   clearbit ........ DNS NXDOMAIN. The service is gone; every call is a timeout.
 *   icon.horse ...... BANNED. Fails *open*: returns HTTP 200 + a generated grey
 *                     letter-tile for domains that do not exist, and did exactly
 *                     that for openai.com. Undetectable without pixel inspection,
 *                     so it would silently poison the table.
 *   direct favicon .. 52%, and it fails on precisely the modern SPA stacks this
 *                     board is full of (404 handlers returning 300KB of index.html,
 *                     Cloudflare 403s, and one valid-but-fully-transparent ICO).
 */

import crypto from 'crypto'
import { normaliseCompany, slugify } from './normalise.js'

const GOOGLE_S2 = 'https://www.google.com/s2/favicons'
const DDG_IP3 = 'https://icons.duckduckgo.com/ip3'

/** Re-check a company's logo no more than this often. */
const REFRESH_DAYS = 30
/** Ceiling per run, so a sudden flood of new employers cannot turn ingest into a crawler. */
const MAX_LOOKUPS_PER_RUN = 60
/** Below this, the response is an error page or a blank placeholder, not a mark. */
const MIN_LOGO_BYTES = 100

/**
 * Stop looking once a candidate is at least this many pixels wide.
 *
 * The board paints the mark at 40 CSS px in the list and 52 in the detail pane.
 * A 2x display therefore needs 80 and 104 real pixels, and a 3x phone 120 and
 * 156 — so 128 is the first round number that is sharp everywhere we draw it.
 *
 * This is the number the old code had no concept of. It asked s2 for sz=128 and
 * kept whatever came back, and s2 does not upscale: it returns the largest it
 * holds, capped at the request. Measured on the live board, that meant 32x32
 * for Marks & Spencer and 48x48 for Amazon and The Trainline — 24 of the first
 * 30 logos on the page were being blown up, which is exactly what "blurry"
 * looked like. Asking one provider harder does not fix that; the mark is not
 * there to be had. Asking several and keeping the biggest does.
 */
const TARGET_LOGO_PX = 128

/**
 * Pixel width of an encoded image, without decoding it.
 *
 * Enough of each container's header to read one number, because the whole
 * question here is "which of these candidates is the largest" and pulling in an
 * image library to answer it would be absurd. Anything unrecognised scores 0:
 * usable if it is all we have, never preferred over a candidate we can measure.
 */
export function readImageWidth(buffer, ext) {
  try {
    // Vector. Infinitely sharp at any size, so nothing can beat it.
    if (ext === 'svg') return Number.MAX_SAFE_INTEGER

    if (ext === 'png') {
      // 8-byte signature, then the IHDR chunk: length, type, width, height.
      return buffer.readUInt32BE(16)
    }

    if (ext === 'ico') {
      // An .ico is a container: 6-byte header then one 16-byte directory entry
      // per size it holds. Browsers pick the best fit, so the largest entry is
      // what this file is really worth. A stored 0 means 256 — the field is one
      // byte and 256 does not fit in it.
      const count = buffer.readUInt16LE(4)
      let widest = 0
      for (let i = 0; i < count; i++) {
        const entry = 6 + i * 16
        if (entry + 16 > buffer.length) break
        const width = buffer[entry] === 0 ? 256 : buffer[entry]
        if (width > widest) widest = width
      }
      return widest
    }

    if (ext === 'gif') return buffer.readUInt16LE(6)

    if (ext === 'jpg') {
      // Walk the marker chain to a Start Of Frame, which is the only segment
      // carrying the dimensions. Skip every other segment by its own length.
      let offset = 2
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset++; continue }
        const marker = buffer[offset + 1]
        const isSOF = marker >= 0xc0 && marker <= 0xcf &&
          marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
        if (isSOF) return buffer.readUInt16BE(offset + 7)
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          offset += 2
          continue
        }
        offset += 2 + buffer.readUInt16BE(offset + 2)
      }
      return 0
    }

    if (ext === 'webp') {
      const chunk = buffer.slice(12, 16).toString('ascii')
      if (chunk === 'VP8X') return (buffer.readUIntLE(24, 3) & 0xffffff) + 1
      if (chunk === 'VP8L') return (buffer.readUInt32LE(21) & 0x3fff) + 1
      if (chunk === 'VP8 ') return buffer.readUInt16LE(26) & 0x3fff
      return 0
    }
  } catch {
    // Truncated or malformed header. Treat as unmeasurable rather than throwing
    // — a candidate we cannot size is still a candidate.
  }
  return 0
}

/**
 * Domain guesses for the aggregator long tail. ATS employers never reach this
 * path — they join to job_source_accounts.domain instead.
 */
const GUESS_TLDS = ['.com', '.co.uk', '.ai', '.io']

/**
 * Guessing is OFF unless explicitly enabled, and that is not caution for its
 * own sake — it is measured.
 *
 * Run against the 25 live employers with the curated mapping disabled, guessing
 * produced the WRONG COMPANY for 8 of them: harvey.co.uk (a water-softener
 * firm, not the legal-AI company), decagon.co.uk, sierra.com, graphcore.com,
 * skyscanner.com, multiverse.com, synthesia.com, perplexity.com.
 *
 * Every one passed the homepage-title check, because a company genuinely called
 * "Harvey" does have "Harvey" in its <title>. The check cannot separate
 * same-name-different-company, and no cheap heuristic can. A wrong logo is a
 * trademark complaint, not a rendering glitch, so the default is to show the
 * coloured initial tile instead — which is exactly what the board did before.
 *
 * Enable with JOBS_LOGO_GUESS_DOMAINS=true only if you intend to review the
 * results in the admin Companies tab, where the resolved domain is displayed
 * next to the logo for precisely this reason.
 */
const GUESS_ENABLED = process.env.JOBS_LOGO_GUESS_DOMAINS === 'true'

/**
 * Shortest company name we will accept a guessed domain for on the strength of
 * an exact name/domain match alone. Short names are where collisions live:
 * "DEPT" would otherwise happily claim dept.com, which belongs to someone else.
 */
const MIN_UNAMBIGUOUS_NAME_LENGTH = 5

/* -------------------------------------------------------------------------- */
/* Image sniffing                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Identify the format from magic bytes, ignoring the declared content-type.
 *
 * Providers lie about this constantly — Trustpilot serves a real ICO as
 * `application/octet-stream`, and DuckDuckGo labels PNG bytes `image/x-icon`.
 * Storing the wrong content-type matters because Supabase serves back whatever
 * we set, and some browsers then refuse to render it in an <img> — where the
 * failure would hide behind the perfectly normal-looking initial-tile fallback.
 *
 * Returns null for anything that is not an image we can serve.
 */
export function sniffImageType(buffer) {
  if (!buffer || buffer.length < 8) return null
  const b = buffer

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' }
  }
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' }
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
    return { ext: 'gif', contentType: 'image/gif' }
  }
  if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') {
    return { ext: 'webp', contentType: 'image/webp' }
  }
  // ICO: reserved(0) + type(1). Checked after the others — the signature is
  // only four bytes and two of them are zero, so it false-positives easily.
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00) {
    return { ext: 'ico', contentType: 'image/x-icon' }
  }
  // SVG is text. Sniff a prefix rather than the whole buffer — some files open
  // with a long XML declaration or a comment before the root element.
  const head = b.slice(0, 512).toString('utf8').trimStart()
  if (head.startsWith('<') && head.toLowerCase().includes('<svg')) {
    return { ext: 'svg', contentType: 'image/svg+xml' }
  }
  return null
}

/* -------------------------------------------------------------------------- */
/* Fetching                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetch the LARGEST favicon we can find for `domain`.
 *
 * Was: Google, then DuckDuckGo only if Google failed, keeping whichever
 * answered first. That treats the providers as interchangeable, and on
 * resolution they are not — s2 holds a 32x32 for some domains that DuckDuckGo
 * serves at 144, and a mark that answers first is not a mark that is any good.
 * Now every candidate is measured and the widest wins.
 *
 * Ordered by how well each behaves, not by how big it tends to be, because the
 * loop stops as soon as something clears TARGET_LOGO_PX:
 *
 *  - s2 at sz=256, up from 128. It returns the largest it holds capped at the
 *    request and never upscales — which is exactly why the old sz=128 was not
 *    the cause of the blur, and why raising it costs nothing and occasionally
 *    doubles what we get.
 *  - DuckDuckGo, independent infrastructure, and .ico files often carry several
 *    sizes in one container.
 *  - The site's own apple-touch-icon, last. It is the highest-resolution mark
 *    most sites publish — 180x180 by convention — but it is a request to the
 *    employer rather than to a cache, and the header note on direct favicon
 *    fetching applies: SPA 404 handlers answer 200 with HTML, Cloudflare answers
 *    403. Both are rejected below, by sniffImageType and the byte floor, and it
 *    is only reached for a domain the two caches served something small for.
 *
 * The HTTP STATUS is the signal, not the body. Google returns a valid 726-byte
 * grey-globe PNG alongside its 404 for unknown domains, so code that sniffed
 * bytes without checking status would cheerfully store placeholder globes for
 * every failed guess.
 */
async function fetchFavicon(http, domain) {
  const attempts = [
    { source: 'google', url: `${GOOGLE_S2}?domain=${encodeURIComponent(domain)}&sz=256` },
    { source: 'ddg', url: `${DDG_IP3}/${encodeURIComponent(domain)}.ico` },
    { source: 'apple-touch', url: `https://${domain}/apple-touch-icon.png` },
  ]

  let best = null

  for (const attempt of attempts) {
    try {
      const res = await http.get(attempt.url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        // Take every status so a 404 is a value to inspect, not a thrown error.
        validateStatus: () => true,
      })
      if (res.status !== 200) continue

      const buffer = Buffer.from(res.data)
      if (buffer.length < MIN_LOGO_BYTES) continue

      const type = sniffImageType(buffer)
      if (!type) continue

      const width = readImageWidth(buffer, type.ext)
      if (!best || width > best.width) best = { buffer, type, source: attempt.source, width }

      // Good enough to stop paying for more requests. Most companies resolve on
      // the first attempt and never reach DuckDuckGo, let alone the employer's
      // own server — so the added cost lands only on the domains that were
      // producing the blurry marks in the first place.
      if (best.width >= TARGET_LOGO_PX) break
    } catch {
      // Timeout or transport failure. Try the next provider; if all fail the
      // company is marked 'none' and retried in REFRESH_DAYS.
    }
  }

  return best
}

/* -------------------------------------------------------------------------- */
/* Name -> domain                                                             */
/* -------------------------------------------------------------------------- */

/** "GoCardless Ltd" -> "gocardless". The stem every domain guess is built from. */
function compactName(company) {
  return normaliseCompany(company).replace(/\s+/g, '')
}

/**
 * Guess a domain for a company we have no curated mapping for.
 *
 * s2's 404 doubles as a domain oracle — a candidate that returns a favicon
 * almost certainly exists — but "exists" is not "is this company", so a hit
 * still has to clear a name check before we will show its logo.
 */
async function guessDomain(http, company) {
  const compact = compactName(company)
  if (compact.length < 3) return null

  const hyphenated = normaliseCompany(company).replace(/\s+/g, '-')
  const stems = compact === hyphenated ? [compact] : [compact, hyphenated]

  for (const tld of GUESS_TLDS) {
    for (const stem of stems) {
      const candidate = `${stem}${tld}`
      let ok = false
      try {
        const res = await http.get(`${GOOGLE_S2}?domain=${encodeURIComponent(candidate)}&sz=128`, {
          responseType: 'arraybuffer',
          timeout: 10000,
          validateStatus: () => true,
        })
        ok = res.status === 200
      } catch {
        ok = false
      }
      if (!ok) continue
      if (await confirmDomainBelongsTo(http, candidate, compact)) return candidate
    }
  }
  return null
}

/**
 * Confirm a guessed domain actually belongs to this company.
 *
 * Accept when the homepage <title> mentions the company name. If the homepage
 * is bot-blocked — common, and not evidence either way — fall back to requiring
 * an exact, reasonably long name/label match. Anything else is rejected and the
 * company keeps its coloured initial tile, which is no worse than today.
 */
async function confirmDomainBelongsTo(http, domain, compact) {
  const label = domain.split('.')[0]

  try {
    const res = await http.get(`https://${domain}/`, {
      timeout: 6000,
      maxRedirects: 3,
      responseType: 'text',
      validateStatus: () => true,
    })
    if (res.status >= 200 && res.status < 400) {
      const title = String(res.data || '').match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i)?.[1] || ''
      const normalisedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (normalisedTitle.includes(compact)) return true
      // Reachable but the name is absent — most likely a different company.
      return false
    }
  } catch {
    // Fall through to the bot-blocked rule below.
  }

  return compact.length >= MIN_UNAMBIGUOUS_NAME_LENGTH && label === compact
}

/* -------------------------------------------------------------------------- */
/* Orchestration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Resolve and store logos for a set of companies.
 *
 * @param supabase   service-role client (the assets bucket's INSERT policy
 *                   rejects the anon key)
 * @param http       axios instance from the ingest orchestrator
 * @param companies  [{ company, source, account }] — `account` is the
 *                   job_source_accounts key when the listing came from an ATS
 * @returns          counters for the run log
 */
/**
 * `force` ignores the REFRESH_DAYS window and re-resolves every company it is
 * given, up to MAX_LOOKUPS_PER_RUN.
 *
 * Needed because a change to how logos are CHOSEN does not reach any company
 * already resolved — they sit untouched for 30 days, still pointing at the
 * small mark that was picked under the old rules. Nothing else changes: a
 * suppressed logo stays suppressed, the per-run ceiling still applies, and a
 * re-fetch that returns identical bytes hashes identically and is a no-op.
 */
export async function resolveCompanyLogos(supabase, http, companies, { dryRun = false, force = false, log = () => {} } = {}) {
  const stats = { considered: 0, resolved: 0, unchanged: 0, missing: 0, skipped: 0, failed: 0 }

  // Collapse to one entry per normalised company, keeping any ATS account we saw.
  const byNorm = new Map()
  for (const entry of companies) {
    const norm = normaliseCompany(entry.company)
    if (!norm) continue
    const existing = byNorm.get(norm)
    if (existing) {
      if (!existing.account && entry.account) {
        existing.account = entry.account
        existing.source = entry.source
      }
      continue
    }
    byNorm.set(norm, { norm, company: entry.company, source: entry.source, account: entry.account })
  }
  if (byNorm.size === 0) return stats

  const norms = [...byNorm.keys()]

  // Existing state, so we can honour suppressions and the refresh window.
  const state = new Map()
  const CHUNK = 200
  for (let i = 0; i < norms.length; i += CHUNK) {
    const { data } = await supabase
      .from('job_companies')
      .select('name_norm, domain, domain_source, logo_url, logo_hash, logo_status, logo_checked_at')
      .in('name_norm', norms.slice(i, i + CHUNK))
    for (const row of data || []) state.set(row.name_norm, row)
  }

  // Curated domains for the ATS accounts in this batch.
  const accountKeys = [...byNorm.values()].filter(c => c.account).map(c => `${c.source}:${c.account}`)
  const accountDomains = new Map()
  if (accountKeys.length > 0) {
    const { data, error } = await supabase.from('job_source_accounts').select('source, account, domain')
    // Loud on purpose. If this column is missing (migration not applied) every
    // ATS employer silently falls through to guessing, which is how you end up
    // showing a water-softener company's logo on a legal-AI vacancy.
    if (error) throw new Error(`could not read job_source_accounts.domain — is migrations/add_job_company_logos.sql applied? (${error.message})`)
    for (const row of data || []) {
      if (row.domain) accountDomains.set(`${row.source}:${row.account}`, row.domain)
    }
  }

  const cutoff = Date.now() - REFRESH_DAYS * 24 * 60 * 60 * 1000
  let lookups = 0

  for (const entry of byNorm.values()) {
    const current = state.get(entry.norm)

    // An admin killed this logo. Never retried — that is the whole point.
    if (current?.logo_status === 'suppressed') { stats.skipped++; continue }

    // Still inside the refresh window and already resolved. `force` skips this
    // check so a change to the selection rules can be applied to everyone.
    if (!force && current?.logo_checked_at && new Date(current.logo_checked_at).getTime() > cutoff) {
      // Re-assert the URL onto this company's listings anyway. Newly inserted
      // rows start with a null logo, and the company itself is not due a
      // re-check for another 30 days — without this they would show the initial
      // tile for a month. One cheap indexed UPDATE per company per run.
      if (current.logo_status === 'ok' && current.logo_url) {
        await propagateToListings(supabase, entry.norm, current.logo_url, dryRun)
      }
      stats.skipped++
      continue
    }

    if (lookups >= MAX_LOOKUPS_PER_RUN) { stats.skipped++; continue }
    stats.considered++

    try {
      // Domain priority: an admin's word, then the curated account mapping,
      // then a guess. Never overwrite a manual domain.
      let domain = current?.domain_source === 'manual' ? current.domain : null
      let domainSource = domain ? 'manual' : null

      if (!domain && entry.account) {
        domain = accountDomains.get(`${entry.source}:${entry.account}`) || null
        if (domain) domainSource = 'account'
      }
      if (!domain && GUESS_ENABLED) {
        lookups++
        domain = await guessDomain(http, entry.company)
        if (domain) domainSource = 'guessed'
      }

      if (!domain) {
        await writeState(supabase, entry, {
          logo_status: 'none',
          logo_checked_at: new Date().toISOString(),
        }, dryRun)
        stats.missing++
        continue
      }

      lookups++
      const fetched = await fetchFavicon(http, domain)
      if (!fetched) {
        await writeState(supabase, entry, {
          domain,
          domain_source: domainSource,
          logo_status: 'none',
          logo_checked_at: new Date().toISOString(),
        }, dryRun)
        stats.missing++
        continue
      }

      const hash = crypto.createHash('md5').update(fetched.buffer).digest('hex')

      // Same bytes as last time: refresh the timestamp and skip the upload.
      if (current?.logo_hash === hash && current?.logo_url) {
        await writeState(supabase, entry, {
          domain,
          domain_source: domainSource,
          logo_checked_at: new Date().toISOString(),
        }, dryRun)
        stats.unchanged++
        continue
      }

      const path = `job-logos/${slugify(entry.norm)}.${fetched.type.ext}`
      let publicUrl = null

      if (!dryRun) {
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(path, fetched.buffer, {
            contentType: fetched.type.contentType,
            upsert: true,
            cacheControl: '31536000',
          })
        if (uploadError) throw new Error(`upload failed: ${uploadError.message}`)

        const { data } = supabase.storage.from('assets').getPublicUrl(path)
        // The path is stable and we upsert, so the CDN would keep serving the
        // old bytes. The content hash in the query busts it — same trick as the
        // `?t=` on avatars and `?v=` on narration audio.
        publicUrl = `${data.publicUrl}?v=${hash.slice(0, 8)}`
      } else {
        publicUrl = `dry-run://${path}`
      }

      await writeState(supabase, entry, {
        domain,
        domain_source: domainSource,
        logo_url: publicUrl,
        logo_source: fetched.source,
        logo_hash: hash,
        logo_status: 'ok',
        logo_checked_at: new Date().toISOString(),
      }, dryRun)

      await propagateToListings(supabase, entry.norm, publicUrl, dryRun)
      stats.resolved++
      log(`  logo: ${entry.company} -> ${domain} (${fetched.source}, ${fetched.type.ext}, ${fetched.buffer.length}B)`)
    } catch (err) {
      stats.failed++
      log(`  logo FAILED: ${entry.company}: ${err.message}`)
    }
  }

  return stats
}

/** Upsert, because job_companies only gains a row once a company is seen. */
async function writeState(supabase, entry, patch, dryRun) {
  if (dryRun) return
  const { error } = await supabase.from('job_companies').upsert({
    name_norm: entry.norm,
    display_name: entry.company,
    ...patch,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'name_norm' })
  if (error) throw new Error(`job_companies upsert failed: ${error.message}`)
}

/**
 * Copy the resolved URL onto every listing for this company.
 *
 * `company_logo_url` is in persist.js's VOLATILE_FIELDS, so listings re-seen in
 * a later run self-heal — but rows inserted before the logo resolved would
 * otherwise keep a null forever.
 *
 * Unconditional by design. We only get here when the content hash actually
 * changed, so every matching row genuinely needs the new value — and a `.or()`
 * guard would have to interpolate the URL into PostgREST filter syntax, where
 * its punctuation is a parsing hazard for no benefit.
 */
async function propagateToListings(supabase, nameNorm, logoUrl, dryRun) {
  if (dryRun) return
  const { error } = await supabase
    .from('job_listings')
    .update({ company_logo_url: logoUrl })
    .eq('company_norm', nameNorm)
  if (error) throw new Error(`logo propagation failed: ${error.message}`)
}
