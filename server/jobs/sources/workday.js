/**
 * Workday adapter (CXS — the JSON API Workday's own careers SPA calls).
 *
 * This is the highest-value adapter on the board: one implementation covers
 * Roche, Nike, LSEG and Mars today, and any future Workday employer is a config
 * row rather than code. Public, unauthenticated, no access control defeated —
 * but it is UNDOCUMENTED, so treat it as a shape that will change and rely on
 * the orchestrator's per-board failure isolation rather than on it not moving.
 *
 * Endpoints, both derived from params:
 *   list   POST https://{tenant}.wd{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 *   detail GET  https://{tenant}.wd{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}
 *
 * job_source_accounts.params:
 *   { "tenant":"roche", "wd":3, "site":"roche-ext",
 *     "facets": { "gb": { "locations":["<guid>"], "postedOn":["<guid>"] } } }
 *
 * ⚠️ THREE THINGS THAT ARE NOT OPTIONAL
 *
 * 1. TWO-PHASE. The list response contains NO description — only title,
 *    locationsText, a relative postedOn and externalPath. `needsDetail` marks
 *    that, and the orchestrator's hydrate step fetches the description only for
 *    jobs that survive the cheap gates and that we do not already hold. See the
 *    hydrate section of server/jobs/index.js before changing anything here.
 *
 * 2. LOCATION FACETS ARE THE DIFFERENCE BETWEEN 9 JOBS AND 1,191. Roche's board
 *    is 1,191 requisitions worldwide and 9 in the UK. Without params.facets the
 *    adapter fetches the whole global board and throws almost all of it away at
 *    the wrong_market filter, having paid for every page. The facet ids are
 *    per-TENANT GUIDs — they cannot be hardcoded or shared between boards, they
 *    must be read from that tenant's own `facets` array. That is exactly what
 *    scripts/discover-job-boards.mjs does.
 *
 * 3. LIMIT IS CAPPED AT 20. Asking for 100 returns zero items, not 100. Paging
 *    is job_source_accounts.max_pages, which discovery sets from the filtered
 *    total.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

// Workday's own ceiling. Requesting more returns an empty jobPostings array
// rather than an error, which looks exactly like an empty board.
const PAGE_SIZE = 20

/** `{tenant, wd, site}` → the CXS base URL, or null when params are incomplete. */
function baseUrl(account) {
  const { tenant, wd, site } = account?.params || {}
  if (!tenant || !site) return null
  const instance = wd || 1
  return `https://${tenant}.wd${instance}.myworkdayjobs.com/wday/cxs/${tenant}/${site}`
}

/** The human-facing careers URL for a posting — what an applicant should land on. */
function publicUrl(account, externalPath) {
  const { tenant, wd, site } = account?.params || {}
  const instance = wd || 1
  return `https://${tenant}.wd${instance}.myworkdayjobs.com/${site}${externalPath}`
}

/**
 * "Posted 4 Days Ago" → an ISO date.
 *
 * The list gives a relative string; only the detail response carries the real
 * `startDate`. Parsing the relative form is what lets the orchestrator drop
 * stale requisitions BEFORE paying for their description — and on a Workday
 * board most requisitions are stale, so this is the single biggest saving in
 * the adapter.
 *
 * Every form is a floor, never an underestimate of age ("Posted 30+ Days Ago"
 * means at least 30), so dropping on it can never discard something fresher
 * than it claims to be.
 */
export function parseRelativePostedOn(text, now = Date.now()) {
  const raw = String(text || '').toLowerCase()
  if (!raw) return null

  const day = 86_400_000
  if (/just posted|posted today/.test(raw)) return new Date(now).toISOString()
  if (/yesterday/.test(raw)) return new Date(now - day).toISOString()

  const match = raw.match(/(\d+)\s*\+?\s*days?\s*ago/)
  if (match) return new Date(now - Number(match[1]) * day).toISOString()

  const months = raw.match(/(\d+)\s*\+?\s*months?\s*ago/)
  if (months) return new Date(now - Number(months[1]) * 30 * day).toISOString()

  return null
}

/**
 * Workday reports "2 Locations" instead of naming them once a requisition is
 * open in more than one place. That string tells matchesMarket() nothing, so it
 * is treated as unknown here and replaced by the real locations at hydration.
 */
