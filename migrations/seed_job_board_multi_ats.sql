-- Enterprise ATS sources for the job board.
--
-- Greenhouse, Lever, Ashby and Workable are startup ATSs. They cover the tech
-- companies on the allowlist and essentially none of the large brands, which is
-- why 27 of 38 allowlisted companies had no source at all. These four keys are
-- the routes to the rest.
--
-- Every endpoint below was probed live before being seeded, the same standard
-- seed_job_board_ats_accounts.sql set.
--
-- ⚠️ ALL FOUR SHIP DISABLED, and enabled = false is the ONLY real safety gate
-- here. It is tempting to seed them trust_level = 'review' instead so the first
-- night's intake lands in the approval queue — that does nothing. buildRow() in
-- lib/persist.js auto-approves when EITHER the source OR the company is trusted
-- 'auto', and every allowlisted company is seeded 'auto'. So a newly enabled
-- source publishes straight to the public board. Dry-run first:
--
--   node scripts/run-job-ingest.mjs --dry-run --sources workday --markets gb
--
-- then set enabled = true in the admin Sources tab.
--
-- Safe to apply before the adapter code deploys: an unknown source key is
-- skipped with a warning rather than crashing the run (see index.js, and
-- `himalayas` which has been seeded without an adapter from the start).
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- Depends on: migrations/add_job_board_multi_ats.sql.

INSERT INTO public.job_sources
  (key, name, kind, enabled, trust_level,
   rate_per_minute, rate_per_day, rate_per_week, rate_per_month,
   min_delay_ms, max_age_days, attribution, notes)
VALUES

  -- Rate caps are deliberately null on all four: these are unmetered public
  -- endpoints with no published quota, so getAllowance() returns Infinity and
  -- fitToBudget() passes everything through. min_delay_ms is the politeness
  -- lever instead, and it is set higher than the startup ATSs because these
  -- sources make one request PER JOB for descriptions, not one per board.

  ('workday', 'Workday', 'ats', false, 'auto',
   null, null, null, null, 400, 45, '{"required":false}'::jsonb,
   'CXS API: POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs. Two-phase — the list carries no description, so each job costs a second GET. limit is CAPPED AT 20 (asking for 100 returns zero rows, not an error). params needs tenant/wd/site plus per-market location facet GUIDs, which are per-tenant and must be read from the tenant''s own facets array — scripts/discover-job-boards.mjs does that. Without the facets a fetch pulls the whole global board: Roche is 1,191 requisitions worldwide and 9 in the UK.'),

  ('eightfold', 'Eightfold', 'ats', false, 'auto',
   null, null, null, null, 400, 45, '{"required":false}'::jsonb,
   'GET https://{host}/api/apply/v2/jobs?domain={domain} — Netflix and a long tail of large employers. Two-phase: the list response DOES include a job_description key but it is always the empty string; only /jobs/{id} fills it. The location parameter is a fuzzy geo search rather than a filter, so matchesMarket still has work to do.'),

  ('oracle_orc', 'Oracle Recruiting Cloud', 'ats', false, 'auto',
   null, null, null, null, 400, 45, '{"required":false}'::jsonb,
   'GET {host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?finder=findReqs;siteNumber={site} — large UK retail and professional services. Two-phase; the advert text is ExternalDescriptionStr on the details resource. sortBy=POSTING_DATES_DESC means page one is the newest jobs, which under the 21-day board cut is usually all we can use out of a 700-job board.'),

  ('jsonld', 'Careers site (JobPosting)', 'ats', false, 'auto',
   null, null, null, null, 500, 45, '{"required":false}'::jsonb,
   'Vendor-agnostic: any careers site publishing schema.org JobPosting JSON-LD, discovered through its sitemap. British Airways (Radancy) today. The most durable adapter here because the format is a published standard rather than a vendor''s internals. Two-phase and extremely so — a work item starts as nothing but a URL, so the pre-hydration title is derived from the URL slug purely to run the cheap title gates. params needs sitemapUrl and jobUrlPattern.')

ON CONFLICT (key) DO UPDATE
  SET name          = EXCLUDED.name,
      kind          = EXCLUDED.kind,
      min_delay_ms  = EXCLUDED.min_delay_ms,
      max_age_days  = EXCLUDED.max_age_days,
      attribution   = EXCLUDED.attribution,
      notes         = EXCLUDED.notes;
      -- enabled and trust_level deliberately not overwritten: re-running the
      -- seed must not switch a source an admin has turned off back on.
