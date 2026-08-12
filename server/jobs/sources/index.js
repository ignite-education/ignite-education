/**
 * Adapter registry.
 *
 * Every adapter implements the same interface, which is what keeps country
 * expansion a config change rather than a code change:
 *
 *   key             string    matches job_sources.key
 *   supportsMarkets '*' | string[]   markets the source can serve
 *   requiresQuery   boolean   true  → driven by job_queries rows (aggregators)
 *                             false → driven by job_source_accounts rows (ATS)
 *   fetchPage({ market, query, account, page, env, http, limiter })
 *                   → { items, hasMore, apiCalls }
 *   normalise(item, { market, query, account }) → RawJob | null
 *   hydrateOne(raw, { account, market, http, limiter, env })   OPTIONAL
 *                   → Partial<RawJob> | null
 *
 * A RawJob is the single shape everything downstream speaks. See
 * ../lib/persist.js for how it maps onto job_listings columns.
 *
 * ── TWO-PHASE SOURCES ───────────────────────────────────────────────────────
 * Workday, Oracle and a sitemap of JSON-LD pages all return a list with no
 * description in it. Those adapters set `needsDetail: true` on the RawJob and
 * implement `hydrateOne`, which the orchestrator calls — for NEW jobs that
 * passed the cheap title and age gates, and no others — to fill in the
 * description. It returns a PATCH, not a whole RawJob, and a null means "could
 * not hydrate", which makes the orchestrator drop the job rather than persist
 * an empty description over one it already holds.
 *
 * Board config for those sources lives in job_source_accounts.params; `account`
 * stays the one human-meaningful token, because it is written to every listing
 * row as source_account.
 */

import greenhouse from './greenhouse.js'
import lever from './lever.js'
import ashby from './ashby.js'
import workable from './workable.js'
import smartrecruiters from './smartrecruiters.js'
import workday from './workday.js'
import eightfold from './eightfold.js'
import oracleOrc from './oracleOrc.js'
import amazon from './amazon.js'
import jsonld from './jsonld.js'
import reed from './reed.js'

export const ADAPTERS = {
  // ATS boards — public endpoints, full descriptions, direct employers.
  [greenhouse.key]: greenhouse,
  [lever.key]: lever,
  [ashby.key]: ashby,
  [workable.key]: workable,
  // Two-phase but keyed on nothing more than a company identifier, so it sits
  // with the startup ATSs rather than the enterprise tier: its list call filters
  // by country server-side, which keeps a 4,783-posting global board down to the
  // 33 UK ones before any description is fetched.
  [smartrecruiters.key]: smartrecruiters,
  // Enterprise ATSs. Two-phase, config-driven, and the only route to the large
  // brands on the allowlist — Greenhouse/Lever/Ashby/Workable are startup ATSs.
  [workday.key]: workday,
  [eightfold.key]: eightfold,
  [oracleOrc.key]: oracleOrc,
  // In-house ATSs. One employer each and no discovery route to them, so they
  // only exist where the company is worth hand-writing an adapter for.
  [amazon.key]: amazon,
  // Vendor-agnostic: any careers site that publishes schema.org JobPosting.
  [jsonld.key]: jsonld,
  // Aggregators — keyed, rate-limited, snippet descriptions, and the only route
  // to non-tech roles (healthcare, mental health, green energy) and to employers
  // who block automated access to their own careers API.
  //
  // Adzuna was removed: its free API is conditional on a "Jobs by Adzuna" badge
  // on every advert, and we do not want that on the board. Reed carries the same
  // kind of obligation ("Powered by reed.co.uk") and is unkeyed, so the board is
  // ATS-only in practice. See migrations/remove_adzuna_source.sql for what that
  // costs — three specialisms have no other source.
  [reed.key]: reed,
}

export function getAdapter(key) {
  return ADAPTERS[key] || null
}

/** Does this adapter serve this market? */
export function supportsMarket(adapter, marketCode) {
  if (!adapter) return false
  if (adapter.supportsMarkets === '*') return true
  return (adapter.supportsMarkets || []).includes(marketCode)
}
