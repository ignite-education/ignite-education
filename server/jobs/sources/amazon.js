/**
 * Amazon Jobs adapter (the JSON endpoint amazon.jobs' own search page calls).
 *
 * Public, unauthenticated, full descriptions inline — so single-phase, no
 * hydrateOne. robots.txt on www.amazon.jobs disallows only /internal; the
 * search path is explicitly permitted.
 *
 * Endpoint: GET https://www.amazon.jobs/en/search.json
 *
 * Amazon runs a bespoke in-house ATS rather than a vendor product, which is why
 * discovery cannot find this board on its own: the careers page is a JS-rendered
 * SPA with zero job links in its HTML, there is no /sitemap.xml, and there is no
 * vendor marker to fingerprint. Hence a hand-written adapter and a hardcoded
 * account row rather than anything discovery produced.
 *
 * job_source_accounts.params:
 *   { "countryCode": "GBR" }        // optional; defaults to the market's own
 *
 * ⚠️ FOUR THINGS THAT WILL BITE
 *
 * 1. `country[]=GBR` IS SILENTLY IGNORED. It is the parameter the website puts
 *    in its own address bar, and it does nothing — that query returns 10,000
 *    hits of mostly Bengaluru and Seattle roles. The one that filters is
 *    `normalized_country_code[]`. Verified: 818 hits, all GBR.
 *
 * 2. result_limit CAPS AT 100. Asking for 200 returns an empty jobs array and
 *    `hits: 0`, which looks exactly like an employer with no vacancies.
 *
 * 3. `company_name` IS THE LEGAL ENTITY, not the brand — "Amazon Development
 *    Centre (Scotland) Limited", "ADCI - Karnataka - A66". Using it would fail
 *    the allowlist gate on every single row. The company comes from the account,
 *    as it does in every other adapter here.
 *
 * 4. `sort=recent` IS ONLY APPROXIMATELY ORDERED (a page runs Aug 7, Aug 8,
 *    Aug 7, Aug 6…). Do not use it to stop paging early the way oracleOrc.js
 *    does — max_pages has to cover the whole filtered board.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

// Amazon's own ceiling. See trap 2 above.
const PAGE_SIZE = 100

/**
 * Market code → the `normalized_country_code` Amazon expects (ISO 3166-1
 * alpha-3, where job_markets.code is alpha-2).
 *
 * Explicit rather than computed because there is no rule that turns "gb" into
 * "GBR" — alpha-2 to alpha-3 is a lookup table, not a transformation.
 */
const COUNTRY_CODES = {
  gb: 'GBR',
  us: 'USA',
  ie: 'IRL',
  de: 'DEU',
  fr: 'FRA',
  es: 'ESP',
  it: 'ITA',
  nl: 'NLD',
  pl: 'POL',
  ca: 'CAN',
  au: 'AUS',
}

/**
 * The description, plus the two qualification blocks Amazon keeps separate.
 *
 * Worth joining rather than taking `description` alone: the profession
 * classifier scores keywords out of the body text, and on an Amazon advert the
 * evidence that a role is technical ("SQL", "roadmap", "machine learning")
 * overwhelmingly sits in basic_qualifications, not the description.
 */
function fullDescription(item) {
  return [
    item.description,
    item.basic_qualifications && `<h3>Basic qualifications</h3>${item.basic_qualifications}`,
    item.preferred_qualifications && `<h3>Preferred qualifications</h3>${item.preferred_qualifications}`,
  ].filter(Boolean).join('\n')
}

export default {
  key: 'amazon',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ market, account, page, http, limiter }) {
    const country = account.params?.countryCode || COUNTRY_CODES[market.code]
    if (!country) {
      throw new Error(
        `amazon: no country code for market "${market.code}" — add one to ` +
        'COUNTRY_CODES in sources/amazon.js or set params.countryCode on the board'
      )
    }

    // Built by hand because the filter is a repeated bracketed key
    // (`normalized_country_code[]`), and axios `params` would encode the
    // brackets into `%5B%5D`, which the endpoint does not recognise.
    const query = [
      `normalized_country_code%5B%5D=${encodeURIComponent(country)}`,
      `result_limit=${PAGE_SIZE}`,
      `offset=${(page - 1) * PAGE_SIZE}`,
      'sort=recent',
    ].join('&')

    await limiter.wait()
    const { data } = await http.get(
      `https://www.amazon.jobs/en/search.json?${query}`,
      { headers: { Accept: 'application/json' }, timeout: 30_000 }
    )

    const items = data?.jobs || []
    // `hits` is reported consistently on every page here (unlike Workday, where
    // it is only populated on the first), so it is usable — but a full page is
    // the cheaper and equally correct signal.
    return { items, hasMore: items.length === PAGE_SIZE, apiCalls: 1 }
  },

  normalise(item, { market, account }) {
    if (!item?.title || !(item.id_icims || item.id)) return null

    const html = fullDescription(item)
    const text = htmlToText(html)

    return {
      // id_icims is the numeric requisition and the id that appears in
      // job_path, so a listing's id always matches its own apply URL. `id` is a
      // UUID that serves the same purpose; it is the fallback, not the default,
      // because it cannot be read off the advert.
      sourceJobId: String(item.id_icims || item.id),
      title: String(item.title).trim(),
      // NOT item.company_name — see trap 3.
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: html,
      descriptionText: text,
      isSnippet: false,
      // "Edinburgh, Scotland, GBR" — city and region both parse, and the
      // alpha-3 suffix is inert against the GB matchers.
      ...parseLocation(item.normalized_location || item.location, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: null,
      contractTime: item.job_schedule_type || null,
      // "August  7, 2026" — note the double space, which Date.parse handles.
      postedAt: toIsoDate(item.posted_date),
      applyUrlRaw: item.job_path ? `https://www.amazon.jobs${item.job_path}` : null,
      sourceCategory: [item.job_category, item.job_family].filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      descriptionSnippet: buildSnippet(text),
    }
  },
}
