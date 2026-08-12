/**
 * schema.org JobPosting adapter.
 *
 * The generic one. Google for Jobs made a standard out of publishing a
 * `JobPosting` on every advert page, so a large number of career sites that
 * share no ATS at all share this format, and any company whose careers site
 * emits it becomes a config row rather than another adapter.
 *
 * It is also the most durable adapter here for exactly that reason: the shape
 * is a published standard rather than a vendor's undocumented internals.
 *
 * TWO SERIALISATIONS, both read here. JSON-LD in a <script> block is the common
 * one (British Airways). MICRODATA — `itemtype="…/JobPosting"` with `itemprop`
 * attributes sprinkled through the markup — is what SAP SuccessFactors RMK
 * emits, which is BBC, BT and EY. Same vocabulary, same fields, different
 * spelling; extractJobPosting() tries LD first and falls back to microdata, so
 * everything downstream sees one shape.
 *
 * job_source_accounts.params:
 *   { "sitemapUrl":"https://careers.ba.com/sitemap.xml",
 *     "jobUrlPattern":"/job/",              // substring or regex source
 *     "locationPattern":"/job/([^/-]+)-" }  // OPTIONAL, see below
 *
 * TWO-PHASE, and the most extreme case of it: the "list" is a sitemap, so a
 * work item starts as nothing but a URL. Three consequences worth understanding:
 *
 *   - The pre-hydration title is DERIVED FROM THE URL SLUG. That is enough for
 *     isBlockedTitle() and couldMapProfession() to throw out most of a board
 *     before it costs a request, which is the whole point; the real title comes
 *     from the posting at hydration and overwrites it.
 *   - The pre-hydration date comes from the sitemap's <lastmod>, which is when
 *     the page changed rather than when the job was posted. It is used only for
 *     the cheap age gate and is replaced by the posting's `datePosted`. Where a
 *     sitemap omits it the age gate simply does not fire early, which costs
 *     requests but drops nothing.
 *   - `locationPattern` is the market gate moved EARLIER, and it is the reason a
 *     board like EY is affordable at all. Its sitemap is 7,414 adverts, of which
 *     315 are UK; without this the run would spend its whole detail budget
 *     (MAX_DETAIL_FETCHES_PER_RUN in ../index.js) fetching Suriname and Doha
 *     roles only for the cascade to drop them as wrong_market afterwards. When
 *     the param is set, entries whose derived location fails matchesMarket() are
 *     dropped from the list itself. It is opt-in per board because it is only
 *     sound where the slug really does carry the location — see the WATCH OUT
 *     on locationFromUrl().
 *
 * Fetching public advert pages is what the sitemap exists to invite, but
 * robots.txt is still checked at discovery time (see lib/discover.js) and only
 * boards whose job paths are allowed get seeded.
 */

