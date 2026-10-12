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
 *
 * ── THE SECOND API SHAPE: "pcsx" ────────────────────────────────────────────
 * Eightfold's newer careers sites (Microsoft's apply.careers.microsoft.com,
 * late 2025) do not serve /api/apply/v2 at all — it answers 403 "Not authorized
 * for PCSX". The same board is public under a different path:
 *
 *   list   GET https://{host}/api/pcsx/search?domain={domain}&start=&num=&location=
 *          → { data: { positions:[…], count } }   camelCase fields, postedTs
 *
 * and there is NO detail endpoint under /api/pcsx that answers without a
 * browser session. What there is instead is the advert page itself,
 * /careers/job/{id}?domain=…, which carries a complete schema.org JobPosting as
 * JSON-LD — for Google for Jobs — with the full description. Microsoft's
 * robots.txt lists /careers and /api/pcsx as the two paths it allows, so this
 * is the route the tenant invites rather than one it merely fails to block.
 *
 * Opt in per board with `"api":"pcsx"` in params. Everything else about the
 * board (host, domain, location) is the same; discovery sets the flag when
 * the v2 probe comes back 401/403 and the pcsx one succeeds.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'
import { extractJobPosting } from './jsonld.js'

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

    const pcsx = isPcsx(account)
    const url = `https://${host}/api/${pcsx ? 'pcsx/search' : 'apply/v2/jobs'}`
    const config = {
      params: {
        domain,
        start: (page - 1) * PAGE_SIZE,
        num: PAGE_SIZE,
        sort_by: 'timestamp',
        ...(location ? { location } : {}),
      },
      timeout: 30_000,
    }

    await limiter.wait()
    const { data } = pcsx ? await pcsxGet(url, config, http) : await http.get(url, config)

    // pcsx wraps the same payload one level down.
    const body = pcsx ? data?.data : data
    const items = body?.positions || []
    const total = Number(body?.count ?? 0)
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
      // creation date — no relative-string parsing needed here. pcsx spells
      // the same field postedTs.
      postedAt: (item.t_create || item.postedTs)
        ? toIsoDate(new Date((item.t_create || item.postedTs) * 1000))
        : null,
      applyUrlRaw: item.canonicalPositionUrl || `https://${account.params.host}/careers/job/${item.id}`,
      sourceCategory: [item.department, item.business_unit].filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      isRemoteOverride: (item.work_location_option || item.workLocationOption) === 'remote',
      descriptionSnippet: '',
      detailId: item.id,
    }
  },

  async hydrateOne(raw, { account, market, http, limiter }) {
    const { host, domain } = account?.params || {}
    if (!host || !domain || !raw.detailId) return null

    if (isPcsx(account)) return hydrateFromAdvertPage(raw, { host, domain, http, limiter })

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

function isPcsx(account) {
  return account?.params?.api === 'pcsx'
}

/**
 * pcsx tenants rate-limit hard. Measured on Microsoft: a request every ~6s
 * passes, a second one 4s later gets 429, and the occasional 429 still lands
 * at 6s — a token bucket refilling at roughly ten a minute, with no
 * Retry-After. The source's min_delay_ms (400) is right for every other
 * Eightfold tenant and wrong here, so pcsx requests are paced in this module:
 * at least PCSX_SPACING_MS apart, and a 429 is retried after a growing wait
 * rather than failing the board. ~15 requests a night for Microsoft, so the
 * pacing costs about 90 seconds of the two-phase budget.
 */
const PCSX_SPACING_MS = 6_500
const PCSX_RETRY_WAITS_MS = [8_000, 16_000, 32_000]
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let lastPcsxRequestAt = 0

async function pcsxGet(url, config, http) {
  for (let attempt = 0; ; attempt++) {
    const gap = PCSX_SPACING_MS - (Date.now() - lastPcsxRequestAt)
    if (gap > 0) await sleep(gap)
    lastPcsxRequestAt = Date.now()
    try {
      return await http.get(url, config)
    } catch (error) {
      const wait = PCSX_RETRY_WAITS_MS[attempt]
      if (error.response?.status !== 429 || wait == null) throw error
      await sleep(wait)
    }
  }
}

/**
 * The pcsx hydration path: read the advert page's JSON-LD JobPosting.
 *
 * The list already gave us title, location and date, so only the description
 * is taken from the page — the LD's jobLocation on these tenants is a bare
 * country code ("GB"), which is less than the list's "United Kingdom, London"
 * and would overwrite it for nothing.
 */
async function hydrateFromAdvertPage(raw, { host, domain, http, limiter }) {
  await limiter.wait()
  const { data } = await pcsxGet(`https://${host}/careers/job/${raw.detailId}`, {
    params: { domain },
    timeout: 30_000,
    responseType: 'text',
  }, http)
  const posting = typeof data === 'string' ? extractJobPosting(data) : null
  if (!posting?.description) return null

  const html = String(posting.description)
  const text = htmlToText(html)
  if (!text) return null

  return {
    descriptionHtml: html,
    descriptionText: text,
    descriptionSnippet: buildSnippet(text),
    needsDetail: false,
    ...(posting.employmentType ? { contractType: String(posting.employmentType) } : {}),
  }
}
