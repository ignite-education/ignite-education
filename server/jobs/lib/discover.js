/**
 * Find a company's job board.
 *
 * This is what makes "add a company in the admin UI and its jobs appear" a real
 * workflow rather than a promise. Given a name and a domain it identifies which
 * ATS the company uses, works out the board token or tenant config, verifies it
 * returns real in-market jobs, and prints a row ready for job_source_accounts.
 *
 * Used by BOTH scripts/discover-job-boards.mjs and the admin app's "Find
 * boards" button (via POST /api/admin/jobs/discover), deliberately: two
 * implementations of vendor detection would drift apart within a month.
 *
 * ── HOW IT WORKS ────────────────────────────────────────────────────────────
 * Stage 0  fingerprint  — fetch the careers page and look for a vendor marker.
 *                         Cheap, and far more reliable than guessing tokens.
 *                         Reports vendors we have NO adapter for too: that
 *                         output is the prioritised backlog for the next one.
 * Stage 1  tokens       — for the four token-based ATSs, try candidate slugs by
 *                         calling the REAL adapter, so a probe exercises exactly
 *                         the code path ingest will use.
 * Stage 2  config       — for Workday/Eightfold/Oracle/JSON-LD, derive the
 *                         tenant config and, for Workday, READ the location
 *                         facet GUIDs out of the tenant's own response. They
 *                         are per-tenant and cannot be guessed.
 * Stage 3  verify       — re-probe with the derived config and confirm the job
 *                         count actually dropped and the sampled locations
 *                         really are in-market.
 *
 * ── TWO GUARDRAILS THAT ARE NOT OPTIONAL ────────────────────────────────────
 * 1. DENYLIST. Eight allowlisted brands actively block automated access to
 *    their careers APIs (401/403/bot challenge). Working around that would
 *    breach their terms, and it is the same reasoning already recorded against
 *    LinkedIn and Indeed in seed_job_board_config.sql. This module refuses to
 *    probe them and says why. Without that rule this file quietly becomes the
 *    scraper we decided not to write.
 * 2. robots.txt is checked before any careers-page fetch.
 */

import axios from 'axios'
import { ADAPTERS } from '../sources/index.js'
import { normaliseCompany, slugify, matchesMarket } from './normalise.js'

const USER_AGENT = 'IgniteEducationJobBot/1.0 (+https://ignite.education/jobs)'

const http = axios.create({
  headers: { 'User-Agent': USER_AGENT },
  timeout: 20_000,
  // A 404 from a board token is the normal answer to "does this exist", not an
  // exception. Only transport failures should throw.
  validateStatus: () => true,
  maxRedirects: 5,
})

/**
 * Domains that block automated access to their job data. We do not probe these
 * and we do not build workarounds; they are covered by the aggregator tier,
 * where the employer has chosen to syndicate.
 */
export const DENYLIST = new Map([
  ['apple.com', 'jobs.apple.com API returns 401 to unauthenticated clients'],
  ['google.com', 'careers API is closed; scraping is against their terms'],
  ['microsoft.com', 'careers search API blocks non-browser clients'],
  ['meta.com', 'careers is a private GraphQL endpoint'],
  ['tiktok.com', 'lifeattiktok API blocks non-browser clients'],
  ['uber.com', 'careers API returns 403 to automated clients'],
  ['linkedin.com', 'no public job API; its Greenhouse board holds only ATS test fixtures'],
  ['jd.com', 'no public job API and effectively no UK hiring'],
])

/**
 * Is this host (or URL) on the denylist, at any depth?
 *
 * Walks up the labels rather than matching the host outright, because the input
 * is now sometimes an admin-typed URL. A plain lookup would let
 * `https://jobs.apple.com/en-gb/search` through: its host is not `apple.com`,
 * and the whole point of the list is that it cannot be sidestepped by pointing
 * at a subdomain.
 *
 * @param {string|null} input a hostname, a bare domain, or a full URL
 * @returns {string|null} the reason it is denied, or null
 */
export function denialFor(input) {
  const host = registrableDomain(input)
  if (!host) return null

  const labels = host.split('.')
  for (let i = 0; i < labels.length - 1; i++) {
    const reason = DENYLIST.get(labels.slice(i).join('.'))
    if (reason) return reason
  }
  return null
}