import {
  decodeEntities,
  htmlToText,
  buildSnippet,
  matchesMarket,
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

/**
 * Location out of a job URL, for boards whose advert pages do not publish
 * `jobLocation`. `pattern` comes from params.locationPattern and its first
 * capture group is the location.
 *
 * SAP SuccessFactors RMK builds its slugs as {City}-{Title}-{Postcode}, so
 * `/job/London-Senior-Product-Manager-W1A-1AA/` yields "London".
 *
 * ⚠️ WATCH OUT: the city prefix is a per-tenant display setting, not a
 * guarantee. BT publishes "Ipswich-Software-Engineer-…" and
 * "Customer-Solution-Design-Specialist-…" on the same board, and the second
 * yields "Customer". That is a false NEGATIVE — a UK job that gets dropped as
 * wrong_market — and never a false positive, because "Customer" matches no
 * market pattern. Losing some of a board we could not read at all before is an
 * acceptable trade; silently admitting non-UK adverts would not be.
 */
export function locationFromUrl(url, pattern) {
  if (!pattern) return ''
  let matcher
  try {
    matcher = new RegExp(pattern, 'i')
  } catch {
    return ''
  }
  const captured = matcher.exec(String(url))?.[1]
  if (!captured) return ''
  return decodeURIComponent(captured).replace(/[-+_]+/g, ' ').trim()
}

/* -------------------------------------------------------------------------- */
/* microdata                                                                   */
/* -------------------------------------------------------------------------- */

// Elements that never have a closing tag, so never have inner content.
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * The element whose opening tag begins at `start`, with its inner HTML.
 *
 * Deliberately a scanner rather than an HTML parser dependency, matching
 * htmlToText() in ../lib/normalise.js: nesting depth is the only thing that
 * matters here and career-site markup is well-formed enough for it.
 */
function elementAt(html, start) {
  const open = /^<([a-z][a-z0-9]*)\b[^>]*?(\/?)>/i.exec(html.slice(start))
  if (!open) return null

  const name = open[1].toLowerCase()
  const contentStart = start + open[0].length
  if (open[2] === '/' || VOID_ELEMENTS.has(name)) {
    return { name, tag: open[0], inner: '', end: contentStart }
  }

  const tag = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, 'gi')
  tag.lastIndex = contentStart
  let depth = 1
  let match
  while ((match = tag.exec(html))) {
    if (match[1] === '/') depth -= 1
    else if (match[2] !== '/') depth += 1
    if (depth === 0) return { name, tag: open[0], inner: html.slice(contentStart, match.index), end: tag.lastIndex }
  }
  // Unclosed. Take the remainder rather than losing the whole advert.
  return { name, tag: open[0], inner: html.slice(contentStart), end: html.length }
}

/** Every element carrying `itemprop="name"`, in document order. */
function propElements(scope, name) {
  const marker = new RegExp(`<[a-z][a-z0-9]*\\b[^>]*itemprop=["']${name}["']`, 'gi')
  const found = []
  let match
  while ((match = marker.exec(scope))) {
    const element = elementAt(scope, match.index)
    if (element) {
      found.push(element)
      // Skip past it, so an itemprop nested inside this one is not read twice.
      marker.lastIndex = Math.max(marker.lastIndex, element.end)
    }
  }
  return found
}

/** The first element carrying `itemprop="name"`, or null. */
function propElement(scope, name) {
  return propElements(scope, name)[0] || null
}

/**
 * A microdata property's value. `<meta itemprop=… content=…>` carries it in the
 * attribute; every other element carries it as its content.
 */
function readProp(scope, name) {
  const element = propElement(scope, name)
  if (!element) return null
  if (element.name === 'meta') {
    const content = /\bcontent=["']([^"']*)["']/i.exec(element.tag)?.[1]
    return content ? decodeEntities(content).trim() : null
  }
  return htmlToText(element.inner) || null
}

/** A nested itemscope's inner markup, so its own itemprops can be read. */
function readScope(scope, name) {
  return propElement(scope, name)?.inner || null
}

/**
 * Read a JobPosting published as MICRODATA into the same object shape the
 * JSON-LD path produces, so hydrateOne() does not care which one a page used.
 *
 * ⚠️ PROPERTIES ARE READ FROM THE WHOLE PAGE, not from inside the element that
 * declares the JobPosting. That looks wrong and is deliberate: SuccessFactors
 * renders each careers-page module independently and does not keep them inside
 * one itemscope. On the BBC's board `itemprop="title"` sits ~230 bytes BEFORE
 * the `jobDisplayShell` that opens the JobPosting, so scoping to the shell finds
 * a description and no title and drops every advert on the board. The shell is
 * therefore used only to establish that this page IS a job advert.
 *
 * Safe because these pages carry exactly one JobPosting and no other itemscope
 * competing for the same property names — worth re-checking before pointing
 * this at a vendor other than SuccessFactors.
 */
