/**
 * Avature adapter.
 *
 * Avature is the enterprise CRM-plus-ATS behind a long tail of large
 * employers' careers portals — Bloomberg is the one on our allowlist. The
 * portal is server-rendered HTML with no JSON API and no schema.org markup on
 * the advert pages (which is why the jsonld adapter cannot read it), but the
 * template is the same on every tenant, so one adapter covers all of them.
 *
 * Two pages matter, both plain GETs:
 *
 *   list    https://{host}/{portal}/SearchJobs/?jobRecordsPerPage=12&jobOffset=N
 *           One <article class="article--result"> per job with the title, the
 *           advert URL and — the important part — the LOCATION. Avature caps
 *           the page at 12 whatever jobRecordsPerPage asks for, so a 324-role
 *           board is 27 list requests. Cheap, and worth it: the location on
 *           the tile is the early market gate, and Bloomberg's board is ~5% UK.
 *   detail  https://{host}/{portal}/JobDetail/{slug}/{id}
 *           Label/value fields (Location, Business Area, Ref #) followed by the
 *           advert. The description is the largest `field__value` element on
 *           the page; nothing marks it as such, so "largest" is the rule.
 *
 * There is also an RSS feed (SearchJobs/feed/) with a pubDate per job, which
 * looked like the better list until it turned out to carry no location — every
 * item would then cost a detail fetch to find out it is in New York. The
 * sitemap has the same problem. So the list is HTML, and postedAt is unknown
 * until an advert is first seen (expiry anchors on first_seen in that case —
 * see computeExpiry() in ../lib/persist.js).
 *
 * job_source_accounts.params:
 *   { "host":"bloomberg.avature.net", "portal":"careers" }
 *
 * robots.txt on the Bloomberg tenant explicitly allows /careers and publishes
 * a sitemap for it; discovery checks the same on any new tenant before seeding.
 */

import {
  decodeEntities,
  htmlToText,
  buildSnippet,
  matchesMarket,
  parseLocation,
} from '../lib/normalise.js'
import { elementAt } from './jsonld.js'

// What the portal returns per page regardless of what is asked for.
const PAGE_SIZE = 12

// Below this the "largest field value" was a label or the title, not an advert.
const MIN_DESCRIPTION_CHARS = 200

/** The result tiles on a SearchJobs page. */
export function parseSearchPage(html) {
  const jobs = []
  for (const tile of String(html).match(/<article\b[^>]*article--result[^>]*>[\s\S]*?<\/article>/gi) || []) {
    const link = /<a\b[^>]*\bhref=["']([^"']*\/JobDetail\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(tile)
    if (!link) continue
    const location = /list-item-location["'][^>]*>([\s\S]*?)<\//i.exec(tile)?.[1]
    jobs.push({
      url: decodeEntities(link[1]).trim(),
      title: htmlToText(link[2]),
      location: location ? htmlToText(location) : '',
    })
  }
  const total = Number(/(\d[\d,]*)\s+results?\b/i.exec(String(html))?.[1]?.replace(/,/g, '') ?? 0)
  return { jobs, total }
}

/** "…/JobDetail/Product-Manager-Commodities/45224" → "45224" */
function jobIdFromUrl(url) {
  return /\/JobDetail\/[^/]+\/(\d+)/i.exec(String(url))?.[1] || null
}

/**
 * The advert body: the largest field__value element on the page. Returned as
 * raw HTML so the stored description keeps its paragraphs and lists.
 */
export function extractDescription(html) {
  const page = String(html)
  const marker = /<[a-z][a-z0-9]*\b[^>]*class=["'][^"']*article__content__view__field__value[^"']*["']/gi
  let best = ''
  let match
  while ((match = marker.exec(page))) {
    const element = elementAt(page, match.index)
    if (!element) continue
    if (element.inner.length > best.length) best = element.inner
    marker.lastIndex = Math.max(marker.lastIndex, element.end)
  }
  return best
}

export default {
  key: 'avature',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ market, account, page, http, limiter }) {
    const { host, portal = 'careers' } = account?.params || {}
    if (!host) {
      throw new Error(
        `avature board "${account?.account}" has no host in params — ` +
        'run scripts/discover-job-boards.mjs to generate it'
      )
    }

    const offset = (page - 1) * PAGE_SIZE
    await limiter.wait()
    const { data } = await http.get(`https://${host}/${portal}/SearchJobs/`, {
      params: { jobRecordsPerPage: PAGE_SIZE, jobOffset: offset },
      timeout: 30_000,
      responseType: 'text',
    })

    const { jobs, total } = parseSearchPage(data)
    // Every tile is returned, in-market or not: the orchestrator stops paging
    // the moment a page yields no items, and on a board that is ~5% UK most
    // pages yield none. The market gate is in normalise() instead, which the
    // orchestrator applies per item before anything can cost a detail fetch.
    return {
      items: jobs,
      hasMore: jobs.length > 0 && offset + jobs.length < total,
      apiCalls: 1,
    }
  },

  normalise(item, { market, account }) {
    const id = jobIdFromUrl(item?.url)
    if (!id || !item?.title) return null
    // The early market gate. Deliberately before hydrate() rather than left to
    // the cascade's wrong_market step, because hydrate runs first and gates on
    // title and age only — a New York product manager would otherwise cost a
    // detail fetch to be dropped afterwards.
    if (!matchesMarket(item.location, market.location_matchers, market.location_excluders)) return null

    return {
      sourceJobId: `${account.account}:${id}`,
      title: item.title,
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: '',
      isSnippet: false,
      needsDetail: true,
      ...parseLocation(item.location, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: null,
      contractTime: null,
      // Not on the tile and not on the advert page. Unknown rather than guessed.
      postedAt: null,
      applyUrlRaw: item.url,
      sourceCategory: '',
      nativeSeniority: null,
      flags: {},
      descriptionSnippet: '',
      detailUrl: item.url,
    }
  },

  async hydrateOne(raw, { http, limiter }) {
    if (!raw.detailUrl) return null

    await limiter.wait()
    const { data } = await http.get(raw.detailUrl, { timeout: 30_000, responseType: 'text' })
    const html = extractDescription(data)
    const text = htmlToText(html)
    // A closed advert renders the template with no body; dropping is right.
    if (text.length < MIN_DESCRIPTION_CHARS) return null

    return {
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
    }
  },
}
