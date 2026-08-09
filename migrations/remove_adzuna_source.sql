-- Remove Adzuna as a job source.
--
-- Adzuna's free API is conditional on attribution: a "Jobs by Adzuna" logo at
-- >=116x23px on every displayed advert, linked to adzuna.co.uk, plus a Jobsworth
-- icon on estimated salaries. That badge is not something we want on the board,
-- and their data is not available without it — so the source goes rather than
-- the attribution. Using the feed with the badge removed would breach the terms
-- the key was issued under.
--
-- WHAT THIS COSTS, recorded so the decision can be revisited knowingly. Measured
-- on a live dry run of all 36 queries: 706 fetched, 642 dropped by the allowlist,
-- 7 new listings per day.
--
--   * The only route to the eight ToS-blocked brands. Apple, Google, Microsoft,
--     Meta, TikTok, Uber, LinkedIn and JD.com block automated access to their
--     own careers APIs, so syndication was the one legitimate way to reach them.
--     They stay allowlisted and will now never produce a listing.
--   * The only route to Bloomberg and the Tony Blair Institute until an Avature
--     adapter exists or their careers URLs resolve to something supported.
--   * THREE SPECIALISMS LOSE THEIR ONLY SOURCE. Adzuna operates the DWP's Find
--     a Job service, so it is the only feed here that reaches non-tech roles.
--     Healthcare Assistant, Mental Health Worker and Green Energy Technician are
--     at zero listings and stay there — no ATS board on the allowlist posts them.
--     Those three profession pages therefore stay noindex and out of the sitemap,
--     because getProfessionsWithJobs gates both on having listings.
--
-- Reed is left in place but is NOT a replacement: it carries the same
-- "Powered by reed.co.uk" attribution requirement. Every ATS source requires
-- nothing, which is the real distinction — a direct employer feed is ours to
-- display, syndicated inventory is not.
--
-- Apply in the Supabase SQL editor. Safe to re-run.

/* -------------------------------------------------------------------------- */
/* 1. What will be removed                                                     */
/* -------------------------------------------------------------------------- */

--   SELECT count(*) FILTER (WHERE company_norm IS NOT NULL) AS company_sweeps,
--          count(*) FILTER (WHERE company_norm IS NULL)     AS profession_queries
--   FROM public.job_queries WHERE source = 'adzuna';
--   -- 20 company sweeps, 16 profession queries when written


/* -------------------------------------------------------------------------- */
/* 2. Remove the queries, then the source                                      */
/* -------------------------------------------------------------------------- */

DELETE FROM public.job_queries WHERE source = 'adzuna';

DELETE FROM public.job_sources WHERE key = 'adzuna';


/* -------------------------------------------------------------------------- */
/* 3. Listings already ingested                                                */
/* -------------------------------------------------------------------------- */

-- None exist: Adzuna was never enabled, so it never wrote a row. This is here
-- for the case where it HAD been running — the attribution obligation applies
-- to displayed adverts, so any Adzuna listing must stop being displayed at the
-- same moment the badge does.
--
-- Deliberately an expiry, not a delete: expired rows keep the ingest idempotent
-- and leave an audit trail of what was on the board.
UPDATE public.job_listings
SET status = 'expired', expired_at = NOW()
WHERE (source = 'adzuna' OR display_source = 'adzuna')
  AND status <> 'expired';


/* -------------------------------------------------------------------------- */
/* 4. Verify                                                                   */
/* -------------------------------------------------------------------------- */

--   SELECT key FROM public.job_sources WHERE key = 'adzuna';          -- 0 rows
--   SELECT count(*) FROM public.job_queries WHERE source = 'adzuna';  -- 0
--   SELECT count(*) FROM public.job_listings
--   WHERE source = 'adzuna' AND status <> 'expired';                  -- 0
--
-- Coverage will now show these companies with no source at all. That is the
-- honest state, not a regression — dormant_query_count drops to zero because
-- the dormant queries are gone:
--
--   SELECT display_name FROM public.job_company_coverage()
--   WHERE allowed AND enabled_board_count = 0 AND query_count = 0
--   ORDER BY display_name;
