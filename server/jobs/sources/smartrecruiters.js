/**
 * SmartRecruiters adapter (the public Posting API).
 *
 * Public, unauthenticated, documented by the vendor, and used by a long tail of
 * large European employers that none of the startup ATSs reach. It was the
 * highest-value entry in the `VENDORS` fingerprint table in ../lib/discover.js
 * with no adapter behind it — discovery has always detected SmartRecruiters
 * careers sites and then reported a dead end.
 *
 * Endpoints, both keyed on the company identifier in the careers URL
 * (jobs.smartrecruiters.com/<identifier>):
 *   list   GET https://api.smartrecruiters.com/v1/companies/{id}/postings
 *              ?limit=100&offset=&country=gb
 *   detail GET https://api.smartrecruiters.com/v1/companies/{id}/postings/{postingId}
 *
 * job_source_accounts.params: none needed — `account` IS the company identifier.
 *
 * TWO-PHASE. The list is unusually rich (location, industry, function,
 * employment type, experience level, released date) but carries no advert text
 * at all; that lives in `jobAd.sections` on the detail record.
 *
 * ⚠️ THE COUNTRY FILTER IS A LOWERCASE ALPHA-2 CODE AND FAILS SILENTLY.
 * `country=gb` returns the UK board. `country=uk`, `country=GB` and
 * `country=United Kingdom` all return `totalFound: 0` with HTTP 200 — which
 * reads exactly like an employer with no UK vacancies rather than a bad
 * parameter. Same class of trap as Amazon's `country[]=GBR`. The value comes
 * from job_markets.source_params.smartrecruiters.country, falling back to the
 * market code, which is already the lowercase alpha-2 this API wants.
 *
 * Filtering by country in the request rather than in the cascade is what keeps
 * this affordable: Bosch publishes 4,783 postings worldwide and 33 in the UK,
 * and every one not filtered out here would cost a detail fetch to reject.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

// The API's own maximum; a larger value is rejected rather than clamped.
const PAGE_SIZE = 100
const API = 'https://api.smartrecruiters.com/v1/companies'

export default {
  key: 'smartrecruiters',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ market, account, page, http, limiter }) {
    const country = market?.source_params?.smartrecruiters?.country || market.code

    await limiter.wait()
    const { data } = await http.get(
      `${API}/${encodeURIComponent(account.account)}/postings`,
      {
        params: { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, country },
        headers: { Accept: 'application/json' },
        timeout: 30_000,
      }
    )

    const items = data?.content || []
    const total = Number(data?.totalFound ?? 0)
    return {
      items,
      hasMore: (page - 1) * PAGE_SIZE + items.length < total,
      apiCalls: 1,
    }
  },

  normalise(item, { market, account }) {
    if (!item?.id || !item?.name) return null

    const location = item.location || {}
    // fullLocation is already "Birmingham, West Midlands, United Kingdom" where
    // the API has it; the parts are the fallback for postings that omit it.
    const locationName =
      location.fullLocation ||
      [location.city, location.region, location.country].filter(Boolean).join(', ')

    return {
      sourceJobId: `${account.account}:${item.id}`,
      title: String(item.name).trim(),
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: '',
      isSnippet: false,
      needsDetail: true,
      ...parseLocation(locationName, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: item.typeOfEmployment?.label || null,
      contractTime: null,
      postedAt: toIsoDate(item.releasedDate),
      // postingUrl is the advert; applyUrl is the same page with ?oga=true. The
      // advert is what a candidate should land on.
      applyUrlRaw: item.postingUrl || item.applyUrl || null,
      sourceCategory: [item.department?.label, item.function?.label, item.industry?.label]
        .filter(Boolean).join(', '),
      // "Entry Level" / "Internship" / "Director" / "Executive" map cleanly.
      // "Mid-Senior Level" deliberately does not — see NATIVE_SENIORITY_MAP in
      // ../config/seniorityRules.js, which leaves Workable's identical value
      // unmapped for the same reason.
      nativeSeniority: item.experienceLevel?.label || null,
      flags: {},
      // The API states remote and hybrid explicitly, which beats inferring it
      // from a location string. Hybrid is on-site for our purposes: it names a
      // place the candidate has to reach.
      ...(location.remote === true ? { isRemoteOverride: true } : {}),
      descriptionSnippet: '',
      detailId: item.id,
    }
  },

  async hydrateOne(raw, { account, http, limiter }) {
    if (!raw.detailId) return null

    await limiter.wait()
    const { data } = await http.get(
      `${API}/${encodeURIComponent(account.account)}/postings/${encodeURIComponent(raw.detailId)}`,
      { headers: { Accept: 'application/json' }, timeout: 30_000 }
    )

    // Sections are a fixed set but any of them may be missing. companyDescription
    // is deliberately LAST: it is identical on every advert from one employer, so
    // leading with it would push the actual role past the snippet cut-off.
    const sections = data?.jobAd?.sections || {}
    const html = [
      sections.jobDescription?.text,
      sections.qualifications?.text,
      sections.additionalInformation?.text,
      sections.companyDescription?.text,
    ].filter(Boolean).join('\n')
    if (!html) return null

    const text = htmlToText(html)
    return {
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
      applyUrlRaw: data.postingUrl || data.applyUrl || raw.applyUrlRaw,
    }
  },
}
