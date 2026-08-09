/**
 * Workable adapter.
 *
 * Uses the public endpoint that backs Workable's own embeddable careers widget:
 * https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true
 *
 * Unauthenticated, one request per company, no paging.
 *
 * Notably this is the ONLY ATS here that ships a native experience level
 * (`experience`), which feeds the seniority cascade directly.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

export default {
  key: 'workable',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    if (page > 1) return { items: [], hasMore: false, apiCalls: 0 }

    await limiter.wait()
    const { data } = await http.get(
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(account.account)}`,
      { params: { details: 'true' }, timeout: 30_000 }
    )

    return { items: data?.jobs || [], hasMore: false, apiCalls: 1 }
  },

  normalise(item, { market, account }) {
    const id = item?.shortcode || item?.id
    if (!id || !item?.title) return null

    // The description is split across three fields; the requirements section is
    // where seniority signals like "3+ years experience" usually live, so it
    // must be included rather than dropped.
    const html = [item.description, item.requirements, item.benefits].filter(Boolean).join('\n')
    const text = htmlToText(html)

    const locationName =
      [item.city, item.state, item.country].filter(Boolean).join(', ') ||
      (item.locations || []).map(l => [l.city, l.region, l.country].filter(Boolean).join(', ')).join('; ')

    return {
      sourceJobId: String(id),
      title: item.title,
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: html || null,
      descriptionText: text,
      isSnippet: false,
      ...parseLocation(locationName, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: item.employment_type || null,
      contractTime: null,
      postedAt: toIsoDate(item.published_on || item.created_at),
      applyUrlRaw: item.url || item.shortlink || item.application_url,
      sourceCategory: [item.department, item.function, item.industry].filter(Boolean).join(', '),
      // "Entry level" / "Internship" / "Director" / "Executive" map cleanly.
      // "Mid-Senior level" deliberately does not — see NATIVE_SENIORITY_MAP.
      nativeSeniority: item.experience || null,
      flags: {},
      isRemoteOverride: item.telecommuting === true,
      descriptionSnippet: buildSnippet(text),
    }
  },
}