export function extractJobPostingMicrodata(html) {
  const scope = String(html)
  if (!/<[a-z][a-z0-9]*\b[^>]*itemtype=["']https?:\/\/schema\.org\/JobPosting["']/i.test(scope)) {
    return null
  }

  const title = readProp(scope, 'title')
  // Taken as RAW HTML — hydrateOne() stores the markup and derives the text.
  //
  // The LONGEST rather than the first: BT publishes two description properties,
  // a one-line hybrid-working preamble followed by the actual advert, and the
  // first is 218 characters of nothing useful.
  const description = propElements(scope, 'description')
    .map(e => e.inner)
    .sort((a, b) => b.length - a.length)[0]
  if (!title || !description) return null

  // jobLocation → Place → address → PostalAddress. Some tenants skip the Place
  // wrapper, so fall back to reading the address parts off jobLocation itself.
  const place = readScope(scope, 'jobLocation')
  const address = place ? readScope(place, 'address') || place : null

  return {
    '@type': 'JobPosting',
    title,
    description,
    datePosted: readProp(scope, 'datePosted'),
    validThrough: readProp(scope, 'validThrough'),
    employmentType: readProp(scope, 'employmentType'),
    industry: readProp(scope, 'industry'),
    occupationalCategory: readProp(scope, 'occupationalCategory'),
    jobLocation: address
      ? {
          address: {
            streetAddress: readProp(address, 'streetAddress'),
            addressLocality: readProp(address, 'addressLocality'),
            addressRegion: readProp(address, 'addressRegion'),
            addressCountry: readProp(address, 'addressCountry'),
          },
        }
      : null,
  }
}

/**
 * The page's JobPosting, however it chose to publish one. JSON-LD first because
 * it is unambiguous; microdata only if there is no LD block to read.
 */
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

  return extractJobPostingMicrodata(html)
}

/** schema.org jobLocation → a flat string parseLocation understands. */
function locationText(jobLocation) {
  const places = Array.isArray(jobLocation) ? jobLocation : [jobLocation].filter(Boolean)
  return places
    .map(place => {
      const a = place?.address || {}
      const parts = [a.addressLocality, a.addressRegion, a.addressCountry?.name || a.addressCountry]
        .filter(Boolean)
      // Only as a fallback. SuccessFactors puts the whole thing in streetAddress
      // ("Kingston 8, JM") and leaves the rest empty; boards that populate the
      // structured fields must not have a street number prepended to their city.
      if (!parts.length && a.streetAddress) parts.push(a.streetAddress)
      return parts.join(', ')
    })
    .filter(Boolean)
    .join('; ')
}

export default {
  key: 'jsonld',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ market, account, page, http, limiter }) {
    const { sitemapUrl, jobUrlPattern, locationPattern } = account?.params || {}
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

    const jobs = parseSitemap(data)
      .filter(e => !matches || matches.test(e.url))
      .map(e => ({ ...e, location: locationFromUrl(e.url, locationPattern) }))
      // The market gate, early. Only for boards that opted in with
      // locationPattern — without one every location is '' and this would
      // empty the board.
      .filter(e => !locationPattern || matchesMarket(
        e.location, market.location_matchers, market.location_excluders
      ))

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
      // '' unless the board set locationPattern, in which case this is what the
      // early market gate above already accepted. Hydration replaces it only if
      // the advert publishes a location of its own.
      ...parseLocation(item.location || null, { marketCode: market.code }),
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
    // No posting at all means the page moved or the job closed — dropping is right.
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

    // BBC and BT publish a JobPosting with no jobLocation on it at all. Their
    // location came from the URL slug at normalise() and is the only one there
    // is, so an empty read here must leave it alone rather than blank it.
    const located = locationText(posting.jobLocation)

    return {
      title: String(posting.title).trim(),
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
      ...(located ? parseLocation(located, { marketCode: market.code }) : {}),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: salary.period,
      postedAt: toIsoDate(posting.datePosted) || raw.postedAt,
      contractType: posting.employmentType || null,
      sourceCategory: posting.industry || posting.occupationalCategory || '',
      // persist.js reads this as `isRemoteOverride ?? isRemote`, so an explicit
      // false would beat a location that plainly says "Remote". Most adverts —
      // every microdata one seen — omit jobLocationType entirely, so only
      // assert when the page actually declares it.
      ...(posting.jobLocationType
        ? { isRemoteOverride: posting.jobLocationType === 'TELECOMMUTE' }
        : {}),
      applyUrlRaw: posting.url || raw.applyUrlRaw,
    }
  },
}
