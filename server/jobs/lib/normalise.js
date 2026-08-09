/**
 * Field normalisation shared by every adapter.
 *
 * Adapters produce a `RawJob`; this module turns each source's idiosyncratic
 * shapes (HTML descriptions, "£30,000 - £35,000 per annum" strings, "London, UK"
 * blobs) into the consistent columns job_listings expects.
 */

// normaliseCompany decides whether a job's employer matches an allowlisted
// brand, so the admin app needs the identical function when it writes
// job_companies.name_norm. It lives in shared/ for that reason and is
// re-exported here so every adapter's import stays unchanged. See the header of
// that file for the third copy of this contract, in the Postgres trigger.
export { normaliseCompany, slugify } from '../../../shared/jobs/companyKey.js'

/**
 * Decode the HTML entities that actually turn up in job descriptions.
 *
 * Exported because Greenhouse returns its `content` field ENTITY-ESCAPED
 * ("&lt;p&gt;Hello&lt;/p&gt;"), so its adapter must decode once before
 * htmlToText can see any tags at all. Decoding twice on ordinary HTML is
 * harmless; skipping it on Greenhouse leaves raw "&lt;p&gt;" in the snippet.
 */
export function decodeEntities(input) {
  return String(input || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // &amp; last, so "&amp;lt;" does not become "<" in a single pass.
    .replace(/&amp;/gi, '&')
}

/**
 * HTML → readable plain text. Deliberately not a parser dependency: ATS
 * descriptions are simple markup, and block-level tags are all that matter for
 * preserving paragraph breaks.
 */
export function htmlToText(html) {
  if (!html) return ''
  const withBreaks = String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    // Blank out quoted attribute values BEFORE stripping tags. Without this a
    // `>` inside an attribute ends the tag early for the naive `<[^>]+>` match
    // and the rest of the attribute leaks into the text as garbage. Tailwind
    // arbitrary variants (class="[&>*]:pointer-events-auto") hit this
    // constantly on modern ATS-hosted descriptions.
    .replace(/="[^"]*"/g, '=""')
    .replace(/='[^']*'/g, "=''")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(withBreaks)
    .replace(/[ \t]+/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')   // inline tags leave a space before punctuation
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Strip the boilerplate every job at one company shares.
 *
 * ATS descriptions almost always open with the same "About <Company>" pitch, so
 * a naive first-300-characters snippet makes every role at a company look
 * identical on the board — the single worst thing for scannability. Since we
 * ingest a company's whole board in one request, the shared opening is simply
 * the longest common prefix across its jobs.
 *
 * Guarded: needs at least 3 jobs and a prefix of real length, and never strips
 * so much that nothing useful is left.
 *
 * @param {string[]} texts descriptions for one company
 * @returns {string[]} same order, with the shared opening removed
 */
export function stripSharedPrefix(texts, options = {}) {
  const { maxPasses = 5 } = options
  // Iterate: employers layer their boilerplate. Stripping the "ABOUT <COMPANY>"
  // intro often just reveals a shared culture or benefits section underneath,
  // which would leave the snippets identical all over again. Keep going until a
  // pass changes nothing.
  let current = texts
  for (let pass = 0; pass < maxPasses; pass++) {
    const next = stripSharedPrefixOnce(current, options)
    if (next.every((t, i) => t === current[i])) return next
    current = next
  }
  return current
}

function stripSharedPrefixOnce(texts, { minGroup = 2, minPrefix = 80, groupKeyLength = 300 } = {}) {
  const indexed = texts.map((t, i) => ({ t, i })).filter(x => x.t && x.t.length > minPrefix)
  if (indexed.length < minGroup) return texts

  // Group by opening, rather than requiring ONE prefix common to every job.
  //
  // A single longest-common-prefix over the whole board collapses as soon as one
  // job opens differently, and big employers have several boilerplate variants.
  // ElevenLabs, for example, posts 229 roles that share an "ABOUT ELEVENLABS"
  // intro but diverge a couple of hundred characters in — a global LCP there
  // strips ~85 characters and leaves the rest of the pitch in every snippet.
  //
  // groupKeyLength defaults to the snippet length, which makes the grouping
  // exactly match the symptom: two jobs produce an identical snippet if and only
  // if they share their first 300 characters, so they land in the same group and
  // their (>=300 char) common prefix gets stripped.
  const groups = new Map()
  for (const entry of indexed) {
    const key = entry.t.slice(0, groupKeyLength)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }

  const out = [...texts]

  for (const group of groups.values()) {
    if (group.length < minGroup) continue

    // Longest common prefix within this group only.
    let prefixLength = group[0].t.length
    for (let i = 1; i < group.length; i++) {
      const other = group[i].t
      let j = 0
      while (j < prefixLength && j < other.length && group[0].t[j] === other[j]) j++
      prefixLength = j
    }
    if (prefixLength < minPrefix) continue

    // Cut back to a sentence or paragraph boundary so we never slice mid-word.
    let cut = prefixLength
    const boundary = Math.max(
      group[0].t.lastIndexOf('\n', prefixLength),
      group[0].t.lastIndexOf('. ', prefixLength)
    )
    if (boundary > minPrefix) cut = boundary + 1

    for (const entry of group) {
      const remainder = entry.t.slice(cut).trim()
      // Two guards, and they matter more than the stripping itself.
      //
      // Some employers post near-identical roles that differ only in a detail —
      // Sierra runs the same Product Manager advert per spoken language, Palantir
      // the same designer advert for intern/new-grad. There the "shared prefix"
      // IS the job description, and stripping it left only the trailing EEO
      // paragraph as the whole listing.
      //
      // So a strip must leave both a usable absolute amount AND the majority of
      // the original. Failing to strip merely repeats a company intro; stripping
      // too eagerly destroys the content the user came to read.
      if (remainder.length >= 400 && remainder.length >= entry.t.length * 0.4) {
        out[entry.i] = remainder
      }
    }
  }

  return out
}

/**
 * The board ships this, never the full description — see the payload note in
 * next-app/src/data/jobsData.ts. Cuts on a word boundary so it does not end
 * mid-word.
 */
export function buildSnippet(text, maxLength = 300) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  const cut = clean.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

const PERIOD_PATTERNS = [
  [/\b(per annum|\ba year\b|annually|\bpa\b|\byearly\b)/i, 'year'],
  [/\b(per month|monthly|\bpm\b|\ba month\b)/i, 'month'],
  [/\b(per week|weekly|\ba week\b)/i, 'week'],
  [/\b(per day|daily|day rate|\ba day\b)/i, 'day'],
  [/\b(per hour|hourly|\ban hour\b|\bph\b)/i, 'hour'],
]

/**
 * Infer the pay period. Falls back on magnitude, which is reliable in the UK:
 * nobody is paid £45,000 an hour and nobody is paid £12 a year.
 */
export function inferSalaryPeriod(text, amount = null) {
  for (const [pattern, period] of PERIOD_PATTERNS) {
    if (pattern.test(String(text || ''))) return period
  }
  if (amount != null && Number.isFinite(amount)) {
    if (amount >= 1000) return 'year'
    if (amount >= 400) return 'day'
    if (amount > 0) return 'hour'
  }
  return null
}

/**
 * Parse a free-text salary blob, e.g. "£30,000 - £35,000 per annum",
 * "Up to £45k", "£13.50 per hour".
 */
export function parseSalaryText(text) {
  const raw = String(text || '')
  if (!raw) return { min: null, max: null, currency: null, period: null }

  const currency = /£|\bgbp\b/i.test(raw) ? 'GBP'
    : /\$|\busd\b/i.test(raw) ? 'USD'
    : /€|\beur\b/i.test(raw) ? 'EUR'
    : null

  // Capture numbers, honouring a trailing "k" multiplier.
  const numbers = []
  const numberPattern = /(\d[\d,]*(?:\.\d+)?)\s*(k\b)?/gi
  let match
  while ((match = numberPattern.exec(raw)) !== null) {
    let value = parseFloat(match[1].replace(/,/g, ''))
    if (!Number.isFinite(value)) continue
    if (match[2]) value *= 1000
    // Skip years and other stray small integers when a k-suffix was absent.
    if (value >= 1900 && value <= 2100 && !match[2] && !/[£$€]/.test(raw.slice(Math.max(0, match.index - 2), match.index))) {
      continue
    }
    numbers.push(value)
  }

  if (numbers.length === 0) return { min: null, max: null, currency, period: inferSalaryPeriod(raw) }

  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  return {
    min,
    max: max === min ? null : max,
    currency,
    period: inferSalaryPeriod(raw, min),
  }
}

const UK_REGIONS = [
  'greater london', 'london', 'south east', 'south west', 'east of england',
  'east midlands', 'west midlands', 'yorkshire', 'north east', 'north west',
  'scotland', 'wales', 'northern ireland',
]

const REMOTE_PATTERN = /\b(remote|work from home|wfh|home[\s-]based|anywhere)\b/i

/**
 * Split a raw location blob into city/region and detect remote work.
 * Sources give us anything from "London" to "London, England, United Kingdom"
 * to "Remote (UK)".
 */
export function parseLocation(raw, { marketCode = 'gb' } = {}) {
  const text = String(raw || '').trim()
  const isRemote = REMOTE_PATTERN.test(text)

  const parts = text.split(/\s*[,|/]\s*/).map(p => p.trim()).filter(Boolean)
  const meaningful = parts.filter(
    p => !/^(united kingdom|uk|gb|england|great britain)$/i.test(p) && !REMOTE_PATTERN.test(p)
  )

  let city = meaningful[0] || null
  let region = null

  // Look for a region in the parts AFTER the first — the first part is the city.
  // London is both a city and a region, so a lone "London" stays the city.
  for (const part of meaningful.slice(1)) {
    if (UK_REGIONS.includes(part.toLowerCase())) {
      region = part
      break
    }
  }
  if (!region && meaningful.length > 1) region = meaningful[meaningful.length - 1]

  return {
    locationRaw: text || null,
    locationCity: city,
    locationRegion: region,
    countryCode: marketCode.toUpperCase(),
    isRemote,
  }
}

/** "Remote — anywhere" style qualifiers, which we treat as market-eligible. */
const UNRESTRICTED_REMOTE = /\b(global|worldwide|anywhere|international)\b/i

/**
 * Does this location belong to the given market?
 *
 * `matchers` are the regex sources from job_markets.location_matchers, and
 * `excluders` those from job_markets.location_excluders. Excluders win.
 *
 * ⚠️ WHY EXCLUDERS EXIST. City and region names are not unique across the
 * world, and the market patterns are necessarily loose — `\bwales\b` matches
 * "AUS-New South Wales-Asquith", and `\blondon\b` matches "CAN-Ontario-London".
 * That never showed while every source was a single-country startup ATS board.
 * It shows immediately on a global Workday or Oracle board, where a UK filter
 * silently admits Australian and Canadian roles. Excluders are checked FIRST so
 * an explicit "this is somewhere else" always beats a loose city match.
 *
 * Remote needs care too. A bare "Remote" or "Remote — Worldwide" is
 * market-eligible. But "Remote (US)" is not a UK job, and a global company's ATS
 * feed is full of them — so a remote listing that names some OTHER place must
 * still match a market pattern to count.
 */
export function matchesMarket(locationText, matchers = [], excluders = []) {
  const text = String(locationText || '')
  if (!text) return false

  const excluded = (excluders || []).some(source => {
    try {
      return new RegExp(source, 'i').test(text)
    } catch {
      return false   // a bad regex in config must not take the whole run down
    }
  })
  if (excluded) return false

  const hitsMarket = matchers.some(source => {
    try {
      return new RegExp(source, 'i').test(text)
    } catch {
      return false   // a bad regex in config must not take the whole run down
    }
  })
  if (hitsMarket) return true

  if (REMOTE_PATTERN.test(text)) {
    // Strip the remote words and see whether anything locational is left.
    const remainder = text
      .replace(REMOTE_PATTERN, ' ')
      .replace(UNRESTRICTED_REMOTE, ' ')
      .replace(/[^a-z]/gi, ' ')
      .trim()
    // Nothing left (or only filler) means unrestricted remote → eligible.
    return remainder.length === 0
  }

  return false
}

/** Best-effort date parse. Returns an ISO string or null — never an Invalid Date. */
export function toIsoDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
