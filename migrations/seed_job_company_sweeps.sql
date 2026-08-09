-- Aggregator fallback: one company sweep per allowlisted brand with no board.
--
-- The ATS tier covers the companies whose careers site we can reach. It cannot
-- cover the rest, and eight of those are deliberate — Apple, Google, Microsoft,
-- Meta, TikTok, Uber, LinkedIn and JD.com all block automated access to their
-- own job data, and we do not build workarounds for that. Where an employer has
-- CHOSEN to syndicate to Adzuna or Reed, though, we can read it there, which is
-- what these rows do.
--
-- ── HOW A COMPANY SWEEP WORKS ────────────────────────────────────────────────
-- Adzuna has no company filter, so the query is a free-text search for the
-- brand name and THE ALLOWLIST DOES THE EXACT MATCHING. A recruitment agency
-- advertising "an exciting role with Marks & Spencer" carries the AGENCY as
-- company.display_name, so it is dropped as company_not_allowed at
-- server/jobs/index.js. That is the design, not a happy accident: it is why
-- turning the aggregators on is safe now and was not before.
--
-- Aliases matter here and only here. ATS boards take their company name from
-- job_source_accounts.company, which we control; an aggregator reports whatever
-- the employer typed. Add spellings in the admin Companies tab.
--
-- ── WHY THESE ARE NOT SCOPED PER PROFESSION ──────────────────────────────────
-- 15 companies x 8 specialisms would be 120 calls a day and would blow Adzuna's
-- 2,500/month cap on its own. profession is therefore NULL, which the
-- orchestrator already handles — it simply forgoes the +3 query-scope bonus in
-- mapProfession. The 8-specialism gate still applies to every row that comes
-- back, exactly as before.
--
-- ── BUDGET ───────────────────────────────────────────────────────────────────
--   existing profession queries   24/day    720/month
--   company sweeps (~15 x 1 page) 15/day    450/month
--   total                         39/day  1,170/month   against a 2,500 cap
--
-- fitToBudget() preserves insertion order, so these are inserted AFTER the
-- profession queries in seed_job_board_config.sql: if the budget ever bites,
-- specialism coverage survives and the company sweeps degrade first.
--
-- ⚠️ BEFORE ENABLING THE SOURCE
--   1. ADZUNA_APP_ID / ADZUNA_APP_KEY must be set (self-serve at
--      developer.adzuna.com) — and REED_API_KEY for the Reed rows, which needs
--      a recruiter account and a conversation with Reed.
--   2. Attribution is contractual. Every Adzuna advert on the board must carry
--      the "Jobs by Adzuna" logo at >=116x23px and estimated salaries need the
--      Jobsworth icon. SourceAttribution.tsx renders it from job_sources.
--      attribution — verify it on a live card the day you switch this on.
--   3. Dry-run first:
--        node scripts/run-job-ingest.mjs --dry-run --sources adzuna --markets gb
--      Expect dropped.company_not_allowed to be HUGE. That is the allowlist
--      doing its job against aggregator volume, not a fault.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- Depends on: migrations/add_job_board_multi_ats.sql (nullable profession,
--             job_queries.company_norm, NULLS NOT DISTINCT unique constraint).

/* -------------------------------------------------------------------------- */
/* 1. Adzuna sweeps for every allowed company with no enabled board            */
/* -------------------------------------------------------------------------- */

INSERT INTO public.job_queries
  (source, market, profession, label, company_norm, params, max_pages, enabled)
SELECT
  'adzuna',
  'gb',
  NULL,
  'company:' || c.name_norm,
  c.name_norm,
  jsonb_build_object(
    'what', c.display_name,
    -- No title_only: the search term is the employer, not the role, so it has
    -- to match the company field and the body too.
    'max_days_old', 7,
    'results_per_page', 50,
    'sort_by', 'date'
  ),
  1,
  -- Seeded ENABLED but the adzuna source itself is disabled, so nothing runs
  -- until someone turns the source on deliberately.
  true
FROM public.job_companies c
WHERE c.allowed
  AND NOT EXISTS (
    SELECT 1 FROM public.job_source_accounts a
    WHERE a.company_norm = c.name_norm AND a.enabled
  )
ON CONFLICT (source, market, profession, label) DO UPDATE SET
  company_norm = EXCLUDED.company_norm,
  params       = EXCLUDED.params,
  max_pages    = EXCLUDED.max_pages;

/* -------------------------------------------------------------------------- */
/* 2. Reed sweeps — same set, applied only when a Reed key exists              */
/* -------------------------------------------------------------------------- */

-- Reed is UK-only and its `graduate` boolean is the best native entry-level
-- signal available to us, which is why it is worth the non-self-serve key.
-- Seeded disabled: unlike Adzuna these add nothing until REED_API_KEY is set,
-- and a query row that 401s every night is noise in job_ingest_runs.
INSERT INTO public.job_queries
  (source, market, profession, label, company_norm, params, max_pages, enabled)
SELECT
  'reed', 'gb', NULL, 'company:' || c.name_norm, c.name_norm,
  -- results_per_page, not resultsToTake: the adapter reads the shared key name
  -- and maps it onto Reed's parameter itself (sources/reed.js).
  jsonb_build_object('keywords', c.display_name, 'results_per_page', 50),
  1,
  false
FROM public.job_companies c
WHERE c.allowed
  AND NOT EXISTS (
    SELECT 1 FROM public.job_source_accounts a
    WHERE a.company_norm = c.name_norm AND a.enabled
  )
ON CONFLICT (source, market, profession, label) DO UPDATE SET
  company_norm = EXCLUDED.company_norm,
  params       = EXCLUDED.params;

/* -------------------------------------------------------------------------- */
/* 3. Check what you just created                                              */
/* -------------------------------------------------------------------------- */

--   SELECT source, count(*) FILTER (WHERE enabled) AS enabled, count(*) AS total
--   FROM public.job_queries WHERE company_norm IS NOT NULL GROUP BY source;
--
-- And the daily call budget the enabled ones imply:
--   SELECT source, sum(max_pages) AS calls_per_day
--   FROM public.job_queries WHERE enabled GROUP BY source;
