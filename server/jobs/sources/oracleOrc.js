/**
 * Oracle Recruiting Cloud adapter (the "Candidate Experience" REST API).
 *
 * The ATS behind a good share of large UK retail and professional-services
 * careers sites — Marks & Spencer is the one on our allowlist. Public and
 * unauthenticated; the host is the customer's Fusion pod and the site number is
 * their careers site, both of which appear in the careers page URL.
 *
 * Endpoints, both derived from params:
 *   list   GET {host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions
 *              ?finder=findReqs;siteNumber={site},limit=,offset=,sortBy=POSTING_DATES_DESC
 *   detail GET {host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails
 *              ?finder=ById;Id="{id}",siteNumber="{site}"
 *
 * job_source_accounts.params:
 *   { "host":"fa-eqid-saasfaprod1.fa.ocs.oraclecloud.com", "siteNumber":"CX_1" }
 *
 * TWO-PHASE. The list carries `ShortDescriptionStr`, but on every board probed
 * it is the empty string; the text lives in `ExternalDescriptionStr` on the
 * detail record.
 *
 * The one genuinely convenient thing here: `sortBy=POSTING_DATES_DESC` means
 * page one is the newest jobs. Combined with the board-wide age cut
 * (MAX_POSTED_AGE_DAYS in ../lib/expire.js), only the first pages of a 700-job
 * board are ever usable — but `max_pages` still has to cover them, so raising
 * that cut means re-checking the account's page count.
 *
 * ⚠️ The `finder` parameter is a semicolon/comma DSL, not ordinary query
 * syntax, and the detail finder needs its values DOUBLE-QUOTED where the list
 * finder does not. Axios would percent-encode the separators into meaninglessness,
 * so the query string is assembled by hand below.
 */

import {
  htmlToText,
  buildSnippet,
  parseLocation,
  toIsoDate,
} from '../lib/normalise.js'

const PAGE_SIZE = 25
const API = 'hcmRestApi/resources/latest'

export default {
  key: 'oracle_orc',
  supportsMarkets: '*',
  requiresQuery: false,

  async fetchPage({ account, page, http, limiter }) {
    const { host, siteNumber } = account?.params || {}
    if (!host || !siteNumber) {
      throw new Error(
        `oracle_orc board "${account?.account}" has no host/siteNumber in params — ` +
        'run scripts/discover-job-boards.mjs to generate it'
      )
    }

    const offset = (page - 1) * PAGE_SIZE
    const finder =
      `findReqs;siteNumber=${siteNumber},limit=${PAGE_SIZE},offset=${offset},sortBy=POSTING_DATES_DESC`
    const url =
      `https://${host}/${API}/recruitingCEJobRequisitions` +
      `?onlyData=true&expand=requisitionList.secondaryLocations&finder=${finder}`

    await limiter.wait()
    const { data } = await http.get(url, {
      headers: { Accept: 'application/json' },
      timeout: 30_000,
    })

    // The payload wraps a single search result whose requisitionList is the page.
    const result = data?.items?.[0]
    const items = result?.requisitionList || []
    const total = Number(result?.TotalJobsCount ?? 0)
    return { items, hasMore: offset + items.length < total, apiCalls: 1 }
  },

  normalise(item, { market, account }) {
    if (!item?.Id || !item?.Title) return null

    const locations = [
      item.PrimaryLocation,
      ...(item.secondaryLocations || []).map(l => l?.LocationName || l?.Name).filter(Boolean),
    ].filter(Boolean)

    return {
      sourceJobId: `${account.account}:${item.Id}`,
      title: String(item.Title).trim(),
      company: account.company,
      companyLogoUrl: null,
      descriptionHtml: null,
      descriptionText: '',
      isSnippet: false,
      needsDetail: true,
      ...parseLocation(locations.join(', '), { marketCode: market.code }),
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryIsEstimate: false,
      contractType: item.ContractType || null,
      contractTime: item.JobSchedule || null,
      postedAt: toIsoDate(item.PostedDate),
      applyUrlRaw:
        `https://${account.params.host}/hcmUI/CandidateExperience/en/sites/` +
        `${account.params.siteNumber}/job/${item.Id}`,
      sourceCategory: [item.JobFamily, item.JobFunction, item.Department].filter(Boolean).join(', '),
      nativeSeniority: null,
      flags: {},
      isRemoteOverride: item.WorkplaceTypeCode === 'ORA_REMOTE',
      descriptionSnippet: '',
      detailId: item.Id,
    }
  },

  async hydrateOne(raw, { account, http, limiter }) {
    const { host, siteNumber } = account?.params || {}
    if (!host || !siteNumber || !raw.detailId) return null

    const finder = `ById;Id=%22${encodeURIComponent(raw.detailId)}%22,siteNumber=%22${siteNumber}%22`
    const url = `https://${host}/${API}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=${finder}`

    await limiter.wait()
    const { data } = await http.get(url, {
      headers: { Accept: 'application/json' },
      timeout: 30_000,
    })
    const detail = data?.items?.[0]
    if (!detail) return null

    // Oracle splits the advert across three fields and leaves the unused ones
    // as empty strings rather than nulls, so a plain join needs the filter.
    const html = [
      detail.ExternalDescriptionStr,
      detail.ExternalResponsibilitiesStr,
      detail.ExternalQualificationsStr,
    ].filter(Boolean).join('\n')
    if (!html) return null

    const text = htmlToText(html)
    return {
      descriptionHtml: html,
      descriptionText: text,
      descriptionSnippet: buildSnippet(text),
      needsDetail: false,
      postedAt: toIsoDate(detail.ExternalPostedStartDate) || raw.postedAt,
    }
  },
}
