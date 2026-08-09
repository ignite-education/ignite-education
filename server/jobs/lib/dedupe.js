/**
 * Deduplication.
 *
 * The same vacancy reaches us through several sources: a company's Greenhouse
 * board, Adzuna's index of it, Reed's, and often two agencies reposting it.
 *
 * Cheapest checks first:
 *   1. UNIQUE(source, source_job_id)  — handled in persist.js, free
 *   2. canonical URL hash             — highest signal, one HTTP request per NEW job
 *   3. block key + fuzzy title        — catches reposts that never share a URL
 *
 * Descriptions are deliberately NEVER compared. Agencies rewrite copy heavily;
 * genuine duplicate adverts have been measured sharing as little as 37% of their
 * text, so description similarity produces both false positives and negatives.
 */

import crypto from 'crypto'
import { normaliseCompany, slugify } from './normalise.js'

const TRACKING_PARAMS = [
  /^utm_/i, /^gclid$/i, /^fbclid$/i, /^msclkid$/i, /^mc_/i,
  /^src$/i, /^source$/i, /^ref$/i, /^referrer$/i, /^campaign$/i,
  /^trk$/i, /^recruiter$/i, /^lever-origin$/i, /^gh_src$/i,
]

/** Seniority and noise words removed before building a block key. */
const TITLE_STOPWORDS =
  /\b(senior|snr|sr|junior|jnr|jr|lead|principal|staff|graduate|trainee|apprentice|intern|entry|level|i{1,3}|iv|remote|hybrid|onsite|full|part|time|permanent|contract|ftc|uk|london)\b/g

/**
 * Canonicalise a URL for comparison: drop tracking params, sort the rest,
 * lowercase the host, strip `www.` and any trailing slash.
 */
export function canonicaliseUrl(rawUrl) {
  if (!rawUrl) return null
  try {
    const url = new URL(rawUrl)
    url.hash = ''
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    url.protocol = 'https:'

    const keep = [...url.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAMS.some(p => p.test(key)))
      .sort(([a], [b]) => a.localeCompare(b))

    url.search = ''
    for (const [key, value] of keep) url.searchParams.append(key, value)

    let out = url.toString()
    if (out.endsWith('/')) out = out.slice(0, -1)
    return out
  } catch {
    return null
  }
}

export function hashUrl(url) {
  if (!url) return null
  return crypto.createHash('sha256').update(url).digest('hex')
}

/**
 * Follow redirects to the terminal employer/ATS URL.
 *
 * Aggregators wrap listings in their own redirect, so two records that look
 * unrelated often resolve to the same greenhouse.io/lever.co page. This is the
 * single highest-signal dedupe step.
 *
 * Uses GET with `Range: bytes=0-0` rather than HEAD — several job boards reject
 * or mishandle HEAD. Failure is never fatal: we fall back to the raw URL.
 */
export async function resolveCanonicalUrl(rawUrl, { http, timeout = 5000, maxRedirects = 5 } = {}) {
  const fallback = canonicaliseUrl(rawUrl)
  if (!rawUrl || !http) return fallback

  try {
    const response = await http.get(rawUrl, {
      timeout,
      maxRedirects,
      headers: { Range: 'bytes=0-0' },
      validateStatus: status => status < 500,
    })
    const finalUrl =
      response?.request?.res?.responseUrl ||
      response?.request?.responseURL ||
      rawUrl
    return canonicaliseUrl(finalUrl) || fallback
  } catch {
    return fallback
  }
}

/**
 * A coarse grouping key. Two adverts for the same role at the same company in
 * the same market land in the same block; fuzzy title matching then runs only
 * within a block, which keeps comparison O(block) rather than O(n²).
 */
export function buildBlockKey({ company, title, market }) {
  const companyKey = normaliseCompany(company)
  const titleKey = slugify(String(title || '').toLowerCase().replace(TITLE_STOPWORDS, ' '))
    .split('-')
    .filter(Boolean)
    .sort()
    .join('-')
  return `${companyKey}|${market}|${titleKey}`
}

/**
 * Fingerprint used to remember a rejection so the same role cannot come back
 * under a fresh source id.
 *
 * MUST stay in step with the md5 expression in the job_listings_on_review
 * trigger (migrations/create_job_board_tables.sql).
 */
export function rejectionFingerprint({ companyNorm, market, title }) {
  return crypto
    .createHash('md5')
    .update(`${companyNorm}|${market}|${slugify(title)}`)
    .digest('hex')
}

/** Dice coefficient over character bigrams. Cheap, and good on short strings. */
export function titleSimilarity(a, b) {
  const bigrams = str => {
    const s = String(str || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const out = new Map()
    for (let i = 0; i < s.length - 1; i++) {
      const gram = s.slice(i, i + 2)
      out.set(gram, (out.get(gram) || 0) + 1)
    }
    return out
  }

  const left = bigrams(a)
  const right = bigrams(b)
  if (left.size === 0 || right.size === 0) return 0

  let shared = 0
  for (const [gram, count] of left) {
    shared += Math.min(count, right.get(gram) || 0)
  }

  const total = [...left.values()].reduce((s, n) => s + n, 0) +
                [...right.values()].reduce((s, n) => s + n, 0)
  return (2 * shared) / total
}

export const TITLE_MATCH_THRESHOLD = 0.85
export const DUPLICATE_WINDOW_DAYS = 21

/**
 * Which of two records should be the visible one?
 *
 * ATS wins: full descriptions, direct employers, and — usefully — no mandatory
 * attribution badge, so preferring ATS also shrinks our compliance surface.
 * Ties break on description length.
 */
export const SOURCE_PRIORITY = {
  greenhouse: 100,
  lever: 100,
  ashby: 100,
  workable: 100,
  reed: 60,
  adzuna: 50,
  himalayas: 40,
}

export function electCanonical(a, b) {
  const priorityA = SOURCE_PRIORITY[a.source] ?? 0
  const priorityB = SOURCE_PRIORITY[b.source] ?? 0
  if (priorityA !== priorityB) return priorityA > priorityB ? a : b

  const lengthA = (a.description_text || '').length
  const lengthB = (b.description_text || '').length
  return lengthA >= lengthB ? a : b
}

/**
 * Find an existing listing that is the same job as `candidate`.
 *
 * @param {object} candidate  {title, company, companyNorm, market, canonicalUrlHash, blockKey, postedAt}
 * @param {object} supabase   service-role client
 * @returns {Promise<object|null>}
 */
export async function findDuplicate(candidate, supabase) {
  // 1. Same resolved destination — near-certain.
  if (candidate.canonicalUrlHash) {
    const { data } = await supabase
      .from('job_listings')
      .select('id, source, status, description_text, canonical_group_id')
      .eq('canonical_url_hash', candidate.canonicalUrlHash)
      .limit(1)
    if (data?.length) return data[0]
  }

  // 2. Same company + market + title tokens, within a recent window. Beyond
  //    that a match is a genuine repost, not a duplicate.
  if (!candidate.blockKey) return null

  const since = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('job_listings')
    .select('id, source, status, title, description_text, canonical_group_id')
    .eq('block_key', candidate.blockKey)
    .gte('first_seen_at', since)
    .limit(25)

  if (!data?.length) return null

  for (const row of data) {
    if (titleSimilarity(candidate.title, row.title) >= TITLE_MATCH_THRESHOLD) return row
  }
  return null
}
