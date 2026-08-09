-- Multi-ATS job board: make job_companies the single source of truth.
--
-- The allowlist half of "only show roles from companies we chose" already
-- worked: job_companies.allowed is a hard gate at ingest. The sourcing half did
-- not. 38 companies were allowlisted and only 11 had a board, because
-- Greenhouse/Lever/Ashby/Workable are startup ATSs and the large brands on the
-- list are on Workday, Eightfold, Oracle Recruiting Cloud and SuccessFactors.
--
-- This migration makes room for those:
--
--   1. job_source_accounts carries per-board adapter config (params) and can
--      page (max_pages), and is linked to the company registry by a real
--      foreign key instead of a display-name string match.
--   2. job_queries can be scoped to a company instead of a profession, which is
--      how the aggregator tier covers brands with no reachable ATS.
--   3. job_markets gains location_excluders, because a global board exposes how
--      loose the UK matchers really are — "\bwales\b" matches "New South Wales".
--   4. job_ingest_runs separates detail fetches from list calls — see the note
--      on detail_calls, it is load-bearing for the delist outage guard.
--   5. job_company_coverage() answers "which allowlisted company has no source",
--      which is the question the old schema could not be asked.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- Depends on: migrations/add_job_company_allowlist.sql.

/* -------------------------------------------------------------------------- */
/* 1. Per-board adapter config                                                 */
/* -------------------------------------------------------------------------- */

ALTER TABLE public.job_source_accounts
  ADD COLUMN IF NOT EXISTS params       JSONB   NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_pages    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS company_norm TEXT,
  ADD COLUMN IF NOT EXISTS last_error   TEXT,
  ADD COLUMN IF NOT EXISTS notes        TEXT;

COMMENT ON COLUMN public.job_source_accounts.params IS
  $c$Adapter-specific board config. `account` stays the one human-meaningful
token (it is written verbatim to job_listings.source_account and is the join key
for the logo resolver), so everything else lives here:

  workday      {"tenant":"roche","wd":3,"site":"roche-ext",
                "facets":{"gb":{"locations":["<guid>"],"postedOn":["<guid>"]}}}
  eightfold    {"host":"explore.jobs.netflix.net","domain":"netflix.com",
                "location":"United Kingdom"}
  oracle_orc   {"host":"fa-eqid-saasfaprod1.fa.ocs.oraclecloud.com","siteNumber":"CX_1"}
  jsonld       {"sitemapUrl":"https://careers.ba.com/sitemap.xml","jobUrlPattern":"/job/"}

Workday facet ids are per-TENANT GUIDs and must be read from the tenant's own
facets array, never guessed — scripts/discover-job-boards.mjs does that.$c$;

COMMENT ON COLUMN public.job_source_accounts.max_pages IS
  'Pages to fetch per run. Greenhouse/Lever/Ashby/Workable return a whole board '
  'in one response and stay at 1. Workday caps its page size at 20, so a board '
  'with 40 UK roles needs 2.';

-- The link that makes the allowlist the source of truth. Before this the only
-- connection from an allowlisted company to its board was
-- job_source_accounts.company string-matching job_companies.display_name, which
-- add_job_company_allowlist.sql already had to paper over with an OR clause.
-- With the FK, coverage is a plain LEFT JOIN and a board cannot be attached to
-- a company that is not in the registry.
--
-- Backfilled first, constraint added after, so an unmatched legacy row fails
-- loudly here rather than silently at ingest.
UPDATE public.job_source_accounts a
SET company_norm = c.name_norm
FROM public.job_companies c
WHERE a.company_norm IS NULL
  AND (c.display_name = a.company OR c.name_norm = lower(a.company));

-- Anything still null is a board whose company was never registered. Register
-- it (not allowed — that stays a deliberate decision) so the FK can hold.
INSERT INTO public.job_companies (name_norm, display_name, trust, allowed)
SELECT DISTINCT lower(a.company), a.company, 'review', false
FROM public.job_source_accounts a
WHERE a.company_norm IS NULL
ON CONFLICT (name_norm) DO NOTHING;

