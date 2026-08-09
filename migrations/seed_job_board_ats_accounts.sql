-- ============================================================================
-- Job Board — curated ATS employer boards
-- ----------------------------------------------------------------------------
-- Apply after seed_job_board_config.sql. Idempotent.
--
-- Every token below was PROBED LIVE and confirmed to (a) return 200, (b) return
-- a non-empty job list, and (c) contain at least one UK-located role. Boards
-- that 404 or return nothing were discarded rather than seeded hopefully.
--
-- Each row costs exactly one unauthenticated HTTP request per ingest run, so
-- ~36 requests/day for the whole ATS tier. None of these APIs are metered.
--
-- ⚠️ COVERAGE GAP — read before wondering why three specialisms are empty.
-- Greenhouse/Lever/Ashby/Workable are used almost exclusively by tech companies
-- and digital agencies. A live probe of ~60 UK healthcare and renewable-energy
-- employers found ZERO usable boards: those roles are advertised on NHS Jobs,
-- Indeed and agency sites instead. So this tier serves:
--     UX Designer, Data Analyst, Cyber Security Analyst,
--     Product Manager, Digital Marketing Specialist
-- and CANNOT serve:
--     Healthcare Assistant, Mental Health Worker, Green Energy Technician
-- Those three depend entirely on the Adzuna aggregator.
--
-- To add a company: find its board token (the slug in its careers URL) and
-- verify it first, e.g.
--   curl -s "https://boards-api.greenhouse.io/v1/boards/<token>/jobs" | head -c 300
-- ============================================================================

INSERT INTO public.job_source_accounts (source, account, company, markets, enabled) VALUES

  -- --- Greenhouse -----------------------------------------------------------
  ('greenhouse', 'graphcore',   'Graphcore',              ARRAY['gb'], true),
  ('greenhouse', 'monzo',       'Monzo',                  ARRAY['gb'], true),
  ('greenhouse', 'wayve',       'Wayve',                  ARRAY['gb'], true),
  ('greenhouse', 'tide',        'Tide',                   ARRAY['gb'], true),
  ('greenhouse', 'gocardless',  'GoCardless',             ARRAY['gb'], true),
  ('greenhouse', 'skyscanner',  'Skyscanner',             ARRAY['gb'], true),
  ('greenhouse', 'ovoenergy',   'OVO Energy',             ARRAY['gb'], true),
  ('greenhouse', 'trustpilot',  'Trustpilot',             ARRAY['gb'], true),
  ('greenhouse', 'infosum',     'InfoSum',                ARRAY['gb'], true),
  ('greenhouse', 'similarweb',  'Similarweb',             ARRAY['gb'], true),
  -- Agencies: the best ATS source of genuine digital-marketing roles.
  ('greenhouse', 'wpp',         'WPP',                    ARRAY['gb'], true),
  ('greenhouse', 'dept',        'DEPT',                   ARRAY['gb'], true),
  ('greenhouse', 'brandwatch',  'Brandwatch',             ARRAY['gb'], true),
  ('greenhouse', 'hootsuite',   'Hootsuite',              ARRAY['gb'], true),

  -- --- Lever ----------------------------------------------------------------
  -- NOTE: Lever's createdAt is when the requisition record was created, which
  -- for evergreen roles can be a decade ago. The orchestrator therefore skips
  -- the max_age_days drop for ATS sources and relies on delisting instead.
  ('lever',      'palantir',    'Palantir',               ARRAY['gb'], true),

  -- --- Ashby ----------------------------------------------------------------
  ('ashby',      'elevenlabs',  'ElevenLabs',             ARRAY['gb'], true),
  ('ashby',      'multiverse',  'Multiverse',             ARRAY['gb'], true),
  ('ashby',      'openai',      'OpenAI',                 ARRAY['gb'], true),
  ('ashby',      'synthesia',   'Synthesia',              ARRAY['gb'], true),
  ('ashby',      'cohere',      'Cohere',                 ARRAY['gb'], true),
  ('ashby',      'vanta',       'Vanta',                  ARRAY['gb'], true),
  ('ashby',      'ramp',        'Ramp',                   ARRAY['gb'], true),
  ('ashby',      'ashby',       'Ashby',                  ARRAY['gb'], true),
  ('ashby',      'beamery',     'Beamery',                ARRAY['gb'], true),
  ('ashby',      'causaly',     'Causaly',                ARRAY['gb'], true),
  ('ashby',      'tractable',   'Tractable',              ARRAY['gb'], true),
  ('ashby',      'posthog',     'PostHog',                ARRAY['gb'], true),
  ('ashby',      'linear',      'Linear',                 ARRAY['gb'], true),
  ('ashby',      'sierra',      'Sierra',                 ARRAY['gb'], true),
  ('ashby',      'legora',      'Legora',                 ARRAY['gb'], true),
  ('ashby',      'harvey',      'Harvey',                 ARRAY['gb'], true),
  ('ashby',      'writer',      'Writer',                 ARRAY['gb'], true),
  ('ashby',      'decagon',     'Decagon',                ARRAY['gb'], true),
  ('ashby',      'perplexity',  'Perplexity',             ARRAY['gb'], true),
  ('ashby',      'notion',      'Notion',                 ARRAY['gb'], true),

  -- --- Workable -------------------------------------------------------------
  ('workable',   'zego',        'Zego',                   ARRAY['gb'], true)

ON CONFLICT (source, account) DO UPDATE
  SET company = EXCLUDED.company,
      markets = EXCLUDED.markets;
      -- `enabled` deliberately not overwritten: re-running the seed must not
      -- re-enable a board an admin has switched off.

-- Wayve publishes to BOTH Greenhouse and Ashby with near-identical listings.
-- Only the Greenhouse board is seeded — the dedupe pass would collapse them
-- anyway, but polling one board is a wasted request and a wasted dedupe cycle.
