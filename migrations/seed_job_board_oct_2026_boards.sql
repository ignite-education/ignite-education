-- Six more allowlisted brands reach the job board, October 2026.
--
-- Where each one comes from, and why it took until now:
--
--   The Economist   Greenhouse, EU host. The careers site is economistgroup.com,
--                   not economist.com, and the board link is
--                   job-boards.eu.greenhouse.io — discovery's fingerprint only
--                   knew the .io host. Same API, same token.
--   monday.com      Ashby. The board name is literally "monday.com"; every slug
--                   discovery guessed stripped the dot.
--   Currys          SuccessFactors, read through the jsonld adapter like BBC and
--                   EY. Its advert pages carry the description, date and
--                   location as microdata but no itemprop="title" — the
--                   extractor now falls back to og:title.
--   Microsoft       Eightfold, on the newer "pcsx" API shape (see
--                   server/jobs/sources/eightfold.js). The old search API did
--                   block non-browser clients, which is why microsoft.com sat on
--                   DENYLIST; apply.careers.microsoft.com's robots.txt allows
--                   both the search API and the advert pages. Removed from the
--                   denylist in the same change.
--   Macmillan       Own board, full JSON-LD JobPosting on every advert, no
--                   sitemap. The jsonld adapter now takes a listUrl: the
--                   home page lists every open vacancy (under ten).
--   Bloomberg       Avature — new adapter, server/jobs/sources/avature.js. 324
--                   roles worldwide listed 12 at a time with the location on
--                   each tile, so the market gate runs before any detail fetch.
--                   max_pages covers the whole board; the location gate keeps
--                   detail fetches to the ~5% that are UK.
--
-- Ships DISABLED, as every seed in this repo does. Each was dry-run against the
-- live site before this file was written:
--
--   node scripts/run-job-ingest.mjs --dry-run --sources greenhouse,ashby,eightfold,jsonld,avature --markets gb
--
-- then flip `enabled` in the admin Sources tab. Safe to re-run: ON CONFLICT
-- never touches `enabled`.

/* -------------------------------------------------------------------------- */
/* 1. The Avature source                                                       */
/* -------------------------------------------------------------------------- */

INSERT INTO public.job_sources
  (key, name, kind, enabled, trust_level,
   rate_per_minute, rate_per_day, rate_per_week, rate_per_month,
   min_delay_ms, max_age_days, attribution, notes)
VALUES
  -- Rate caps null: server-rendered pages with no published quota. 500ms
  -- between requests, the same as jsonld — this is page fetching, not an API.
  ('avature', 'Avature', 'ats', false, 'auto',
   null, null, null, null, 500, 45, '{"required":false}'::jsonb,
   'GET https://{host}/{portal}/SearchJobs/?jobRecordsPerPage=12&jobOffset=N — HTML, 12 tiles per page whatever is asked for. Each tile carries the location, which is the whole reason the list is HTML rather than the RSS feed (SearchJobs/feed/, no location) or the sitemap (no location): the market gate runs on the tile and non-UK roles never cost a detail fetch. Advert pages have no structured data; the description is the largest field__value element in the page template. No posted date anywhere on the portal.')
ON CONFLICT (key) DO UPDATE
  SET name          = EXCLUDED.name,
      kind          = EXCLUDED.kind,
      min_delay_ms  = EXCLUDED.min_delay_ms,
      max_age_days  = EXCLUDED.max_age_days,
      attribution   = EXCLUDED.attribution,
      notes         = EXCLUDED.notes;
      -- enabled and trust_level deliberately not overwritten.

/* -------------------------------------------------------------------------- */
/* 2. The boards                                                               */
/* -------------------------------------------------------------------------- */

INSERT INTO public.job_source_accounts
  (source, account, company, company_norm, markets, enabled, max_pages, domain, params)
