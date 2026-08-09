-- Let an admin type a company's careers page URL, and make discovery use it.
--
-- Until now server/jobs/lib/discover.js only had `job_companies.domain` to work
-- from, and guessed four conventional URLs off it:
--
--     https://careers.{host}/   https://www.{host}/careers
--     https://jobs.{host}/      https://www.{host}/jobs
--
-- That is right often enough to be worth keeping, and wrong for exactly the
-- companies still uncovered. The BBC's board is careers.bbc.co.uk but BT's is
-- bt.com/careers via a redirect chain, EY's is eyglobal.yello.co, and CHANEL's
-- sits on a separate brand domain entirely. None of those are reachable by
-- guessing, so discovery fingerprints a marketing page, finds no vendor, and
-- reports "no board found" for a company that plainly has one.
--
-- A typed URL removes the guess. It is also the cheapest possible fix: the
-- fingerprint stage already handles anything it is pointed at, so one column
-- turns "I know where their jobs are" into a covered company.
--
-- Depends on: migrations/add_job_company_logos.sql (job_companies),
--             migrations/add_job_board_multi_ats.sql (job_company_coverage).

/* -------------------------------------------------------------------------- */
/* 1. Column                                                                   */
/* -------------------------------------------------------------------------- */

ALTER TABLE public.job_companies
  ADD COLUMN IF NOT EXISTS careers_url TEXT;

COMMENT ON COLUMN public.job_companies.careers_url IS
  'Careers page to fingerprint, typed by an admin. Discovery fetches this FIRST '
  'and falls back to guessing from `domain`. Point it at the page that lists '
  'vacancies, not the "life at us" marketing page — the vendor marker is in the '
  'listing page markup. A URL here does not bypass the DENYLIST or the '
  'robots.txt check in server/jobs/lib/discover.js.';

-- Only http(s), and only when set. Stops a pasted "careers.bbc.co.uk" (no
-- scheme, which axios cannot fetch) from being stored as if it worked.
ALTER TABLE public.job_companies
  DROP CONSTRAINT IF EXISTS job_companies_careers_url_scheme;
ALTER TABLE public.job_companies
  ADD CONSTRAINT job_companies_careers_url_scheme
  CHECK (careers_url IS NULL OR careers_url ~* '^https?://[^\s]+$');


/* -------------------------------------------------------------------------- */
/* 2. Surface it on the Coverage tab                                           */
/* -------------------------------------------------------------------------- */

-- CREATE OR REPLACE cannot change a function's return type, so the old one has
-- to go first. Dropping is safe: it is read-only and nothing holds a reference
-- to it between statements.
DROP FUNCTION IF EXISTS public.job_company_coverage();

CREATE FUNCTION public.job_company_coverage()
RETURNS TABLE (
  name_norm            TEXT,
  display_name         TEXT,
  domain               TEXT,
  careers_url          TEXT,
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
    c.careers_url,
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
/* 3. The working list                                                         */
/* -------------------------------------------------------------------------- */

-- Allowlisted companies with no source and nowhere for discovery to look. These
-- are the rows worth typing a careers URL into — everything else either already
-- has a board or is on the DENYLIST.
--
--   SELECT display_name, domain
--   FROM public.job_company_coverage()
--   WHERE allowed AND enabled_board_count = 0 AND query_count = 0
--     AND careers_url IS NULL
--   ORDER BY display_name;