UPDATE public.job_source_accounts a
SET company_norm = lower(a.company)
WHERE a.company_norm IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_source_accounts_company_norm_fkey'
  ) THEN
    ALTER TABLE public.job_source_accounts
      ADD CONSTRAINT job_source_accounts_company_norm_fkey
      FOREIGN KEY (company_norm) REFERENCES public.job_companies(name_norm) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_source_accounts_company
  ON public.job_source_accounts (company_norm);


/* -------------------------------------------------------------------------- */
/* 2. Company-scoped aggregator queries                                        */
/* -------------------------------------------------------------------------- */

-- A company sweep is not scoped to a profession: doing both would be
-- companies x specialisms calls a day and would bust Adzuna's 2,500/month cap.
-- The orchestrator already tolerates a null queryProfession — it simply forgoes
-- the +3 scoring bonus, and the 8-specialism gate still applies unchanged.
ALTER TABLE public.job_queries
  ALTER COLUMN profession DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS company_norm TEXT
    REFERENCES public.job_companies(name_norm) ON DELETE CASCADE;

-- NULLs are DISTINCT under a plain UNIQUE, so the moment profession can be null
-- the seed's ON CONFLICT would stop deduping and every re-run would insert a
-- fresh copy of every company sweep. NULLS NOT DISTINCT fixes that (PG15+).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_queries_source_market_profession_label_key'
  ) THEN
    ALTER TABLE public.job_queries
      DROP CONSTRAINT job_queries_source_market_profession_label_key;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_queries_unique') THEN
    ALTER TABLE public.job_queries
      ADD CONSTRAINT job_queries_unique
      UNIQUE NULLS NOT DISTINCT (source, market, profession, label);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_queries_company
  ON public.job_queries (company_norm) WHERE company_norm IS NOT NULL;


/* -------------------------------------------------------------------------- */
/* 3. Market exclusions — stop foreign cities matching a UK filter             */
/* -------------------------------------------------------------------------- */

-- job_markets.location_matchers is necessarily loose: it has to catch "London",
-- "Wales" and "UK" wherever a source happens to put them. That was harmless
-- while every source was a single-country startup ATS board. It is not harmless
-- on a global Workday or Oracle board, where
--
--   \bwales\b   matches  "AUS-New South Wales-Asquith"
--   \blondon\b  matches  "CAN-Ontario-London - Tillsonburg"
--
-- and Australian and Canadian roles land on the UK board. Both were observed on
-- Mars's Workday tenant while building this.
--
-- Excluders are evaluated BEFORE the matchers in matchesMarket(), so an
-- explicit "this is somewhere else" always beats a loose city match. Kept as
-- config rather than code so adding a market stays an INSERT.
ALTER TABLE public.job_markets
  ADD COLUMN IF NOT EXISTS location_excluders TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.job_markets.location_excluders IS
  'JS regex sources. A location matching any of these is NOT in this market, '
  'whatever location_matchers says. Checked first.';

UPDATE public.job_markets
SET location_excluders = ARRAY[
  -- Workday and Oracle prefix locations with an ISO-3 country code. Anchored,
  -- so "GBR-London-London" is untouched.
  '^\s*(aus|can|usa|use|mex|bra|arg|chl|col|per|deu|fra|esp|ita|nld|bel|che|aut|swe|nor|dnk|fin|pol|cze|hun|rou|prt|grc|tur|rus|ukr|ind|chn|jpn|kor|sgp|hkg|twn|tha|vnm|idn|mys|phl|are|sau|isr|zaf|egy|nzl|irl)\s*-',
  -- The specific collisions with UK place names.
  '\bnew south wales\b',
  '\bsouth wales\b(?!\s*,?\s*(uk|united kingdom|wales))',
  'london\s*,?\s*(ontario|ont\b|canada|kentucky|\bky\b|ohio|\boh\b|arkansas)',
  'london\s*-\s*tillsonburg',
  -- Cambridge, Massachusetts and Birmingham, Alabama are the other two that
  -- reliably bite on US-heavy boards.
  'cambridge\s*,?\s*(ma\b|massachusetts)',
  'birmingham\s*,?\s*(al\b|alabama)',
  'boston\s*,?\s*(ma\b|massachusetts)'
]
WHERE code = 'gb';


/* -------------------------------------------------------------------------- */
/* 4. Detail fetches are counted separately from list calls                    */
/* -------------------------------------------------------------------------- */

