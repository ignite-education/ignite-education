/**
 * Eightfold adapter.
 *
 * Eightfold hosts the careers site for a long tail of large employers that left
 * their old ATS behind — Netflix is the one on our allowlist. Public,
 * unauthenticated, and the same API shape on every tenant; only the host and
 * the `domain` query parameter change.
 *
 * Endpoints, both derived from params:
 *   list   GET https://{host}/api/apply/v2/jobs?domain={domain}&start=&num=&location=
 *   detail GET https://{host}/api/apply/v2/jobs/{id}?domain={domain}
 *
 * job_source_accounts.params:
 *   { "host":"explore.jobs.netflix.net", "domain":"netflix.com",
 *     "location":"United Kingdom" }
 *
 * TWO-PHASE, and confusingly so: the list response DOES carry a
 * `job_description` key, but it is always the empty string. Only the per-id
 * detail call fills it. `include_descriptions=1` does not change that. So
 * `needsDetail` is set unconditionally rather than on `!job_description`, which
 * would look right and hydrate nothing.
 *
 * `location` is a fuzzy geo search, not a filter — it narrows the fetch but does
 * not guarantee the market, so matchesMarket() still has work to do downstream.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

// Conservative: some tenants quietly cap the page size and return fewer rows
// than asked for, which `hasMore` would then read as the end of the board.
const PAGE_SIZE = 20

export default {
  key: 'eightfold',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    const { host, domain, location } = account?.params || {}
    if (!host || !domain) {
      throw new Error(
        `eightfold board "${account?.account}" has no host/domain in params — ` +
        'run scripts/discover-job-boards.mjs to generate it'
      )
    }

    await limiter.wait()
    const { data } = await http.get(`https://${host}/api/apply/v2/jobs`, {
      params: {
        domain,
        start: (page - 1) * PAGE_SIZE,
        num: PAGE_SIZE,
        sort_by: 'timestamp',
        ...(location ? { location } : {}),
      },
      timeout: 30_000,
    })

    const items = data?.positions || []
    const total = Number(data?.count ?? 0)
    return {
      items,
      hasMore: (page - 1) * PAGE_SIZE + items.length < total,
      apiCalls: 1,
    }
  },

  normalise(item, { market, account }) {
    if (!item?.id || !item?.name) return null

    const locations = item.locations?.length ? item.locations : [item.location].filter(Boolean)

    return {
      // Namespaced by board: Eightfold position ids are unique per tenant, and
      // job_listings is UNIQUE (source, source_job_id) across all of them.
      sourceJobId: `${account.account}:${item.id}`,
      title: String(item.name).trim(),
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: '',
      isSnippet: false,
      needsDetail: true,
      ...parseLocation(locations.join('; '), { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: null,
      contractTime: null,
      // Unix seconds, and a genuine posting date rather than a requisition
      // creation date — no relative-string parsing needed here.
      postedAt: item.t_create ? toIsoDate(new Date(item.t_create * 1000)) : null,
      applyUrlRaw: item.canonicalPositionUrl || `https://${account.params.host}/careers/job/${item.id}`,
      sourceCategory: [item.department, item.business_unit].filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      isRemoteOverride: item.work_location_option === 'remote',
      descriptionSnippet: '',
      detailId: item.id,
    }
  },

  async hydrateOne(raw, { account, market, http, limiter }) {
    const { host, domain } = account?.params || {}
    if (!host || !domain || !raw.detailId) return null

    await limiter.wait()
    const { data } = await http.get(`https://${host}/api/apply/v2/jobs/${raw.detailId}`, {
      params: { domain },
      timeout: 30_000,
    })
    if (!data?.job_description) return null

    const html = data.job_description
    const text = htmlToText(html)
    const locations = data.locations?.length ? data.locations : [data.location].filter(Boolean)

    return {
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
      ...(locations.length ? parseLocation(locations.join('; '), { marketCode: market.code }) : {}),
    }
  },
}
