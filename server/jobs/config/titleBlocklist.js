/**
 * Titles we never want on the board, regardless of how well they map.
 *
 * Two categories:
 *  - Roles that are not employment in the sense a learner means (commission-only
 *    sales, franchise buy-ins, MLM, "be your own boss").
 *  - Recruiter-side noise: talent-pool registrations and speculative adverts that
 *    are not an actual vacancy.
 *
 * Anything matching drops at ingest and is counted as `title_blocked` in
 * job_ingest_runs.dropped.
 */

export const TITLE_BLOCKLIST = [
  // Not a salaried job
  /commission[\s-]only/i,
  /\bfranchise\b/i,
  /\bself[\s-]employed\b/i,
  /be your own boss/i,
  /work from home opportunity/i,
  /earn (up to )?[£$€]\s*[\d,]+\s*(per|a)\s*(week|day)/i,
  /\bmlm\b/i,
  /network marketing/i,
  /\bdistributor opportunity\b/i,
  /no experience necessary.*earn/i,

  // Not an actual vacancy
  /talent (pool|pipeline|community|network)/i,
  /speculative application/i,
  /register your interest/i,
  /expression of interest/i,
  /future opportunit/i,
  /general application/i,
  /^open application/i,
  /\bcv library\b/i,

  // Test/placeholder postings that occasionally leak from ATS sandboxes
  /^test\s+(job|role|position)/i,
  /\bdo not apply\b/i,
  /\[?\s*template\s*\]?$/i,
]

export function isBlockedTitle(title) {
  const t = String(title || '')
  return TITLE_BLOCKLIST.some(pattern => pattern.test(t))
}