ALTER TABLE public.job_ingest_runs
  ADD COLUMN IF NOT EXISTS detail_calls INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.job_ingest_runs.detail_calls IS
  $c$Per-job description fetches (Workday, Oracle ORC). Deliberately NOT folded
into api_calls: updateTypicalVolume() in server/jobs/lib/expire.js matches
history with `.eq(api_calls, ...)` as a proxy for configured scope, so api_calls
must stay equal to the number of list pages — one per configured board. Detail
counts move with new-job volume every night, so folding them in would give every
run a unique api_calls, leave typical_volume permanently null, and silently
disarm the delisting outage guard.$c$;


/* -------------------------------------------------------------------------- */
/* 5. Coverage: which allowlisted company has no source?                       */
/* -------------------------------------------------------------------------- */

-- SECURITY INVOKER so the existing admin RLS policies stay the authority, the
-- same reasoning as review_job_listings() and job_queue_stats().
--
-- Exists because the admin Sources tab currently pulls up to 5,000 job_listings
-- rows into the browser to compute per-source rates. That breaks silently once
-- the board outgrows the limit; an aggregate belongs in the database.
CREATE OR REPLACE FUNCTION public.job_company_coverage()
RETURNS TABLE (
  name_norm            TEXT,
  display_name         TEXT,
  domain               TEXT,
  logo_url             TEXT,
  allowed              BOOLEAN,
  trust                TEXT,
  aliases              TEXT[],
  board_count          BIGINT,
  enabled_board_count  BIGINT,
  failing_board_count  BIGINT,
  query_count          BIGINT,
  live_count           BIGINT,
  pending_count        BIGINT,
  last_seen_at         TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.name_norm,
    c.display_name,
    c.domain,
    c.logo_url,
    c.allowed,
    c.trust,
    c.aliases,
    COALESCE(b.board_count, 0),
    COALESCE(b.enabled_board_count, 0),
    COALESCE(b.failing_board_count, 0),
    COALESCE(q.query_count, 0),
    COALESCE(l.live_count, 0),
    COALESCE(l.pending_count, 0),
    l.last_seen_at
  FROM public.job_companies c
  LEFT JOIN (
    SELECT company_norm,
           COUNT(*)                                        AS board_count,
           COUNT(*) FILTER (WHERE enabled)                 AS enabled_board_count,
           COUNT(*) FILTER (WHERE enabled AND fail_count > 0) AS failing_board_count
    FROM public.job_source_accounts
    GROUP BY company_norm
  ) b ON b.company_norm = c.name_norm
  LEFT JOIN (
    SELECT company_norm, COUNT(*) AS query_count
    FROM public.job_queries
    WHERE enabled
    GROUP BY company_norm
  ) q ON q.company_norm = c.name_norm
  LEFT JOIN (
    -- Matched on company_norm plus aliases: an aggregator listing carries
    -- whatever the employer typed, and the alias is what made it allowable.
    SELECT c2.name_norm AS company_norm,
           COUNT(*) FILTER (
             WHERE j.status = 'approved'
               AND (j.expires_at IS NULL OR j.expires_at > NOW())
           ) AS live_count,
           COUNT(*) FILTER (WHERE j.status = 'pending') AS pending_count,
           MAX(j.last_seen_at) AS last_seen_at
    FROM public.job_companies c2
    JOIN public.job_listings j
      ON j.company_norm = c2.name_norm OR j.company_norm = ANY (c2.aliases)
    GROUP BY c2.name_norm
  ) l ON l.company_norm = c.name_norm
  ORDER BY c.allowed DESC, COALESCE(b.enabled_board_count, 0) + COALESCE(q.query_count, 0), c.display_name;
$$;

GRANT EXECUTE ON FUNCTION public.job_company_coverage() TO authenticated;


/* -------------------------------------------------------------------------- */
/* 6. Sanity checks                                                            */
/* -------------------------------------------------------------------------- */

-- Every board should now point at a registered company.
--   SELECT source, account, company FROM public.job_source_accounts WHERE company_norm IS NULL;
--
-- Allowlisted companies with nothing fetching their jobs. This is the working
-- list scripts/discover-job-boards.mjs --gaps consumes.
--   SELECT display_name, domain FROM public.job_company_coverage()
--   WHERE allowed AND enabled_board_count = 0 AND query_count = 0;
