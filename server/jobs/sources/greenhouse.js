/**
 * Greenhouse job board adapter.
 *
 * Public, unauthenticated, full HTML descriptions, direct employers only.
 * One request returns a company's entire board, so there is no paging.
 *
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
 * The board token is the slug in a company's careers URL
 * (job-boards.greenhouse.io/<token>).
 */

import {
  decodeEntities,
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

export default {
  key: 'greenhouse',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    // The whole board arrives in one response.
    if (page > 1) return { items: [], hasMore: false, apiCalls: 0 }

    await limiter.wait()
    const { data } = await http.get(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(account.account)}/jobs`,
      { params: { content: 'true' }, timeout: 30_000 }
    )

    return { items: data?.jobs || [], hasMore: false, apiCalls: 1 }
  },

  normalise(item, { market, account }) {
    if (!item?.id || !item?.title) return null

    // Greenhouse returns `content` ENTITY-ESCAPED, so a plain tag strip would
    // leave literal "&lt;p&gt;" in the text. Decode once first.
    const html = decodeEntities(item.content || '')
    const text = htmlToText(html)

    const locationName =
      item.location?.name || (item.offices || []).map(o => o.name).filter(Boolean).join(', ')

    return {
      sourceJobId: String(item.id),
      title: item.title,
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: html,
      descriptionText: text,
      isSnippet: false,
      ...parseLocation(locationName, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: null,
      contractTime: null,
      // first_published is when it went live; updated_at only tracks edits.
      postedAt: toIsoDate(item.first_published || item.updated_at),
      applyUrlRaw: item.absolute_url,
      sourceCategory: (item.departments || []).map(d => d.name).filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      descriptionSnippet: buildSnippet(text),
    }
  },
}
