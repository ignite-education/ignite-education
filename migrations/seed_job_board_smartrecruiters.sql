-- SmartRecruiters as a job source.
--
-- The public Posting API: unauthenticated, vendor-documented, and the largest
-- remaining entry in the VENDORS fingerprint table in server/jobs/lib/discover.js
-- that had no adapter behind it. Discovery has always been able to recognise a
-- SmartRecruiters careers site and has always had to report a dead end; with
-- the adapter registered it now derives a working board instead.
--
-- No boards are seeded here. `account` is just the company identifier from the
-- careers URL (jobs.smartrecruiters.com/<identifier>) and needs no params, so
-- boards come from discovery once an employer on this vendor is allowlisted:
--
--   node scripts/discover-job-boards.mjs --company "Name" --domain example.com --sql
--
-- Ships DISABLED, like every source seed here. Verify first:
--
--   node scripts/run-job-ingest.mjs --dry-run --sources smartrecruiters --markets gb
--   -- then flip `enabled` in the admin Sources tab
--
-- Safe to re-run.

/* -------------------------------------------------------------------------- */
/* 1. The source                                                               */
/* -------------------------------------------------------------------------- */

INSERT INTO public.job_sources
  (key, name, kind, enabled, trust_level,
   rate_per_minute, rate_per_day, rate_per_week, rate_per_month,
   min_delay_ms, max_age_days, attribution, notes)
VALUES
  -- Rate caps null: a public endpoint with no published quota, so getAllowance()
  -- returns Infinity and min_delay_ms is the only politeness lever. 400 rather
  -- than the startup ATSs' 300 because this is two-phase and spends one request
  -- per new job on top of the list call.
  --
  -- attribution required:false — a direct employer feed is ours to display. Only
  -- syndicated inventory carries an obligation; see SourceAttribution.tsx.
  ('smartrecruiters', 'SmartRecruiters', 'ats', false, 'auto',
   null, null, null, null, 400, 45, '{"required":false}'::jsonb,
   'GET https://api.smartrecruiters.com/v1/companies/{id}/postings — public Posting API, two-phase (jobAd.sections on the detail record holds the advert; the list carries none). TRAP: the country filter is a LOWERCASE ALPHA-2 code and fails silently. country=gb returns the UK board; country=uk, country=GB and country=United Kingdom all return HTTP 200 with totalFound: 0, which reads exactly like an employer with no UK vacancies. Same class of trap as Amazon''s country[]=GBR. The value is read from job_markets.source_params.smartrecruiters.country and falls back to the market code, which is already the lowercase alpha-2 this API wants. limit caps at 100. Filtering by country server-side is what makes the source affordable: Bosch publishes 4,783 postings worldwide and 33 in the UK, and every one not filtered out in the request would cost a detail fetch to reject.')

ON CONFLICT (key) DO UPDATE
  SET name          = EXCLUDED.name,
      kind          = EXCLUDED.kind,
      min_delay_ms  = EXCLUDED.min_delay_ms,
      max_age_days  = EXCLUDED.max_age_days,
      attribution   = EXCLUDED.attribution,
      notes         = EXCLUDED.notes;
      -- enabled and trust_level deliberately not overwritten: re-running the
      -- seed must not switch a source an admin has turned off back on.


/* -------------------------------------------------------------------------- */
/* 2. The market's country parameter                                           */
/* -------------------------------------------------------------------------- */

-- Adding a country stays a config change rather than a deploy, which is the
-- whole point of source_params. Merged rather than replaced so the existing
-- reed/adzuna keys survive.
UPDATE public.job_markets
SET source_params = COALESCE(source_params, '{}'::jsonb)
                    || '{"smartrecruiters": {"country": "gb"}}'::jsonb
WHERE code = 'gb';
