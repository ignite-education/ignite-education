-- Company allowlist for the job board.
--
-- Flips the board from "ingest everything, block what we don't want" to
-- "ingest nothing except brands we have explicitly approved". `job_companies`
-- becomes the curated brand registry: it owns the canonical display name, the
-- domain the logo is resolved from, and the allow decision.
--
-- Two consequences worth understanding before applying:
--
--   1. Any listing whose company is not on this list is DROPPED AT INGEST,
--      counted into job_ingest_runs.dropped.company_not_allowed. It never
--      becomes a row, so it never reaches the approval queue.
--
--   2. This makes aggregators safe to enable. Adzuna's whole problem is
--      volume from employers we have never heard of; an allowlist reduces
--      that to exactly the brands below. It also removes the logo
--      domain-guessing risk entirely, because every allowed company has a
--      hand-checked domain.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- Depends on: migrations/add_job_company_logos.sql (domain / logo columns).

/* -------------------------------------------------------------------------- */
/* 1. Columns                                                                  */
/* -------------------------------------------------------------------------- */

ALTER TABLE public.job_companies
  ADD COLUMN IF NOT EXISTS allowed BOOLEAN NOT NULL DEFAULT false,
  -- Extra normalised spellings that resolve to this brand. ATS feeds take the
  -- company name from job_source_accounts.company, which we control, so those
  -- always match exactly. Aggregators report whatever the employer typed
  -- ("Marks and Spencer plc", "M&S"), which is what this is for.
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.job_companies.allowed IS
  'Master switch. When allowlist mode is on, a listing is dropped at ingest unless its company_norm matches an allowed row''s name_norm or one of its aliases.';

CREATE INDEX IF NOT EXISTS idx_job_companies_allowed
  ON public.job_companies (name_norm) WHERE allowed;

/* -------------------------------------------------------------------------- */
/* 2. Seed the allowlist                                                       */
/* -------------------------------------------------------------------------- */

-- name_norm values are the output of normaliseCompany() in
-- server/jobs/lib/normalise.js — computed with that function, not by hand.
-- Note "marks and spencer" (& expands to " and "), "jd com" and "monday com"
-- (punctuation becomes a space).
--
-- domain_source is 'manual' for every row: these were checked individually
-- against Google's favicon service, so the logo resolver must never overwrite
-- them with a guess.
INSERT INTO public.job_companies (name_norm, display_name, domain, domain_source, allowed, trust, aliases)
VALUES
  ('airbnb',                   'Airbnb',                   'airbnb.com',           'manual', true, 'auto', '{}'),
  ('anthropic',                'Anthropic',                'anthropic.com',        'manual', true, 'auto', '{}'),
  ('apple',                    'Apple',                    'apple.com',            'manual', true, 'auto', '{}'),
  ('bbc',                      'BBC',                      'bbc.co.uk',            'manual', true, 'auto', ARRAY['british broadcasting corporation']),
  ('british airways',          'British Airways',          'britishairways.com',   'manual', true, 'auto', '{}'),
  ('bt',                       'BT',                       'bt.com',               'manual', true, 'auto', ARRAY['bt plc','british telecom','british telecommunications']),
  ('chanel',                   'CHANEL',                   'chanel.com',           'manual', true, 'auto', '{}'),
  ('cloudflare',               'Cloudflare',               'cloudflare.com',       'manual', true, 'auto', '{}'),
  ('comic relief',             'Comic Relief',             'comicrelief.com',      'manual', true, 'auto', '{}'),
  ('currys',                   'Currys',                   'currys.co.uk',         'manual', true, 'auto', ARRAY['currys pc world']),
  ('deliveroo',                'Deliveroo',                'deliveroo.co.uk',      'manual', true, 'auto', '{}'),
  ('ey',                       'EY',                       'ey.com',               'manual', true, 'auto', ARRAY['ernst and young','ernst young']),
  ('fuse energy',              'Fuse Energy',              'fuseenergy.com',       'manual', true, 'auto', '{}'),
  ('fyxer',                    'Fyxer',                    'fyxer.com',            'manual', true, 'auto', ARRAY['fyxer ai']),
  ('google',                   'Google',                   'google.com',           'manual', true, 'auto', '{}'),
  ('jd com',                   'JD.com',                   'jd.com',               'manual', true, 'auto', '{}'),
  ('liberal democrats',        'Liberal Democrats',        'libdems.org.uk',       'manual', true, 'auto', ARRAY['the liberal democrats','libdems']),
  ('linkedin',                 'LinkedIn',                 'linkedin.com',         'manual', true, 'auto', '{}'),
  ('london stock exchange',    'London Stock Exchange',    'lseg.com',             'manual', true, 'auto', ARRAY['lseg','london stock exchange plc']),
  ('macmillan cancer support', 'Macmillan Cancer Support', 'macmillan.org.uk',     'manual', true, 'auto', ARRAY['macmillan']),
  ('marks and spencer',        'Marks & Spencer',          'marksandspencer.com',  'manual', true, 'auto', ARRAY['m and s','marks spencer']),
  ('mars',                     'Mars',                     'mars.com',             'manual', true, 'auto', ARRAY['mars wrigley']),
  ('meta',                     'Meta',                     'meta.com',             'manual', true, 'auto', ARRAY['meta platforms','facebook']),
  ('microsoft',                'Microsoft',                'microsoft.com',        'manual', true, 'auto', '{}'),
  ('monday com',               'monday.com',               'monday.com',           'manual', true, 'auto', '{}'),
  ('monzo',                    'Monzo',                    'monzo.com',            'manual', true, 'auto', ARRAY['monzo bank']),
  ('netflix',                  'Netflix',                  'netflix.com',          'manual', true, 'auto', '{}'),
  ('nike',                     'Nike',                     'nike.com',             'manual', true, 'auto', '{}'),
  -- Assumed to be On, the Swiss running brand (greenhouse/onrunning, 340 roles,
  -- 20 in the UK). If you meant a different "ON", change domain and re-run the
  -- logo backfill. A two-character key is collision-prone by nature.
  ('on',                       'ON',                       'on.com',               'manual', true, 'auto', ARRAY['on running','on ag']),
  ('palantir',                 'Palantir',                 'palantir.com',         'manual', true, 'auto', ARRAY['palantir technologies']),
  ('reddit',                   'Reddit',                   'reddit.com',           'manual', true, 'auto', '{}'),
  ('roche',                    'Roche',                    'roche.com',            'manual', true, 'auto', '{}'),
  ('the economist',            'The Economist',            'economist.com',        'manual', true, 'auto', ARRAY['economist','economist']),
  ('the trainline',            'The Trainline',            'thetrainline.com',     'manual', true, 'auto', ARRAY['trainline']),
  ('tony blair institute',     'Tony Blair Institute',     'institute.global',     'manual', true, 'auto', ARRAY['tony blair institute for global change','tbi']),
  ('uber',                     'Uber',                     'uber.com',             'manual', true, 'auto', '{}'),
  ('bloomberg',                'Bloomberg',                'bloomberg.com',        'manual', true, 'auto', '{}'),
  ('tiktok',                   'TikTok',                   'tiktok.com',           'manual', true, 'auto', ARRAY['bytedance'])