function usableLocation(locationsText) {
  const text = String(locationsText || '').trim()
  if (!text) return null
  return /^\d+\s+locations?$/i.test(text) ? null : text
}

export default {
  key: 'workday',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ market, account, page, http, limiter }) {
    const base = baseUrl(account)
    if (!base) {
      throw new Error(
        `workday board "${account?.account}" has no tenant/site in params — ` +
        'run scripts/discover-job-boards.mjs to generate it'
      )
    }

    // Absent facets mean an unfiltered global fetch. Deliberately allowed (a
    // board is better than no board while discovery is pending) but loud,
    // because it silently multiplies the cost of the run.
    const facets = account.params?.facets?.[market.code] || null
    if (!facets) {
      console.warn(
        `⚠️  [jobs] workday/${account.account}: no location facet for market ` +
        `"${market.code}" — fetching the whole global board`
      )
    }

    await limiter.wait()
    const { data } = await http.post(
      `${base}/jobs`,
      {
        appliedFacets: facets || {},
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        searchText: '',
      },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 30_000 }
    )

    const items = data?.jobPostings || []
    const total = Number(data?.total ?? 0)
    return {
      items,
      hasMore: (page - 1) * PAGE_SIZE + items.length < total,
      apiCalls: 1,
    }
  },

  normalise(item, { market, account }) {
    if (!item?.title || !item?.externalPath) return null

    // The trailing segment of externalPath is Workday's own requisition id
    // ("…_R-88387", "…_202607-117253-1"). Preferred over bulletFields, which is
    // a tenant-configurable display field — LSEG puts a division name in it.
    //
    // Namespaced by board because job_listings is UNIQUE (source, source_job_id)
    // across every tenant of source='workday', and req ids are only unique
    // within a tenant. Greenhouse gets away with a bare id; Workday would not.
    const reqId = item.externalPath.split('_').pop() || item.externalPath
    const locationsText = usableLocation(item.locationsText)

    return {
      sourceJobId: `${account.account}:${reqId}`,
      title: String(item.title).trim(),
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: '',
      isSnippet: false,
      // Filled in by hydrateOne. Until then this is a title-only record.
      needsDetail: true,
      ...parseLocation(locationsText, { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: null,
      contractTime: item.timeType || null,
      // Relative, and refined to the real startDate at hydration. Good enough
      // for the pre-hydration age gate, which is the whole point of having it.
      postedAt: parseRelativePostedOn(item.postedOn),
      applyUrlRaw: publicUrl(account, item.externalPath),
      sourceCategory: (item.bulletFields || []).slice(1).join(', '),
      nativeSeniority: null,
      flags: {},
      descriptionSnippet: '',
      detailPath: item.externalPath,
    }
  },

  /**
   * Fetch the description for one posting. Called by the orchestrator only for
   * jobs that passed the cheap gates and are not already in the database.
   *
   * Returns a patch, not a whole RawJob — the caller merges it. A null return
   * means "could not hydrate", and the orchestrator drops the job rather than
   * persisting it with an empty description (which would blank the stored text
   * of a job we already hold, because description_* are volatile fields).
   */
  async hydrateOne(raw, { account, market, http, limiter }) {
    const base = baseUrl(account)
    if (!base || !raw.detailPath) return null

    await limiter.wait()
    const { data } = await http.get(`${base}${raw.detailPath}`, { timeout: 30_000 })
    const info = data?.jobPostingInfo
    if (!info) return null

    const html = info.jobDescription || ''
    const text = htmlToText(html)

    // The real locations, which is why a "2 Locations" requisition can still be
    // market-matched. additionalLocations already includes the primary on some
    // tenants, so dedupe before joining.
    const locations = [...new Set([
      info.location,
      ...(info.additionalLocations || []),
    ].filter(Boolean))]

    return {
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
      ...parseLocation(locations.join(', '), { marketCode: market.code }),
      // startDate is the genuine posting date; the list only had "Posted N Days
      // Ago". Keep the relative estimate if a tenant omits it.
      postedAt: toIsoDate(info.startDate) || raw.postedAt,
      contractTime: info.timeType || raw.contractTime,
      applyUrlRaw: info.externalUrl || raw.applyUrlRaw,
    }
  },
}