VALUES
  -- 31 roles, 18 in the UK on the day of the probe.
  ('greenhouse', 'theeconomistgroup', 'The Economist', 'the economist', ARRAY['gb'], false, 1,
   'economist.com', '{}'::jsonb),
  -- 104 roles, 11 in the UK.
  ('ashby', 'monday.com', 'monday.com', 'monday com', ARRAY['gb'], false, 1,
   'monday.com', '{}'::jsonb),
  -- 157 adverts in the sitemap, almost all retail store roles that the title
  -- and profession gates drop before they cost a request. NO locationPattern,
  -- unlike BBC/EY: this is a UK-only board whose head-office roles sit in
  -- Loughborough and Acton, which the market matchers do not name — the slug
  -- gate would drop them as wrong_market. The advert's own streetAddress
  -- ("Cwmbran, GB") passes the market check at hydration instead, and the
  -- whole board is small enough that the extra detail fetches do not matter.
  ('jsonld', 'currys', 'Currys', 'currys', ARRAY['gb'], false, 2, 'currys.co.uk',
   '{"sitemapUrl":"https://curryscareers.co.uk/sitemap.xml","jobUrlPattern":"\\/job\\/"}'::jsonb),
  -- 84 roles with the United Kingdom location hint, 10 confirmed in-market on
  -- page one. api:"pcsx" selects the newer endpoint shape and page-based hydration.
  ('eightfold', 'microsoft', 'Microsoft', 'microsoft', ARRAY['gb'], false, 5, 'microsoft.com',
   '{"host":"apply.careers.microsoft.com","domain":"microsoft.com","location":"United Kingdom","api":"pcsx"}'::jsonb),
  -- Eight vacancies on the home page at the time of writing; the listing is the
  -- whole board. JSON-LD on every advert with datePosted and jobLocation.
  ('jsonld', 'macmillan', 'Macmillan Cancer Support', 'macmillan cancer support', ARRAY['gb'], false, 1,
   'macmillan.org.uk',
   '{"listUrl":"https://jobs.macmillan.org.uk/jobs/home/","jobUrlPattern":"\\/jobs\\/vacancy\\/[^\\/]+\\/\\d+\\/"}'::jsonb),
  -- 324 roles worldwide at 12 per page → 27 list requests; max_pages has
  -- headroom for the board to grow.
  ('avature', 'bloomberg', 'Bloomberg', 'bloomberg', ARRAY['gb'], false, 30, 'bloomberg.com',
   '{"host":"bloomberg.avature.net","portal":"careers"}'::jsonb)
ON CONFLICT (source, account) DO UPDATE SET
  company      = EXCLUDED.company,
  company_norm = EXCLUDED.company_norm,
  markets      = EXCLUDED.markets,
  max_pages    = EXCLUDED.max_pages,
  domain       = EXCLUDED.domain,
  params       = EXCLUDED.params;

/* -------------------------------------------------------------------------- */
/* 3. What the Coverage tab should say                                         */
/* -------------------------------------------------------------------------- */

-- careers_url is what Find boards fetches first, so the next sweep lands on
-- the real board instead of guessing careers.{domain}.
UPDATE public.job_companies SET careers_url = v.url, reason = NULL
FROM (VALUES
  ('the economist',            'https://www.economistgroup.com/careers'),
  ('monday com',               'https://monday.com/careers/positions'),
  ('currys',                   'https://curryscareers.co.uk/'),
  ('microsoft',                'https://apply.careers.microsoft.com/careers'),
  ('macmillan cancer support', 'https://jobs.macmillan.org.uk/jobs/home/'),
  ('bloomberg',                'https://bloomberg.avature.net/careers/SearchJobs')
) AS v(name_norm, url)
WHERE job_companies.name_norm = v.name_norm;

-- Still uncovered, and why — so the next sweep does not re-probe them.
UPDATE public.job_companies SET reason = v.reason
FROM (VALUES
  ('bt', 'Uncovered: SAP SuccessFactors, but unlike BBC/EY/Currys its search results are rendered client-side — the HTML search page carries no advert links to a non-browser client, the sitemap holds two "register your interest" pages, and the AJAX path (/services/) is disallowed by robots.txt. The advert pages also put the description outside the microdata. No legitimate route without a browser.'),
  ('chanel', 'Unreachable: careers.chanel.com returns 403 to automated clients.'),
  ('tony blair institute', 'Unreachable: institute.global rate-limits automated clients (429 on the first request).'),
  ('liberal democrats', 'Uncovered: vacancies are plain pages under libdems.org.uk/work-for-us with no ATS and no JobPosting markup — a per-site scraper for a dozen campaign-organiser roles. Add by hand if one is relevant.')
) AS v(name_norm, reason)
WHERE job_companies.name_norm = v.name_norm;
