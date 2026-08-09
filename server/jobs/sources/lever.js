/**
 * Lever postings adapter.
 *
 * Public, unauthenticated, full HTML descriptions. One request per company.
 *
 * Endpoint: https://api.lever.co/v0/postings/{site}?mode=json
 * EU-hosted accounts live on api.eu.lever.co instead, and the US host returns
 * a non-array body for them — so we retry against the EU host rather than
 * silently reporting zero jobs.
 *
 * Note: Lever accepts a `level` filter parameter but does NOT return a level
 * field on postings, so seniority still comes from title inference.
 */

import { htmlToText, buildSnippet, parseLocation, toIsoDate } from '../lib/normalise.js'

const HOSTS = ['https://api.lever.co', 'https://api.eu.lever.co']

export default {
  key: 'lever',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    if (page > 1) return { items: [], hasMore: false, apiCalls: 0 }

    let apiCalls = 0
    for (const host of HOSTS) {
      await limiter.wait()
      apiCalls++
      try {
        const { data } = await http.get(
          `${host}/v0/postings/${encodeURIComponent(account.account)}`,
          { params: { mode: 'json' }, timeout: 30_000 }
        )
        if (Array.isArray(data)) return { items: data, hasMore: false, apiCalls }
        // Non-array means "not on this host" — fall through and try the next.
      } catch (error) {
        if (host === HOSTS[HOSTS.length - 1]) throw error
      }
    }

    return { items: [], hasMore: false, apiCalls }
  },

  normalise(item, { market, account }) {
    if (!item?.id || !item?.text) return null

    const text = item.descriptionPlain || htmlToText(item.description || '')
    const locationName = item.categories?.location || (item.categories?.allLocations || []).join(', ')

    return {
      sourceJobId: String(item.id),
      title: item.text,
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: item.description || null,
      descriptionText: text,
      isSnippet: false,
      ...parseLocation(locationName, { marketCode: market.code }),
      // Lever's salaryRange is present only on some postings.
      salaryMin: item.salaryRange?.min ?? null,
      salaryMax: item.salaryRange?.max ?? null,
      salaryCurrency: item.salaryRange?.currency ?? null,
      salaryPeriod: item.salaryRange?.interval === 'per-year-salary' ? 'year' : null,
      salaryIsEstimate: false,
      contractType: item.categories?.commitment || null,
      contractTime: null,
      // createdAt is epoch milliseconds, not an ISO string.
      postedAt: toIsoDate(item.createdAt ? new Date(Number(item.createdAt)) : null),
      applyUrlRaw: item.hostedUrl || item.applyUrl,
      sourceCategory: [item.categories?.team, item.categories?.department].filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      // workplaceType is 'remote' | 'hybrid' | 'onsite'; trust it over the
      // location string, which often omits the word entirely.
      isRemoteOverride: item.workplaceType === 'remote',
      descriptionSnippet: buildSnippet(text),
    }
  },
}
