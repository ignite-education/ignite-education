/**
 * The company key contract for the job board.
 *
 * `normaliseCompany()` decides whether a job's employer matches an allowlisted
 * brand, and the allowlist is the gate that decides whether the job exists at
 * all (server/jobs/index.js, filter step 3). A key that does not match is a
 * company that silently never ingests — so this function must be byte-identical
 * everywhere it runs.
 *
 * It runs in three places, and this file is only two of them:
 *
 *   1. The ingest pipeline — server/jobs/lib/normalise.js re-exports from here.
 *   2. The admin app — admin-app/src/pages/JobsManagement.jsx imports it as
 *      `@shared/jobs/companyKey.js` when adding a company, so the key it writes
 *      to job_companies.name_norm is the key the pipeline will look for.
 *   3. ⚠️ Postgres — the `job_listings_on_review` trigger in
 *      migrations/create_job_board_tables.sql builds an md5 rejection
 *      fingerprint from the same normalisation. That copy CANNOT import this
 *      one. Change either and you must change both, or a rejected job comes
 *      back the next night under a fingerprint that no longer matches.
 *
 * Lives in shared/ rather than in the server tree because shared/ is the one
 * directory both Vite apps alias (`@shared`) and Node can reach by relative
 * path. Its documented rule is "may import React and nothing else" — these are
 * pure string functions, so they qualify.
 */

const COMPANY_SUFFIXES =
  /\b(ltd|limited|inc|incorporated|plc|llp|llc|gmbh|group|holdings|international|uk|recruitment|resourcing|consultancy|consulting|staffing|solutions|services|associates|partners)\b/g

/**
 * Normalised company key used for the allowlist, the block key, trust lookups
 * and rejection fingerprints.
 */
export function normaliseCompany(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip combining accents
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(COMPANY_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Mirrors public.slugify() in SQL: lowercase, non-alphanumerics to hyphens, trimmed. */
export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