ON CONFLICT (name_norm) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  domain        = EXCLUDED.domain,
  domain_source = EXCLUDED.domain_source,
  allowed       = EXCLUDED.allowed,
  trust         = EXCLUDED.trust,
  aliases       = EXCLUDED.aliases,
  -- Force the logo resolver to re-check on the next run rather than wait out
  -- the 30-day refresh window.
  logo_checked_at = NULL,
  updated_at    = NOW();

/* -------------------------------------------------------------------------- */
/* 3. ATS boards for allowlisted brands                                        */
/* -------------------------------------------------------------------------- */

-- Every token below was probed live and returns real jobs. `company` must match
-- an allowlist display_name exactly: the four ATS adapters take the company
-- name from this column, so this is what the allowlist check sees.
--
-- NOT ADDED, and deliberately:
--   greenhouse/linkedin, lever/linkedin -- both exist and return 200, but hold
--     ATS test fixtures ("123123", "Bug Bash Job", "Anirban jobReq 3"), not
--     real LinkedIn vacancies.
--   ashby/fuse -- a different Fuse (laser/fusion engineering, San Leandro and
--     Montreal), not the UK energy supplier. workable/fuseenergy is the right one.
INSERT INTO public.job_source_accounts (source, account, company, markets, enabled, domain)
VALUES
  ('greenhouse', 'airbnb',      'Airbnb',        ARRAY['gb'], true, 'airbnb.com'),
  ('greenhouse', 'anthropic',   'Anthropic',     ARRAY['gb'], true, 'anthropic.com'),
  ('greenhouse', 'cloudflare',  'Cloudflare',    ARRAY['gb'], true, 'cloudflare.com'),
  ('greenhouse', 'reddit',      'Reddit',        ARRAY['gb'], true, 'reddit.com'),
  ('greenhouse', 'onrunning',   'ON',            ARRAY['gb'], true, 'on.com'),
  ('ashby',      'deliveroo',   'Deliveroo',     ARRAY['gb'], true, 'deliveroo.co.uk'),
  ('ashby',      'trainline',   'The Trainline', ARRAY['gb'], true, 'thetrainline.com'),
  ('ashby',      'fyxer',       'Fyxer',         ARRAY['gb'], true, 'fyxer.com'),
  ('workable',   'fuseenergy',  'Fuse Energy',   ARRAY['gb'], true, 'fuseenergy.com')
ON CONFLICT (source, account) DO UPDATE SET
  company = EXCLUDED.company,
  enabled = EXCLUDED.enabled,
  domain  = EXCLUDED.domain;

-- Stop polling boards whose jobs the allowlist would discard anyway. The rows
-- are kept, not deleted, so adding one of these brands back to the allowlist is
-- a single `enabled = true` in the admin Sources tab.
UPDATE public.job_source_accounts a
SET enabled = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_companies c
  WHERE c.allowed
    AND (c.display_name = a.company OR c.name_norm = lower(a.company))
);

/* -------------------------------------------------------------------------- */
/* 4. Clear listings from companies that are no longer allowed                 */
/* -------------------------------------------------------------------------- */

-- Deleted rather than expired. Every one of these came from an ATS feed and is
-- re-ingestible in a single run, so a delete is fully reversible; whereas
-- persist.js only refreshes VOLATILE_FIELDS on a re-seen job and would leave an
-- expired row expired forever. job_listing_apply cascades.
DELETE FROM public.job_listings l
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_companies c
  WHERE c.allowed
    AND (c.name_norm = l.company_norm OR l.company_norm = ANY (c.aliases))
);
