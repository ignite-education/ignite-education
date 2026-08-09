/**
 * Reed.co.uk adapter.
 *
 * UK-only, and a genuinely useful second opinion on UK inventory. Its real
 * value is the `graduate` boolean: it is the single highest-confidence
 * entry-level signal available from any source in this pipeline, and entry-level
 * roles are exactly what a learner finishing a course needs.
 *
 * Endpoint: https://www.reed.co.uk/api/1.0/search
 * Auth: HTTP Basic with the API key as the USERNAME and a BLANK password.
 *
 * Getting a key is not self-service — it needs a reed.co.uk recruiter account
 * and a conversation with Reed. Until REED_API_KEY is set, the source stays
 * disabled in job_sources and the orchestrator skips it.
 *
 * Terms arrive with the key rather than being published; the seed assumes a
 * link-back requirement, rendered by SourceAttribution.tsx.
 */

import { buildSnippet, parseLocation, parseSalaryText, toIsoDate } from '../lib/normalise.js'

const PAGE_SIZE = 100   // Reed's documented maximum for resultsToTake

export default {
  key: 'reed',
  // UK only. The orchestrator skips this source for any other market rather
  // than erroring, so enabling a second country needs no change here.
  supportsMarkets: ['gb'],
  requiresQuery: true,

  async fetchPage({ query, page, env, http, limiter }) {
    const apiKey = env.REED_API_KEY
    if (!apiKey) throw new Error('REED_API_KEY is not configured')

    const resultsToTake = query.params?.results_per_page || PAGE_SIZE

    const params = {
      resultsToTake,
      resultsToSkip: (page - 1) * resultsToTake,
      ...(query.params?.keywords ? { keywords: query.params.keywords } : {}),
      ...(query.params?.locationName ? { locationName: query.params.locationName } : {}),
      ...(query.params?.distanceFromLocation ? { distanceFromLocation: query.params.distanceFromLocation } : {}),
      ...(query.params?.minimumSalary ? { minimumSalary: query.params.minimumSalary } : {}),
      // The reason this source is worth having.
      ...(query.params?.graduate ? { graduate: true } : {}),
      ...(query.params?.permanent !== undefined ? { permanent: query.params.permanent } : {}),
      ...(query.params?.fullTime !== undefined ? { fullTime: query.params.fullTime } : {}),
    }

    await limiter.wait()
    const { data } = await http.get('https://www.reed.co.uk/api/1.0/search', {
      params,
      // API key as username, blank password — Reed's documented scheme.
      auth: { username: apiKey, password: '' },
      timeout: 30_000,
    })

    const items = data?.results || []
    return { items, hasMore: items.length >= resultsToTake, apiCalls: 1 }
  },

  normalise(item, { market, query }) {
    if (!item?.jobId || !item?.jobTitle) return null

    const description = String(item.jobDescription || '').replace(/<\/?[^>]+>/g, '').trim()

    // Reed returns explicit min/max fields; fall back to parsing the display
    // string when a listing only carries the free-text form.
    let salaryMin = item.minimumSalary ?? null
    let salaryMax = item.maximumSalary ?? null
    let salaryPeriod = null
    if (salaryMin == null && salaryMax == null && item.salary) {
      const parsed = parseSalaryText(item.salary)
      salaryMin = parsed.min
      salaryMax = parsed.max
      salaryPeriod = parsed.period
    }

    return {
      sourceJobId: String(item.jobId),
      title: item.jobTitle,
      company: item.employerName || 'Unknown employer',
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: description,
      // Search results carry a truncated description; only /jobs/{id} returns
      // the full text, and that would cost one request per listing.
      isSnippet: true,
      ...parseLocation(item.locationName || '', { marketCode: market.code }),
      salaryMin,
      salaryMax,
      salaryCurrency: item.currency || 'GBP',
      salaryPeriod: salaryPeriod || (salaryMin || salaryMax ? 'year' : null),
      salaryIsEstimate: false,
      contractType: item.contractType || null,
      contractTime: item.fullTime ? 'full_time' : item.partTime ? 'part_time' : null,
      postedAt: toIsoDate(item.date || item.datePosted),
      applyUrlRaw: item.jobUrl || item.externalUrl,
      sourceCategory: '',   // Reed has no category taxonomy at all
      nativeSeniority: null,
      // Highest-confidence entry-level signal in the whole pipeline.
      flags: { graduate: Boolean(query?.params?.graduate) },
      queryProfession: query?.profession || null,
      expiresAt: toIsoDate(item.expirationDate),
      descriptionSnippet: buildSnippet(description),
    }
  },
}
