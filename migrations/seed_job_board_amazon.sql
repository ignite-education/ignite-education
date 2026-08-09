-- Amazon Jobs as a source.
--
-- Amazon was the one allowlisted company with no source of any kind — not even
-- a dormant aggregator query. Discovery cannot find it and never will: the
-- careers page is a JS-rendered SPA with zero job links in its HTML, there is no
-- /sitemap.xml, and the ATS is in-house so there is no vendor marker to
-- fingerprint. Every one of the four discovery routes is genuinely exhausted,
-- which is why this is a hand-written adapter and a hardcoded account row.
--
-- Probed live before seeding, the same standard as every other source here:
--   GET https://www.amazon.jobs/en/search.json?normalized_country_code[]=GBR
--   → HTTP 200, 818 UK jobs, full descriptions inline (single-phase).
--
-- robots.txt on www.amazon.jobs disallows only /internal. Amazon is NOT on the
-- DENYLIST in server/jobs/lib/discover.js — unlike Apple, Google, Microsoft,
-- Meta, TikTok, Uber, LinkedIn and JD.com, it does not block automated access.
--
-- ⚠️ SHIPS DISABLED, and enabled = false is the only real safety gate: buildRow()
-- auto-approves when EITHER the source OR the company is trusted 'auto', and
-- every allowlisted company is 'auto'. So enabling this publishes straight to
-- the public board. Dry-run first:
--
--   node scripts/run-job-ingest.mjs --dry-run --sources amazon --markets gb
--
-- then enable it in the admin Sources tab.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- Depends on: migrations/add_job_board_multi_ats.sql (params, max_pages,
--             company_norm), migrations/add_job_company_allowlist.sql.

/* -------------------------------------------------------------------------- */
/* 1. The source                                                               */
/* -------------------------------------------------------------------------- */

INSERT INTO public.job_sources
  (key, name, kind, enabled, trust_level,
   rate_per_minute, rate_per_day, rate_per_week, rate_per_month,
   min_delay_ms, max_age_days, attribution, notes)
VALUES
  -- Rate caps null: an unmetered public endpoint with no published quota, so
  -- getAllowance() returns Infinity. min_delay_ms is the politeness lever, and
  -- 300 is enough here because this is single-phase — nine requests covers the
  -- whole UK board, where Workday spends one request per job.
  ('amazon', 'Amazon Jobs', 'ats', false, 'auto',
   null, null, null, null, 300, 45, '{"required":false}'::jsonb,
   'GET https://www.amazon.jobs/en/search.json — in-house ATS, single-phase, descriptions inline. THREE TRAPS. (1) country[]=GBR is silently ignored: it is what amazon.jobs puts in its own address bar and it returns 10,000 hits of mostly Bengaluru and Seattle roles. The filter that works is normalized_country_code[], alpha-3. (2) result_limit caps at 100 — 200 returns an empty jobs array and hits: 0, which reads exactly like an employer with no vacancies. (3) company_name is the legal entity ("Amazon Development Centre (Scotland) Limited"), so the adapter takes the company from the account row or every listing fails the allowlist gate. sort=recent is only approximately ordered, so max_pages must cover the whole filtered board rather than stopping early.')

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
/* 2. The board                                                                */
/* -------------------------------------------------------------------------- */

-- max_pages 9: 818 UK jobs at 100 per page. Because sort=recent is not reliably
-- ordered, the age cut cannot be reached by stopping early — the whole board has
-- to be walked. Nine requests a night is cheap; revisit if `hits` grows past
-- ~900, which the Coverage tab will show as a board that has stopped growing.
--
-- company_norm is what the allowlist gate matches on, and it is a real FK, so a
-- typo here fails loudly at apply time rather than silently at ingest time.
INSERT INTO public.job_source_accounts
  (source, account, company, company_norm, markets, enabled, max_pages, domain, params)
VALUES
  ('amazon', 'amazon', 'Amazon', 'amazon', ARRAY['gb'], false, 9, 'amazon.co.uk',
   '{"countryCode":"GBR"}'::jsonb)

ON CONFLICT (source, account) DO UPDATE
  SET company      = EXCLUDED.company,
      company_norm = EXCLUDED.company_norm,
      markets      = EXCLUDED.markets,
      max_pages    = EXCLUDED.max_pages,
      domain       = EXCLUDED.domain,
      params       = EXCLUDED.params;
      -- enabled deliberately not overwritten, same reasoning as above.


/* -------------------------------------------------------------------------- */
/* 3. Recognise the alpha-3 country suffix                                     */
/* -------------------------------------------------------------------------- */

-- Amazon writes locations as "Edinburgh, Scotland, GBR". Most parse fine on an
-- existing matcher (\bscotland\b, \blondon\b), but 11 of 818 do not:
-- "Thames Valley, Berkshire, GBR" names a county nobody listed, and a handful
-- are the bare string "GBR".
--
-- \bgbr\b is safe to add because GBR is the ISO 3166-1 alpha-3 code for the
-- United Kingdom and means nothing else — unlike the two-letter codes, which is
-- why \bg\.?b\.?\b already needed the excluders below it. The existing excluder
-- '^(usa|ind|...)\s*-' is unaffected: it anchors on a leading foreign code, and
-- no string can start with USA and also contain GBR as a whole word.
UPDATE public.job_markets
SET location_matchers = location_matchers || ARRAY['\bgbr\b']
WHERE code = 'gb'
  AND NOT ('\bgbr\b' = ANY (location_matchers));


/* -------------------------------------------------------------------------- */
/* 4. Verify                                                                   */
/* -------------------------------------------------------------------------- */

-- Amazon should now report a board instead of nothing:
--
--   SELECT display_name, board_count, enabled_board_count, dormant_query_count
--   FROM public.job_company_coverage() WHERE name_norm = 'amazon';
--
-- The account must resolve to an allowlisted company, or every listing it
-- fetches is dropped as company_not_allowed:
--
--   SELECT a.source, a.account, a.company_norm, c.allowed
--   FROM public.job_source_accounts a
--   LEFT JOIN public.job_companies c ON c.name_norm = a.company_norm
--   WHERE a.source = 'amazon';
--   -- expect allowed = true
