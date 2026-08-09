/**
 * schema.org JobPosting adapter.
 *
 * The generic one. Google for Jobs made a standard out of embedding a
 * `JobPosting` JSON-LD block in every advert page, so a large number of career
 * sites that share no ATS at all share this format — British Airways (Radancy)
 * is the one on our allowlist today, and any future company whose careers site
 * emits it becomes a config row rather than another adapter.
 *
 * It is also the most durable adapter here for exactly that reason: the shape
 * is a published standard rather than a vendor's undocumented internals.
 *
 * job_source_accounts.params:
 *   { "sitemapUrl":"https://careers.ba.com/sitemap.xml",
 *     "jobUrlPattern":"/job/" }             // substring or regex source
 *
 * TWO-PHASE, and the most extreme case of it: the "list" is a sitemap, so a
 * work item starts as nothing but a URL. Two consequences worth understanding:
 *
 *   - The pre-hydration title is DERIVED FROM THE URL SLUG. That is enough for
 *     isBlockedTitle() and couldMapProfession() to throw out most of a board
 *     before it costs a request, which is the whole point; the real title comes
 *     from the LD at hydration and overwrites it.
 *   - The pre-hydration date comes from the sitemap's <lastmod>, which is when
 *     the page changed rather than when the job was posted. It is used only for
 *     the cheap age gate and is replaced by the LD's `datePosted`. Where a
 *     sitemap omits it the age gate simply does not fire early, which costs
 *     requests but drops nothing.
 *
 * Fetching public advert pages is what the sitemap exists to invite, but
 * robots.txt is still checked at discovery time (see lib/discover.js) and only
 * boards whose job paths are allowed get seeded.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  parseSalaryText,
  toIsoDate,
} from '../lib/normalise.js'

// A sitemap is one request for the whole board, so paging here slices a list we
// already hold rather than making more requests.
const PAGE_SIZE = 100

/** Extract <loc>/<lastmod> pairs without taking on an XML parser. */
function parseSitemap(xml) {
  const entries = []
  for (const block of String(xml).match(/<url>[\s\S]*?<\/url>/g) || []) {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1]
    if (!loc) continue
    entries.push({ url: loc, lastmod: block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1] || null })
  }
  return entries
}

/**
 * "…/job/heathrow/resource-delivery-executive/22348/98887365376"
 *   → "resource delivery executive"
 *
 * Picks the longest hyphenated path segment, which on every sitemap format seen
 * is the title slug — the others are ids, locations or the literal "job".
 */
export function titleFromUrl(url) {
  const segments = String(url).split('?')[0].split('#')[0].split('/').filter(Boolean)
  const best = segments
    .filter(s => /[a-z]/i.test(s) && s.includes('-'))
    .sort((a, b) => b.length - a.length)[0]
  if (!best) return ''
  return best.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Pull every JobPosting object out of a page's LD blocks, @graph included. */
export function extractJobPosting(html) {
  const blocks = String(html).match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  ) || []

  for (const block of blocks) {
    const json = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '')
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch {
      continue   // one malformed block must not hide a valid one later on the page
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])]
    const posting = candidates.find(c => c && c['@type'] === 'JobPosting')
    if (posting) return posting
  }
  return null
}

/** schema.org jobLocation → a flat string parseLocation understands. */
function locationText(jobLocation) {
  const places = Array.isArray(jobLocation) ? jobLocation : [jobLocation].filter(Boolean)
  return places
    .map(place => {
      const a = place?.address || {}
      return [a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry]
        .filter(Boolean)
        .join(', ')
    })
    .filter(Boolean)
    .join('; ')
}

export default {
  key: 'jsonld',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    const { sitemapUrl, jobUrlPattern } = account?.params || {}
    if (!sitemapUrl) {
      throw new Error(
        `jsonld board "${account?.account}" has no sitemapUrl in params — ` +
        'run scripts/discover-job-boards.mjs to generate it'
      )
    }

    // Only page 1 costs a request; later pages slice the cached list. The
    // sitemap is re-read per page rather than cached across the run because a
    // board rarely needs more than one page and adapters hold no state.
    await limiter.wait()
    const { data } = await http.get(sitemapUrl, { timeout: 30_000, responseType: 'text' })

    let matches
    try {
      matches = jobUrlPattern ? new RegExp(jobUrlPattern, 'i') : null
    } catch {
      throw new Error(`jsonld board "${account.account}": jobUrlPattern is not a valid regex`)
    }

    const jobs = parseSitemap(data).filter(e => !matches || matches.test(e.url))
    const start = (page - 1) * PAGE_SIZE
    return {
      items: jobs.slice(start, start + PAGE_SIZE),
      hasMore: start + PAGE_SIZE < jobs.length,
      apiCalls: 1,
    }
  },

  normalise(item, { market, account }) {
    if (!item?.url) return null
    const title = titleFromUrl(item.url)
    if (!title) return null

    return {
      // The URL is the only stable identifier a sitemap gives us. Namespaced by
      // board like every other multi-tenant source.
      sourceJobId: `${account.account}:${item.url}`,
      // Provisional. Replaced by the LD's own title at hydration; here only so
      // the title gates can run before we pay for the page.
      title,
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: '',
      isSnippet: false,
      needsDetail: true,
      ...parseLocation(null, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: null,
      contractTime: null,
      // Page-changed, not job-posted. Good enough to drop a year-old advert
      // before fetching it; overwritten by datePosted at hydration.
      postedAt: toIsoDate(item.lastmod),
      applyUrlRaw: item.url,
      sourceCategory: '',
      nativeSeniority: null,
      flags: {},
      descriptionSnippet: '',
      detailUrl: item.url,
    }
  },

  async hydrateOne(raw, { market, http, limiter }) {
    if (!raw.detailUrl) return null

    await limiter.wait()
    const { data } = await http.get(raw.detailUrl, { timeout: 30_000, responseType: 'text' })
    const posting = extractJobPosting(data)
    // No LD block means the page moved or the job closed — dropping is right.
    if (!posting?.title || !posting?.description) return null

    const html = posting.description
    const text = htmlToText(html)

    // baseSalary is frequently present but empty ({currency:"", value:{}}),
    // which parses to nothing rather than to a misleading zero.
    const amount = posting.baseSalary?.value
    const salary = parseSalaryText(
      [posting.baseSalary?.currency, amount?.value ?? amount?.minValue, amount?.maxValue, amount?.unitText]
        .filter(Boolean)
        .join(' ')
    )

    return {
      title: String(posting.title).trim(),
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
      ...parseLocation(locationText(posting.jobLocation), { marketCode: market.code }),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: salary.period,
      postedAt: toIsoDate(posting.datePosted) || raw.postedAt,
      contractType: posting.employmentType || null,
      sourceCategory: posting.industry || posting.occupationalCategory || '',
      isRemoteOverride: posting.jobLocationType === 'TELECOMMUTE',
      applyUrlRaw: posting.url || raw.applyUrlRaw,
    }
  },
}
