/**
 * Adzuna adapter.
 *
 * The deepest UK inventory available through a free API — Adzuna operates the
 * DWP's Find a Job service, so their index reaches well beyond the tech-sector
 * ATS boards. This is the ONLY source that can populate Healthcare Assistant,
 * Mental Health Worker and Green Energy Technician.
 *
 * Endpoint: https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
 * The country is a URL path segment read from job_markets.source_params, which
 * is why adding a market never touches this file.
 *
 * ⚠️ TWO CONSTRAINTS THAT ARE NOT NEGOTIABLE
 *
 * 1. RATE LIMITS. The terms allow 25/min, 250/day, 1,000/week and 2,500/month.
 *    The per-minute ceiling is handled by the limiter; the longer windows are
 *    enforced from job_ingest_runs.api_calls in ../lib/budget.js, because a
 *    Render restart would reset any in-process counter and quietly breach them.
 *
 * 2. ATTRIBUTION. Every displayed advert must carry the "Jobs by Adzuna" logo at
 *    a minimum of 116×23px, linked to adzuna.co.uk, and any estimated salary
 *    needs the Jobsworth icon. That is rendered from job_sources.attribution by
 *    SourceAttribution.tsx. Adzuna states that non-compliance means suspension.
 *    Their terms also restrict DERIVED statistics (vacancy counts, average
 *    salaries), which is why the board renders no result count.
 *
 * Descriptions are SNIPPETS, not full text. `isSnippet: true` propagates that,
 * and the seniority cascade skips its years-of-experience rule as a result — a
 * truncated excerpt can quote "5 years" about something other than the
 * requirement.
 */

import { buildSnippet, parseLocation, toIsoDate } from '../lib/normalise.js'

export default {
  key: 'adzuna',
  supportsMarkets: '*',
  requiresQuery: true,

  async fetchPage({ market, query, page, env, http, limiter }) {
    const appId = env.ADZUNA_APP_ID
    const appKey = env.ADZUNA_APP_KEY
    if (!appId || !appKey) {
      throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY are not configured')
    }

    const country = market.source_params?.adzuna?.country
    if (!country) {
      // Better to fail loudly than to silently ingest the wrong country.
      throw new Error(`market "${market.code}" has no adzuna.country in source_params`)
    }

    const params = {
      app_id: appId,
      app_key: appKey,
      'content-type': 'application/json',
      results_per_page: query.params?.results_per_page || 50,
      // title_only + max_days_old is what turns Adzuna's ~2,000 UK jobs/day into
      // tens of queue rows. Do not widen without watching job_ingest_runs.
      ...(query.params?.title_only ? { title_only: query.params.title_only } : {}),
      ...(query.params?.what ? { what: query.params.what } : {}),
      ...(query.params?.where ? { where: query.params.where } : {}),
      ...(query.params?.category ? { category: query.params.category } : {}),
      ...(query.params?.max_days_old ? { max_days_old: query.params.max_days_old } : {}),
      ...(query.params?.sort_by ? { sort_by: query.params.sort_by } : {}),
    }

    await limiter.wait()
    const { data } = await http.get(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`,
      { params, timeout: 30_000 }
    )

    const items = data?.results || []
    const perPage = params.results_per_page
    return { items, hasMore: items.length >= perPage, apiCalls: 1 }
  },

  normalise(item, { market, query }) {
    if (!item?.id || !item?.title) return null

    // Adzuna HTML-escapes bold markers into the title on some listings.
    const title = String(item.title).replace(/<\/?[^>]+>/g, '').trim()
    const description = String(item.description || '').replace(/<\/?[^>]+>/g, '').trim()

    const contractType = item.contract_type || null      // permanent | contract
    const contractTime = item.contract_time || null      // full_time | part_time

    const locationName =
      item.location?.display_name ||
      (item.location?.area || []).slice().reverse().join(', ')

    return {
      sourceJobId: String(item.id),
      title,
      company: item.company?.display_name || 'Unknown employer',
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: description,
      // The whole reason the years-of-experience seniority rule is skipped.
      isSnippet: true,
      ...parseLocation(locationName, { marketCode: market.code }),
      salaryMin: item.salary_min ?? null,
      salaryMax: item.salary_max ?? null,
      salaryCurrency: market.currency || 'GBP',
      // Adzuna salaries are annualised.
      salaryPeriod: item.salary_min || item.salary_max ? 'year' : null,
      // Drives the mandatory Jobsworth badge — showing a predicted figure as an
      // advertised salary is both a terms problem and simply misleading.
      salaryIsEstimate: Boolean(item.salary_is_predicted === '1' || item.salary_is_predicted === true),
      contractType,
      contractTime,
      postedAt: toIsoDate(item.created),
      applyUrlRaw: item.redirect_url,
      // The ~30-tag Adzuna taxonomy. 'graduate-jobs' doubles as an entry-level
      // seniority signal in ../lib/seniority.js.
      sourceCategory: item.category?.tag || item.category?.label || '',
      nativeSeniority: null,
      flags: { graduate: /graduate/i.test(item.category?.tag || '') },
      queryProfession: query?.profession || null,
      descriptionSnippet: buildSnippet(description),
    }
  },
}