/** Vendor fingerprints. `adapter` null means "we can detect it, we cannot ingest it yet". */
const VENDORS = [
  { key: 'greenhouse', adapter: 'greenhouse', pattern: /(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9_-]+)/i },
  { key: 'lever', adapter: 'lever', pattern: /jobs\.lever\.co\/([a-z0-9_-]+)/i },
  { key: 'ashby', adapter: 'ashby', pattern: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i },
  { key: 'workable', adapter: 'workable', pattern: /apply\.workable\.com\/([a-z0-9_-]+)/i },
  // Captures tenant, instance and the WHOLE path. The site segment is picked
  // out in code because an optional locale group here is a trap: Workday URLs
  // are either /{site}/… or /{locale}/{site}/…, and `[a-z-]{2,5}` happily eats
  // Nike's site name "nke" as if it were a locale, leaving "job" as the site.
  { key: 'workday', adapter: 'workday', pattern: /([a-z0-9-]+)\.wd(\d+)\.myworkdayjobs\.com(\/[^"'\s<>\\)]*)/ },
  { key: 'eightfold', adapter: 'eightfold', pattern: /([a-z0-9.-]*eightfold\.ai|explore\.jobs\.[a-z0-9.-]+)/i },
  { key: 'oracle_orc', adapter: 'oracle_orc', pattern: /([a-z0-9-]+\.fa\.[a-z0-9.]*oraclecloud\.com)/i },
  { key: 'smartrecruiters', adapter: null, pattern: /smartrecruiters\.com\/([A-Za-z0-9]+)/ },
  { key: 'successfactors', adapter: null, pattern: /(career\d*\.successfactors\.[a-z]+)/i },
  { key: 'avature', adapter: null, pattern: /([a-z0-9-]+)\.avature\.net/i },
  { key: 'teamtailor', adapter: null, pattern: /([a-z0-9-]+)\.teamtailor\.com/i },
  { key: 'recruitee', adapter: null, pattern: /([a-z0-9-]+)\.recruitee\.com/i },
  { key: 'personio', adapter: null, pattern: /([a-z0-9-]+)\.jobs\.personio\.[a-z]+/i },
  { key: 'comeet', adapter: null, pattern: /comeet\.co\/careers-api\/2\.0\/company\/([^/"']+)/i },
  { key: 'pinpoint', adapter: null, pattern: /([a-z0-9-]+)\.pinpointhq\.com/i },
  { key: 'beapplied', adapter: null, pattern: /app\.beapplied\.com\/org\/([a-z0-9-]+)/i },
  { key: 'radancy', adapter: null, pattern: /(talentbrew|radancy)\.com/i },
  { key: 'phenom', adapter: null, pattern: /phenompeople|phenom\.com/i },
  { key: 'icims', adapter: null, pattern: /([a-z0-9-]+)\.icims\.com/i },
  { key: 'taleo', adapter: null, pattern: /([a-z0-9-]+)\.taleo\.net/i },
]

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

/**
 * @param {object}  input
 * @param {string}  input.company     display name, e.g. "Marks & Spencer"
 * @param {string} [input.domain]     e.g. "marksandspencer.com"
 * @param {string} [input.careersUrl] the careers page, typed by an admin. Tried
 *                                    before the guessed URLs, and the reason a
 *                                    company whose board is not at a
 *                                    conventional address can still be found.
 * @param {string[]} [input.aliases]  extra spellings to try as tokens
 * @param {object}  [input.market]    a job_markets row; used to score in-market hits
 * @returns {Promise<{company, domain, denied, vendors, candidates, notes}>}
 */
export async function discoverBoards({
  company,
  domain = null,
  careersUrl = null,
  aliases = [],
  market = null,
} = {}) {
  // A typed careers URL is also a domain hint. Companies added by name alone
  // often have no `domain` yet, and every stage below needs one.
  const effectiveDomain = domain || (careersUrl ? registrableDomain(careersUrl) : null)

  const result = {
    company,
    domain: effectiveDomain,
    careersUrl,
    denied: null,
    vendors: [],       // every vendor fingerprinted, adapter or not
    candidates: [],    // verified, ready to seed
    notes: [],
  }

  // Both, because a careers URL can point somewhere the company domain does not
  // — jobs.apple.com is denied even if `domain` is blank or something else.
  const denial = denialFor(effectiveDomain) || denialFor(careersUrl)
  if (denial) {
    result.denied = denial
    return result
  }

  const pages = await fetchCareersPages(effectiveDomain, result.notes, careersUrl)
  const html = pages.join('\n')

  // --- stage 0: fingerprint -------------------------------------------------
  for (const vendor of VENDORS) {
    const match = html.match(vendor.pattern)
    if (!match) continue
    result.vendors.push({ vendor: vendor.key, adapter: vendor.adapter, match: match.slice(1).filter(Boolean) })
  }

  // --- stages 1-3: turn fingerprints into verified config -------------------
  for (const vendor of result.vendors) {
    if (!vendor.adapter) continue
    try {
      const candidate = await buildCandidate(vendor, { company, domain: effectiveDomain, market })
      if (candidate) result.candidates.push(candidate)
    } catch (error) {
      result.notes.push(`${vendor.vendor}: ${error.message}`)
    }
  }

  // Workday tenants are frequently NOT linked from the careers landing page —
  // Roche fronts its Workday board with a Phenom search UI, so the fingerprint
  // finds "phenom" and nothing usable. Probing the tenant directly is the only
  // way to reach those, and it is cheap because Workday distinguishes "no such
  // tenant" from "wrong site" (see workdayTenantProbe).
  if (!result.candidates.some(c => c.source === 'workday')) {
    try {
      const candidate = await workdayTenantProbe({ company, domain: effectiveDomain, aliases, market, notes: result.notes })
      if (candidate) result.candidates.push(candidate)
    } catch (error) {
      result.notes.push(`workday probe: ${error.message}`)
    }
  }

  // Eightfold hosts are conventional enough to probe directly, which matters
  // because Netflix's robots.txt disallows crawling — so the careers-page
  // fingerprint never runs and the board would otherwise be invisible. These
  // are documented JSON API calls, not crawling, so the robots rule that stops
  // the fingerprint does not apply to them.
  if (!result.candidates.length && effectiveDomain) {
    try {
      const candidate = await eightfoldHostProbe({ company, domain: effectiveDomain, market })
      if (candidate) result.candidates.push(candidate)
    } catch (error) {
      result.notes.push(`eightfold probe: ${error.message}`)
    }
  }

  // Two fallbacks, in order of how much they tell us.
  //
  // The JSON-LD route is vendor-agnostic and works wherever a careers site
  // publishes schema.org JobPosting — which is how British Airways is covered
  // despite Radancy having no adapter of its own. It runs even when a vendor
  // WAS fingerprinted, as long as that vendor had no adapter, because a
  // recognised-but-unsupported vendor is exactly the case it exists for.
  if (result.candidates.length === 0 && effectiveDomain) {
    try {
      const candidate = await jsonldCandidate({
        company, domain: effectiveDomain, careersUrl, market, notes: result.notes,
      })
      if (candidate) result.candidates.push(candidate)
    } catch (error) {
      result.notes.push(`jsonld: ${error.message}`)
    }
  }

  // Token guessing is the last resort, because a fingerprint is both cheaper
  // and correct where a guess is neither.
  if (result.candidates.length === 0) {
    const guesses = await guessTokens({ company, domain: effectiveDomain, aliases, market, notes: result.notes })
    result.candidates.push(...guesses)
  }

  result.candidates.sort((a, b) => (b.marketJobs - a.marketJobs) || (b.totalJobs - a.totalJobs))
  return result
}

// ---------------------------------------------------------------------------
// stage 0
// ---------------------------------------------------------------------------

/**
 * Fetch whatever pages might carry a vendor marker.
 *
 * `careersUrl` is an admin-typed URL and goes first — it is the only input that
 * can reach a board at an unconventional address, which is most of the ones
 * still uncovered. The four guesses stay as a fallback because they are right
 * for the majority of companies and cost nothing to try.
 *
 * Robots is checked per-origin rather than once. A typed URL is frequently on a
 * different host from the company domain (careers.bbc.co.uk vs bbc.co.uk), and
 * the two can have completely different rules.
 */
async function fetchCareersPages(domain, notes, careersUrl = null) {
  const host = domain ? registrableDomain(domain) : null
  const urls = []

  if (careersUrl) urls.push(careersUrl)
  if (host) {
    urls.push(
      `https://careers.${host}/`,
      `https://www.${host}/careers`,
      `https://jobs.${host}/`,
      `https://www.${host}/jobs`,
    )
  }
  if (!urls.length) return []

  const pages = []
  const robotsCache = new Map()

  for (const url of urls) {
    let origin
    try {
      origin = new URL(url).origin
    } catch {
      notes.push(`skipped "${url}" — not a valid URL`)
      continue
    }

    if (!robotsCache.has(origin)) robotsCache.set(origin, await robotsAllows(origin))
    if (!robotsCache.get(origin)) {
      // Only worth saying out loud for the typed URL. For a guessed one it is
      // noise — the admin never asked for that address to be tried.
      if (url === careersUrl) {
        notes.push(`robots.txt on ${origin} disallows crawling — skipped the careers URL you gave`)
      }
      continue
    }

    try {
      const res = await http.get(url, { responseType: 'text' })
      if (res.status >= 200 && res.status < 300 && typeof res.data === 'string') {
        pages.push(res.data)
        // One good page is enough to fingerprint; the rest are fallbacks for
        // sites that redirect a careers subdomain to a marketing page.
        if (/greenhouse|lever|ashby|workable|myworkdayjobs|eightfold|oraclecloud|successfactors|avature/i.test(res.data)) {
          break
        }
      } else if (url === careersUrl) {
        notes.push(`careers URL returned HTTP ${res.status}`)
      }
    } catch (error) {
      // A careers subdomain that does not exist is the common case, not an
      // error. A typed URL that does not load is worth reporting, though —
      // otherwise a typo reads as "this company has no board".
      if (url === careersUrl) notes.push(`careers URL could not be fetched: ${error.message}`)
    }
  }
  return pages
}

/** Conservative robots check: only the paths we actually fetch, only global rules. */
async function robotsAllows(origin) {
  try {
    const res = await http.get(`${origin}/robots.txt`, { responseType: 'text' })
    if (res.status !== 200 || typeof res.data !== 'string') return true

    // Only the `User-agent: *` block matters — we are not a named crawler.
    const block = res.data.split(/user-agent:/i).find(s => s.trim().startsWith('*'))
    if (!block) return true

    const disallows = [...block.matchAll(/^\s*disallow:\s*(\S*)/gim)].map(m => m[1])
    // A bare "Disallow: /" is a blanket refusal. Anything narrower is about
    // paths we do not touch.
    return !disallows.includes('/')
  } catch {
    return true
  }
}

// ---------------------------------------------------------------------------
// stages 1-3
// ---------------------------------------------------------------------------

async function buildCandidate(vendor, { company, domain, market }) {
  switch (vendor.adapter) {
    case 'workday': return workdayCandidate(vendor, { company, market })
    case 'eightfold': return eightfoldCandidate(vendor, { company, domain, market })
    case 'oracle_orc': return orcCandidate(vendor, { company, market })
    default: return tokenCandidate(vendor.adapter, vendor.match[0], { company, market })
  }
}

/**
 * Workday: derive tenant/instance/site, then READ the location facet GUIDs out
 * of the tenant's own response.
 *
 * The facets are the whole reason this function is worth having. Roche's board
 * is 1,191 requisitions worldwide and 9 in the UK; without the facet every run
 * pages through all 1,191 and throws the rest away at the market filter. The
 * ids are per-tenant GUIDs, so they are read here and stored in params — they
 * can never be hardcoded or shared between boards.
 */
async function workdayCandidate(vendor, { company, market }) {
  const [tenant, instance, third] = vendor.match
  // From the tenant probe the third capture is already the site name; from the
  // careers-page fingerprint it is the whole URL path.
  const site = third?.startsWith('/') ? workdaySiteFromPath(third) : third
  if (!tenant || !site) return null

  const base = `https://${tenant}.wd${instance || 1}.myworkdayjobs.com/wday/cxs/${tenant}/${site}`
  const probe = async appliedFacets => {
    const res = await http.post(`${base}/jobs`,
      { appliedFacets, limit: 20, offset: 0, searchText: '' },
      { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } })
    return res.status === 200 && res.data?.total != null ? res.data : null
  }

  const unfiltered = await probe({})
  if (!unfiltered) return null

  // Facets arrive nested (locationMainGroup wraps locations), and the nesting
  // depth differs between tenants — hence the recursive walk rather than an
  // index into a known shape.
  const facetValues = collectFacets(unfiltered.facets)
  const location = chooseLocationFacet(facetValues, market)
  const postedOn = facetValues
    .filter(f => f.parameter === 'postedOn' && /last 30 days/i.test(f.descriptor))
    .map(f => f.id)

  const applied = {
    ...(location ? { [location.parameter]: location.ids } : {}),
    ...(postedOn.length ? { postedOn } : {}),
  }

  // Verify rather than trust: a facet id that yields nothing is worse than no
  // facet at all, because it turns a working board into a silently empty one.
  let filtered = unfiltered
  if (Object.keys(applied).length) {
    const check = await probe(applied)
    if (check && check.total > 0 && check.total <= unfiltered.total) filtered = check
    else return candidateRow('workday', tenant, company, {
      tenant, wd: Number(instance) || 1, site,
    }, unfiltered.total, 0, ['facet filter returned nothing — seeded unfiltered'])
  }

  const marketJobs = countInMarket(filtered.jobPostings || [], p => p.locationsText, market)

  return candidateRow('workday', tenant, company, {
    tenant,
    wd: Number(instance) || 1,
    site,
    ...(Object.keys(applied).length ? { facets: { [market?.code || 'gb']: applied } } : {}),
  }, filtered.total, marketJobs, describeFacets(facetValues, location, postedOn), Math.ceil(filtered.total / 20))
}

/**
 * Pick the facet that narrows a Workday board to one market.
 *
 * There is no single facet name to look for. Roche calls it `locations`, LSEG
 * exposes `locationCountry` AND `primaryLocation`, others use
 * `locationMainGroup` or `locationHierarchy` — and appliedFacets is keyed by
 * the parameter name, so we have to know which one we chose.
 *
 * A COUNTRY-level facet is strongly preferred where one exists. LSEG's
 * `locationCountry: United Kingdom` is 176 jobs in one clean id; its
 * `primaryLocation` alternative is a dozen building-level ids that between them
 * miss anything newly opened at an address not yet in the list. Country facets
 * are also immune to the city-name collisions that make location_excluders
 * necessary in the first place.
 */
function chooseLocationFacet(facetValues, market) {
  const matchers = market?.location_matchers || []
  const excluders = market?.location_excluders || []
  const marketName = (market?.name || '').toLowerCase()

  const byParameter = new Map()
  for (const facet of facetValues) {
    if (!/location/i.test(facet.parameter)) continue
    if (!matchesMarket(facet.descriptor, matchers, excluders)) continue
    if (!byParameter.has(facet.parameter)) byParameter.set(facet.parameter, [])
    byParameter.get(facet.parameter).push(facet)
  }
  if (!byParameter.size) return null

  const options = [...byParameter.entries()].map(([parameter, values]) => ({
    parameter,
    values,
    // An exact match on the market's own name is what a country facet looks
    // like. Everything else is a city or a building.
    isCountry: values.some(v => v.descriptor.toLowerCase() === marketName),
    reach: values.reduce((sum, v) => sum + (v.count || 0), 0),
  }))

  options.sort((a, b) => (Number(b.isCountry) - Number(a.isCountry)) || (b.reach - a.reach))
  const best = options[0]
  // A country facet is one id by definition; keep only the exact match rather
  // than also sending every city inside it.
  const values = best.isCountry
    ? best.values.filter(v => v.descriptor.toLowerCase() === marketName)
    : best.values

  return { parameter: best.parameter, ids: values.map(v => v.id), values }
}

/**
 * Find a Workday board without a link to follow.
 *
 * Workday hands us a free existence check: posting to a tenant that does not
 * exist returns errorCode HTTP_422, while a tenant that DOES exist with a site
 * name we guessed wrong returns S21. So one request per candidate tenant tells
 * us whether the far more expensive site enumeration is worth running at all —
 * and for most companies the answer is no, at a cost of a handful of requests.
 *
 * Site names cannot be derived: they range from "External" (Mars) to
 * "roche-ext" to "nke" (Nike). The candidate list below covers the conventional
 * ones; genuinely arbitrary names like Nike's are found by the careers-page
 * fingerprint instead, which is why both routes exist.
 */
async function workdayTenantProbe({ company, domain, aliases, market, notes }) {
  const label = registrableDomain(domain || '').split('.')[0]
  const tenants = [...new Set([
    normaliseCompany(company).replace(/\s+/g, ''),
    slugify(company).replace(/-/g, ''),
    label,
    label.replace(/-/g, ''),
    ...aliases.map(a => normaliseCompany(a).replace(/\s+/g, '')),
  ].filter(t => t && t.length > 2))]

  // The instances Workday actually hosts customers on. Ordered by how common
  // they are so the usual case costs one request, not six.
  const INSTANCES = [3, 1, 5, 2, 12, 10]

  const post = async (url, body) => {
    const res = await http.post(url, body, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
    return res.data || {}
  }

  for (const tenant of tenants) {
    for (const wd of INSTANCES) {
      const base = `https://${tenant}.wd${wd}.myworkdayjobs.com/wday/cxs/${tenant}`
      let exists
      try {
        const probe = await post(`${base}/__probe__/jobs`, { appliedFacets: {}, limit: 1, offset: 0, searchText: '' })
        exists = probe.errorCode === 'S21'
      } catch {
        continue   // DNS failure means no such tenant on this instance
      }
      if (!exists) continue

      notes.push(`workday tenant "${tenant}" exists on wd${wd} — enumerating site names`)
      // Ordered by how often each turns up. Nike's site is "nke" and Bloomberg's
      // is equally arbitrary — genuinely unguessable names are found by the
      // careers-page fingerprint instead, which is why both routes exist.
      const consonants = tenant.replace(/[aeiou]/g, '')
      const sites = [...new Set([
        'External', tenant, `${tenant}-ext`, `${tenant}_ext`, `${tenant}External`,
        'Careers', 'careers', `${tenant}Careers`, `${tenant}-careers`, `${tenant}_careers`,
        'ExternalCareers', 'External_Career_Site', 'ExternalCareerSite',
        'Global', 'GlobalCareers', 'jobs', `${tenant}jobs`, `${tenant}-jobs`,
        // Three-letter contractions are a real convention (Nike → "nke").
        consonants.slice(0, 3), consonants.slice(0, 4), tenant.slice(0, 3),
      ].filter(s => s && s.length >= 2))]
      for (const site of sites) {
        const data = await post(`${base}/${site}/jobs`, { appliedFacets: {}, limit: 20, offset: 0, searchText: '' })
        if (data.total == null) continue
        // Reuse the fingerprint path so facet discovery and verification are
        // written once — this function's only job is finding tenant and site.
        return workdayCandidate({ match: [tenant, String(wd), site] }, { company, market })
      }
      notes.push(`workday tenant "${tenant}" found but no site name matched — find it in the careers page URL`)
    }
  }
  return null
}

/**
 * "/nke/job/Beaverton-Oregon/Team-Coach_R-88387" → "nke"
 * "/en-US/roche-ext/job/…"                       → "roche-ext"
 *
 * Workday paths are /{site}/… or /{locale}/{site}/…. A locale is recognised by
 * its shape (xx-XX / xx_XX), never by length — Nike's site is "nke", which any
 * length-based rule mistakes for one.
 */
function workdaySiteFromPath(path) {
  const segments = String(path).split('/').filter(Boolean)
  if (!segments.length) return null
  const first = /^[a-z]{2}[-_][A-Za-z]{2}$/.test(segments[0]) ? segments[1] : segments[0]
  // "job" and "login" are path components under a site, never a site name — if
  // one of them lands here the path was malformed and a guess would be wrong.
  return first && !['job', 'jobs', 'login', 'apply'].includes(first.toLowerCase()) ? first : null
}

function collectFacets(node, out = []) {
  if (Array.isArray(node)) { node.forEach(n => collectFacets(n, out)); return out }
  if (!node || typeof node !== 'object') return out
  if (node.facetParameter && Array.isArray(node.values)) {
    for (const value of node.values) {
      if (value?.id && value?.descriptor) {
        out.push({ parameter: node.facetParameter, id: value.id, descriptor: value.descriptor, count: value.count })
      }
    }
  }
  Object.values(node).forEach(v => collectFacets(v, out))
  return out
}

function describeFacets(all, location, postedIds) {
  const notes = []
  if (location) {
    // Truncated: a building-level facet can run to dozens of ids, and the point
    // of the note is a human sanity-check, not an inventory.
    const shown = location.values.slice(0, 6).map(v => `${v.descriptor} (${v.count})`).join(', ')
    const extra = location.values.length > 6 ? ` +${location.values.length - 6} more` : ''
    notes.push(`${location.parameter}: ${shown}${extra}`)
  } else {
    notes.push('NO in-market location facet found — will fetch the whole global board')
  }
  if (postedIds.length) {
    const label = all.filter(f => postedIds.includes(f.id)).map(f => f.descriptor).join(', ')
    notes.push(`postedOn: ${label}`)
  }
  return notes
}

async function eightfoldCandidate(vendor, { company, domain, market }) {
  const host = vendor.match[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const location = market?.name || 'United Kingdom'

  const res = await http.get(`https://${host}/api/apply/v2/jobs`, {
    params: { domain, start: 0, num: 20, location, sort_by: 'timestamp' },
  })
  if (res.status !== 200 || !res.data?.positions) return null

  const marketJobs = countInMarket(res.data.positions, p => (p.locations || [p.location]).join('; '), market)
  return candidateRow('eightfold', slugify(company), company,
    { host, domain, location }, res.data.count || 0, marketJobs, [])
}

/**
 * Try the conventional Eightfold host names for a brand.
 *
 * Needed because Eightfold customers put their board on a separate domain
 * (Netflix's is explore.jobs.netflix.net) that the main site may never link in
 * a way we can fetch.
 */
async function eightfoldHostProbe({ company, domain, market }) {
  const host = registrableDomain(domain)
  const label = host.split('.')[0]
  const tld = host.split('.').slice(1).join('.')

  const hosts = [...new Set([
    `explore.jobs.${label}.net`,
    `explore.jobs.${host}`,
    `jobs.${host}`,
    `careers.${host}`,
    `${label}.eightfold.ai`,
    `${label}.jobs.${tld}`,
  ])]

  for (const candidateHost of hosts) {
    const vendor = { match: [candidateHost] }
    try {
      const candidate = await eightfoldCandidate(vendor, { company, domain: host, market })
      if (candidate?.totalJobs > 0) return candidate
    } catch {
      // A host that does not resolve is the expected answer for most brands.
    }
  }
  return null
}

async function orcCandidate(vendor, { company, market }) {
  const host = vendor.match[0]
  // Site numbers are near-universally CX_1, but enumerate rather than assume:
  // a wrong site number returns 200 with an empty list, which reads as "this
  // company has no jobs" rather than as a config error.
  for (const siteNumber of ['CX_1', 'CX_2', 'CX_3']) {
    const url =
      `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions` +
      `?onlyData=true&expand=requisitionList.secondaryLocations` +
      `&finder=findReqs;siteNumber=${siteNumber},limit=20,offset=0,sortBy=POSTING_DATES_DESC`
    const res = await http.get(url, { headers: { Accept: 'application/json' } })
    const found = res.status === 200 ? res.data?.items?.[0] : null
    if (!found?.TotalJobsCount) continue

    const marketJobs = countInMarket(found.requisitionList || [], r => r.PrimaryLocation, market)
    return candidateRow('oracle_orc', slugify(company), company,
      { host, siteNumber }, found.TotalJobsCount, marketJobs, [])
  }
  return null
}

/**
 * The four token-based ATSs. Probed by calling the REAL adapter rather than a
 * hand-rolled equivalent, so a probe that passes here is a board that will work
 * at ingest — same headers, same timeouts, same normalisation.
 */
async function tokenCandidate(sourceKey, token, { company, market }) {
  const adapter = ADAPTERS[sourceKey]
  if (!adapter || !token) return null

  const account = { account: token, company, params: {}, markets: [market?.code || 'gb'] }
  const { items } = await adapter.fetchPage({
    market: market || { code: 'gb' },
    account,
    page: 1,
    http,
    limiter: { wait: async () => {} },
    env: process.env,
  })
  if (!items?.length) return null

  const normalised = items
    .map(item => adapter.normalise(item, { market: market || { code: 'gb' }, account }))
    .filter(Boolean)
  const marketJobs = countInMarket(normalised, j => j.locationRaw, market)

  return candidateRow(sourceKey, token, company, {}, normalised.length, marketJobs, [])
}

/**
 * The vendor-agnostic route: a sitemap of advert pages that each carry a
 * schema.org JobPosting block.
 *
 * Worth trying on every company with no adapter-backed board, because Google
 * for Jobs made this near-universal on career sites that care about being
 * found. It is the only route we have to employers on ATSs we do not support,
 * and it needs no vendor-specific knowledge at all.
 *
 * Verified end to end before being offered: sitemap parses, job URLs exist, and
 * a sampled page really does contain a JobPosting with a description. Offering
 * an unverified sitemap would seed a board that silently ingests nothing.
 */
async function jsonldCandidate({ company, domain, careersUrl = null, market, notes }) {
  const host = registrableDomain(domain)
  const jobPath = /\/(job|jobs|vacancy|vacancies|position|positions|opportunity|opportunities)\//i

  // The typed careers URL's own origin goes first. This is the fallback most
  // improved by knowing where the listings actually live: a sitemap only exists
  // at the origin serving the adverts, and for the companies that reach this
  // branch that is rarely careers.{domain}.
  const origins = []
  if (careersUrl) {
    try { origins.push(new URL(careersUrl).origin) } catch { /* validated upstream */ }
  }
  for (const origin of [`https://careers.${host}`, `https://jobs.${host}`, `https://www.${host}`]) {
    if (!origins.includes(origin)) origins.push(origin)
  }

  for (const origin of origins) {
    // Per-origin, because `http` only swallows HTTP status codes — a DNS
    // failure still throws, and most companies have no jobs.{domain}. Letting
    // that propagate abandoned every remaining origin, so a board at
    // www.{domain} was unreachable whenever the jobs. subdomain did not exist.
    try {
      // Sitemaps are big — EY's is 1.6MB — and 45s was still not enough for
      // British Airways on a cold cache. A slow sitemap is not a missing board,
      // and this runs once per company, not per job.
      const res = await http.get(`${origin}/sitemap.xml`, { responseType: 'text', timeout: 90_000 })
      if (res.status !== 200 || typeof res.data !== 'string' || !res.data.includes('<loc>')) continue

      const urls = [...res.data.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => m[1])
      const jobUrls = urls.filter(url => jobPath.test(url))
      if (!jobUrls.length) continue

      const page = await http.get(jobUrls[0], { responseType: 'text', timeout: 30_000 })
      const posting = typeof page.data === 'string' ? findJobPosting(page.data) : null
      if (!posting?.description) {
        notes.push(`${origin}: sitemap has ${jobUrls.length} job URLs but no JobPosting JSON-LD on them`)
        continue
      }

      return candidateRow('jsonld', slugify(company), company,
        { sitemapUrl: `${origin}/sitemap.xml`, jobUrlPattern: jobPath.source },
        jobUrls.length,
        // Location is only known per advert here, so the sample of one is the
        // honest answer rather than a guess extrapolated over the board.
        matchesMarket(sampleLocation(posting), market?.location_matchers || [], market?.location_excluders || []) ? 1 : 0,
        [`sampled "${posting.title}" — ${String(posting.description).length} chars of description`],
        Math.ceil(jobUrls.length / 100))
    } catch (error) {
      // Only worth a note for the origin the admin chose. The three guessed
      // ones failing to resolve is the normal case, not a finding.
      if (careersUrl && origin === origins[0]) {
        notes.push(`no sitemap under ${origin}: ${error.message}`)
      }
    }
  }
  return null
}

function findJobPosting(html) {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, ''))
      const list = Array.isArray(parsed) ? parsed : [parsed, ...(parsed['@graph'] || [])]
      const posting = list.find(entry => entry?.['@type'] === 'JobPosting')
      if (posting) return posting
    } catch {
      // A malformed block must not hide a valid one later on the page.
    }
  }
  return null
}

function sampleLocation(posting) {
  const places = Array.isArray(posting.jobLocation) ? posting.jobLocation : [posting.jobLocation]
  return places
    .map(place => {
      const address = place?.address || {}
      return [address.addressLocality, address.addressCountry?.name || address.addressCountry]
        .filter(Boolean).join(', ')
    })
    .join('; ')
}

/** Slug candidates, tried only when the careers page yielded no fingerprint. */
async function guessTokens({ company, domain, aliases, market, notes }) {
  const label = registrableDomain(domain || '').split('.')[0]
  const tokens = [...new Set([
    slugify(company),
    slugify(company).replace(/-/g, ''),
    normaliseCompany(company).replace(/\s+/g, ''),
    label,
    label.replace(/-/g, ''),
    ...aliases.map(slugify),
  ].filter(Boolean))]

  const found = []
  for (const sourceKey of ['greenhouse', 'lever', 'ashby', 'workable']) {
    for (const token of tokens) {
      try {
        const candidate = await tokenCandidate(sourceKey, token, { company, market })
        if (candidate) { found.push(candidate); break }
      } catch {
        // 404 for a guessed token is the expected answer, not a failure.
      }
    }
  }
  if (!found.length) notes.push(`no board found by fingerprint or token guess (tried: ${tokens.join(', ')})`)
  return found
}

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

function candidateRow(source, account, company, params, totalJobs, marketJobs, notes, maxPages = 1) {
  return { source, account, company, params, totalJobs, marketJobs, maxPages, notes }
}

function countInMarket(items, getLocation, market) {
  const matchers = market?.location_matchers || []
  if (!matchers.length) return 0
  return items.filter(item => matchesMarket(getLocation(item), matchers, market?.location_excluders || [])).length
}

/** "https://www.marksandspencer.com/x" → "marksandspencer.com" */
export function registrableDomain(input) {
  return String(input || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .toLowerCase()
}

/** A paste-ready INSERT for the Supabase SQL editor, matching repo convention. */
export function toSql(rows) {
  if (!rows.length) return '-- nothing to insert'

  const values = rows.map(row => {
    // The note goes ABOVE the tuple, never after it: values are joined with
    // ",\n", so a trailing comment would swallow its own separating comma and
    // the whole statement would fail to parse.
    const comment = row.notes?.length
      ? `  -- ${row.notes.join(' | ').replace(/\n/g, ' ')}\n`
      : ''
    return `${comment}  ('${row.source}', '${sqlEscape(row.account)}', '${sqlEscape(row.company)}', ` +
      `'${sqlEscape(row.companyNorm || normaliseCompany(row.company))}', ARRAY['${row.market || 'gb'}'], ` +
      `true, ${row.maxPages || 1}, ${row.domain ? `'${sqlEscape(row.domain)}'` : 'null'}, ` +
      `'${sqlEscape(JSON.stringify(row.params || {}))}'::jsonb)`
  })

  return [
    'INSERT INTO public.job_source_accounts',
    '  (source, account, company, company_norm, markets, enabled, max_pages, domain, params)',
    'VALUES',
    values.join(',\n'),
    'ON CONFLICT (source, account) DO UPDATE SET',
    '  company = EXCLUDED.company, company_norm = EXCLUDED.company_norm,',
    '  markets = EXCLUDED.markets, max_pages = EXCLUDED.max_pages,',
    '  domain = EXCLUDED.domain, params = EXCLUDED.params;',
  ].join('\n')
}

function sqlEscape(value) {
  return String(value ?? '').replace(/'/g, "''")
}
