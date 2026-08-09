/**
 * Ashby job board adapter.
 *
 * Public, unauthenticated, full HTML descriptions, no paging or filtering.
 *
 * Endpoint: https://api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true
 *
 * Ashby is the only ATS here that returns structured compensation, but as a
 * pre-formatted summary string ("€110K – €185K • Offers Equity") rather than
 * numbers — so it goes through the same free-text salary parser as everything
 * else.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  parseSalaryText,
  toIsoDate,
} from '../lib/normalise.js'

export default {
  key: 'ashby',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    if (page > 1) return { items: [], hasMore: false, apiCalls: 0 }

    await limiter.wait()
    const { data } = await http.get(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(account.account)}`,
      { params: { includeCompensation: 'true' }, timeout: 30_000 }
    )

    return { items: data?.jobs || [], hasMore: false, apiCalls: 1 }
  },

  normalise(item, { market, account }) {
    if (!item?.id || !item?.title) return null
    // isListed false means the posting exists but is not on the public board.
    if (item.isListed === false) return null

    const text = item.descriptionPlain || htmlToText(item.descriptionHtml || '')

    // Prefer the primary location, but fold in secondary ones so a role open in
    // several countries still matches whichever market we are ingesting for.
    const locations = [
      item.location,
      ...(item.secondaryLocations || []).map(l => l?.location).filter(Boolean),
    ].filter(Boolean)

    const salary = parseSalaryText(
      item.compensation?.scrapeableCompensationSalarySummary ||
      item.compensation?.compensationTierSummary ||
      ''
    )

    return {
      sourceJobId: String(item.id),
      title: item.title.trim(),
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: item.descriptionHtml || null,
      descriptionText: text,
      isSnippet: false,
      ...parseLocation(locations.join(', '), { marketCode: market.code }),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: salary.period,
      salaryIsEstimate: false,
      contractType: item.employmentType || null,
      contractTime: null,
      postedAt: toIsoDate(item.publishedAt),
      applyUrlRaw: item.jobUrl || item.applyUrl,
      sourceCategory: [item.department, item.team].filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      isRemoteOverride: item.isRemote === true,
      descriptionSnippet: buildSnippet(text),
    }
  },
}
