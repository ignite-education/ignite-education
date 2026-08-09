-- Employer logos for the job board.
--
-- Logos are resolved once per COMPANY (not per listing) by the nightly ingest,
-- fetched from Google's s2 favicon service, and RE-HOSTED in the Supabase
-- `assets` bucket. Re-hosting rather than hot-linking is deliberate:
--
--   * The Supabase host is already in `images.remotePatterns` in BOTH
--     `vercel.json` and `next-app/next.config.ts`, so no routing config changes.
--   * s2 is an undocumented, unversioned Google endpoint. If it disappears, a
--     hot-linked board breaks instantly; a re-hosted one merely stops refreshing.
--   * The board renders up to 300 rows. Hot-linking would send every visitor's
--     IP and referer to Google 300x per page view.
--
-- Storage cost is ~2KB per company, so this is free in practice.
--
-- Apply in the Supabase SQL editor (repo convention -- there is no Supabase CLI
-- in this project). Safe to re-run.

/* -------------------------------------------------------------------------- */
/* 1. job_companies -- logo resolution state                                  */
/* -------------------------------------------------------------------------- */

ALTER TABLE public.job_companies
  -- Registrable domain, e.g. 'monzo.com'. The logo lookup key.
  ADD COLUMN IF NOT EXISTS domain          TEXT,
  -- Where the domain came from, so a wrong logo is traceable to a guess.
  --   account = joined from job_source_accounts.domain (hand-curated, trusted)
  --   manual  = an admin typed it (highest priority, never overwritten)
  --   guessed = inferred from the company name (the Adzuna long tail)
  ADD COLUMN IF NOT EXISTS domain_source   TEXT
    CHECK (domain_source IN ('account', 'manual', 'guessed')),
  ADD COLUMN IF NOT EXISTS logo_source     TEXT,          -- 'google' | 'ddg'
  -- md5 of the fetched bytes. Lets a refresh skip the upload when nothing moved.
  ADD COLUMN IF NOT EXISTS logo_hash       TEXT,
  ADD COLUMN IF NOT EXISTS logo_checked_at TIMESTAMPTZ,
  -- pending    = never attempted
  -- ok         = logo_url is live
  -- none       = no logo found; retried after the refresh window
  -- suppressed = an admin killed it. NEVER retried -- this is the takedown
  --              lever for a guessed domain that resolved to the wrong brand,
  --              which is a trademark complaint, not a rendering glitch.
  ADD COLUMN IF NOT EXISTS logo_status     TEXT NOT NULL DEFAULT 'pending'
    CHECK (logo_status IN ('pending', 'ok', 'none', 'suppressed'));

COMMENT ON COLUMN public.job_companies.logo_status IS
  'suppressed is permanent and never retried by the ingest -- use it to kill a wrong-brand logo.';

/* -------------------------------------------------------------------------- */
/* 2. job_source_accounts -- the hand-curated domain, and why it matters      */
/* -------------------------------------------------------------------------- */

-- Every ATS-sourced listing carries a source_account, so this column resolves
-- those employers to a domain with ZERO guessing. Guessing only ever runs for
-- aggregator listings (Adzuna), where there is no account to join to.
ALTER TABLE public.job_source_accounts
  ADD COLUMN IF NOT EXISTS domain TEXT;

UPDATE public.job_source_accounts AS a
SET domain = v.domain
FROM (VALUES
  ('ashby',      'ashby',       'ashbyhq.com'),
  ('ashby',      'beamery',     'beamery.com'),
  ('greenhouse', 'brandwatch',  'brandwatch.com'),
  ('ashby',      'causaly',     'causaly.com'),
  ('ashby',      'cohere',      'cohere.com'),
  ('ashby',      'decagon',     'decagon.ai'),
  ('greenhouse', 'dept',        'deptagency.com'),
  ('ashby',      'elevenlabs',  'elevenlabs.io'),
  ('greenhouse', 'gocardless',  'gocardless.com'),
  ('greenhouse', 'graphcore',   'graphcore.ai'),
  ('ashby',      'harvey',      'harvey.ai'),
  ('greenhouse', 'hootsuite',   'hootsuite.com'),
  ('greenhouse', 'infosum',     'infosum.com'),
  ('ashby',      'legora',      'legora.com'),
  ('ashby',      'linear',      'linear.app'),
  ('greenhouse', 'monzo',       'monzo.com'),
  ('ashby',      'multiverse',  'multiverse.io'),
  ('ashby',      'notion',      'notion.com'),
  ('ashby',      'openai',      'openai.com'),
  ('greenhouse', 'ovoenergy',   'ovoenergy.com'),
  ('lever',      'palantir',    'palantir.com'),
  ('ashby',      'perplexity',  'perplexity.ai'),
  ('ashby',      'posthog',     'posthog.com'),
  ('ashby',      'ramp',        'ramp.com'),
  ('ashby',      'sierra',      'sierra.ai'),
  ('greenhouse', 'similarweb',  'similarweb.com'),
  ('greenhouse', 'skyscanner',  'skyscanner.net'),
  ('ashby',      'synthesia',   'synthesia.io'),
  ('greenhouse', 'tide',        'tide.co'),
  ('ashby',      'tractable',   'tractable.ai'),
  ('greenhouse', 'trustpilot',  'trustpilot.com'),
  ('ashby',      'vanta',       'vanta.com'),
  ('greenhouse', 'wayve',       'wayve.ai'),
  ('greenhouse', 'wpp',         'wpp.com'),
  ('ashby',      'writer',      'writer.com'),
  ('workable',   'zego',        'zego.com')
) AS v(source, account, domain)
WHERE a.source = v.source AND a.account = v.account;

/* -------------------------------------------------------------------------- */
/* 3. Index                                                                    */
/* -------------------------------------------------------------------------- */

-- The logo propagation step updates job_listings by company_norm across every
-- status, so it cannot use the status-partial public index.
CREATE INDEX IF NOT EXISTS idx_job_listings_company_norm_all
  ON public.job_listings (company_norm);
