-- ============================================================================
-- Job Board — schema
-- ----------------------------------------------------------------------------
-- Backs the public board at ignite.education/jobs, the ingest pipeline in
-- server/jobs/, and the admin approval queue at admin.ignite.education/jobs.
--
-- Hand-apply in the Supabase SQL editor (this repo has no Supabase CLI).
-- Apply seed_job_board_config.sql afterwards.
--
-- Two structural decisions are load-bearing; both are commented at their table:
--   1. The outbound apply URL lives in its own table (job_listing_apply) with
--      no anon policy, so it is unreachable from the public board's client.
--   2. profession/seniority are GENERATED from (override, inferred), so an
--      ingest re-run can never clobber an admin decision.
-- ============================================================================


-- ============================================================================
-- 1. job_markets — the country-expansion seam
-- ----------------------------------------------------------------------------
-- Adding a country is an INSERT here plus job_queries rows. No code change:
-- adapters read their country identifier out of source_params, and ATS market
-- filtering reads location_matchers.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_markets (
  code              TEXT PRIMARY KEY,                    -- ISO-3166-1 alpha-2, lowercase
  name              TEXT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'GBP',
  locale            TEXT NOT NULL DEFAULT 'en-GB',
  source_params     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {"adzuna":{"country":"gb"}}
  location_matchers TEXT[] NOT NULL DEFAULT '{}',        -- JS regex sources; is a global ATS job ours?
  enabled           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.job_markets IS
  'Geographic markets for the job board. Adding a country is config, not code.';


-- ============================================================================
-- 2. job_sources — trust, attribution, rate limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_sources (
  key             TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('aggregator','ats','board')),
  enabled         BOOLEAN NOT NULL DEFAULT false,

  -- review  → every listing enters the approval queue
  -- auto    → publishes immediately (curated ATS feeds, once trusted)
  -- blocked → ingest skips the source entirely
  trust_level     TEXT NOT NULL DEFAULT 'review'
                  CHECK (trust_level IN ('review','auto','blocked')),

  -- ToS ceilings. Enforced against job_ingest_runs.api_calls, not an in-process
  -- counter: Render's free plan spins down, so process memory cannot hold a
  -- monthly budget.
  rate_per_minute INTEGER,
  rate_per_day    INTEGER,
  rate_per_week   INTEGER,
  rate_per_month  INTEGER,
  min_delay_ms    INTEGER NOT NULL DEFAULT 250,
  max_age_days    INTEGER NOT NULL DEFAULT 30,

  -- Rendering contract for the mandatory source badge. Read by
  -- next-app/src/components/jobs/SourceAttribution.tsx. Adzuna's requirement is
  -- per-advert with a pixel minimum and non-compliance means API suspension, so
  -- this is a hard requirement rather than a courtesy.
  attribution     JSONB NOT NULL DEFAULT '{}'::jsonb,

  typical_volume  INTEGER,   -- rolling median fetch count; the expiry sweep's outage guard
  last_run_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.job_sources.typical_volume IS
  'Rolling median of fetched-per-run. expire.js refuses to run the last_seen_at '
  'clause when a run fetched under half of this, so a partial source outage '
  'cannot mass-expire the board.';


-- ============================================================================
-- 3. job_source_accounts — per-company ATS boards
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_source_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT NOT NULL REFERENCES public.job_sources(key) ON DELETE CASCADE,
  account    TEXT NOT NULL,   -- greenhouse board token / lever site / ashby name / workable slug
  company    TEXT NOT NULL,
  markets    TEXT[] NOT NULL DEFAULT ARRAY['gb'],
  enabled    BOOLEAN NOT NULL DEFAULT true,
  last_ok_at TIMESTAMPTZ,
  fail_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, account)
);


-- ============================================================================
-- 4. job_queries — the narrowness lever
-- ----------------------------------------------------------------------------
-- Every aggregator call is scoped to one profession in one market. There are no
-- broad sweeps. This is what keeps the admin approval queue at tens of rows a
-- day instead of thousands, and what keeps Adzuna's 2,500/month ToS cap intact.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_queries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT NOT NULL REFERENCES public.job_sources(key) ON DELETE CASCADE,
  market     TEXT NOT NULL REFERENCES public.job_markets(code) ON DELETE CASCADE,
  profession TEXT NOT NULL,   -- matches courses.title where course_type = 'specialism'
  label      TEXT NOT NULL,
  params     JSONB NOT NULL,  -- adapter-specific
  max_pages  INTEGER NOT NULL DEFAULT 2,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, market, profession, label)
);


-- ============================================================================
-- 5. job_companies — company trust memory
-- ----------------------------------------------------------------------------
-- Blocking one agency once is the single largest ongoing reduction in queue
-- volume: agencies repost the same roles weekly under fresh source ids.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_companies (
  name_norm      TEXT PRIMARY KEY,   -- lowercased; Ltd/Limited/Inc/PLC/LLP/Group/Recruitment stripped
  display_name   TEXT NOT NULL,
  trust          TEXT NOT NULL DEFAULT 'review'
                 CHECK (trust IN ('review','auto','blocked')),
  logo_url       TEXT,
  reason         TEXT,
  approved_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  updated_by     UUID REFERENCES auth.users(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 6. job_listings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provenance -------------------------------------------------------------
  source         TEXT NOT NULL REFERENCES public.job_sources(key),
  source_job_id  TEXT NOT NULL,
  source_account TEXT,
  market         TEXT NOT NULL REFERENCES public.job_markets(code),
  display_source TEXT NOT NULL REFERENCES public.job_sources(key),

  -- Content ----------------------------------------------------------------
  title               TEXT NOT NULL,
  company             TEXT NOT NULL,
  company_norm        TEXT NOT NULL,
  company_logo_url    TEXT,
  description_html    TEXT,
  description_text    TEXT,
  description_snippet TEXT NOT NULL DEFAULT '',
  is_snippet          BOOLEAN NOT NULL DEFAULT false,

  -- Location ---------------------------------------------------------------
  location_raw    TEXT,
  location_city   TEXT,
  location_region TEXT,
  country_code    TEXT,
  is_remote       BOOLEAN NOT NULL DEFAULT false,

  -- Compensation -----------------------------------------------------------
  salary_min         NUMERIC,
  salary_max         NUMERIC,
  salary_currency    TEXT,
  salary_period      TEXT CHECK (salary_period IN ('year','month','week','day','hour')),
  salary_is_estimate BOOLEAN NOT NULL DEFAULT false,
  contract_type      TEXT,
  contract_time      TEXT,

  -- Classification ---------------------------------------------------------
  profession_inferred  TEXT,
  profession_override  TEXT,
  profession           TEXT GENERATED ALWAYS AS
                       (COALESCE(profession_override, profession_inferred)) STORED,

  seniority_inferred   TEXT CHECK (seniority_inferred IN ('entry','mid','senior')),
  seniority_override   TEXT CHECK (seniority_override IN ('entry','mid','senior')),
  seniority            TEXT GENERATED ALWAYS AS
                       (COALESCE(seniority_override, seniority_inferred)) STORED,
  seniority_source     TEXT,
  seniority_token      TEXT,
  seniority_confidence NUMERIC,

  -- Dedupe -----------------------------------------------------------------
  canonical_url      TEXT,
  canonical_url_hash TEXT,
  block_key          TEXT,
  canonical_group_id UUID REFERENCES public.job_listings(id) ON DELETE SET NULL,

  -- Lifecycle --------------------------------------------------------------
  status TEXT NOT NULL DEFAULT 'pending'
         CHECK (status IN ('pending','approved','rejected','duplicate','expired','stale')),
  approval_mode    TEXT CHECK (approval_mode IN ('manual','auto_source','auto_company')),
  approved_at      TIMESTAMPTZ,
  approved_by      UUID REFERENCES auth.users(id),
  rejected_at      TIMESTAMPTZ,
  rejected_by      UUID REFERENCES auth.users(id),
  rejection_reason TEXT,

  posted_at     TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  expired_at    TIMESTAMPTZ,

  view_count        INTEGER NOT NULL DEFAULT 0,
  apply_click_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source, source_job_id)
);

COMMENT ON COLUMN public.job_listings.display_source IS
  'The source whose attribution badge THIS record must render. Diverges from '
  '`source` when a cross-source dedupe elects a different canonical. Adzuna''s '
  'badge requirement is per-advert, so cards read this column, not `source`.';

COMMENT ON COLUMN public.job_listings.profession IS
  'GENERATED — cannot be written directly. Admin writes must target '
  'profession_override. A direct UPDATE fails loudly, which is intended.';

COMMENT ON COLUMN public.job_listings.seniority IS
  'GENERATED — cannot be written directly. Admin writes must target '
  'seniority_override.';

COMMENT ON COLUMN public.job_listings.seniority_source IS
  'Which rule decided seniority: native | graduate_flag | category | nhs_band | '
  'title_rule | years_experience | default. Persisted so a misclassification is '
  'one glance in the admin table rather than a debugging session.';

COMMENT ON COLUMN public.job_listings.is_snippet IS
  'True when the source returned only a truncated excerpt (Adzuna). The '
  'years-of-experience seniority rule is skipped for these — a "5 years" '
  'fragment inside a snippet may not be about the requirement at all.';


-- ============================================================================
-- 7. job_listing_apply — the auth gate's structural guarantee
-- ----------------------------------------------------------------------------
-- The outbound URL lives HERE, not on job_listings, and this table has no anon
-- or authenticated RLS policy. The public board renders through the cookie-less
-- anon client (required for ISR), so these rows are invisible to it even if
-- someone later writes a careless select('*').
--
-- DO NOT move these columns back onto job_listings. The separation is what makes
-- the gate structurally impossible to bypass rather than merely un-rendered.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_listing_apply (
  job_id     UUID PRIMARY KEY REFERENCES public.job_listings(id) ON DELETE CASCADE,
  apply_url  TEXT NOT NULL,   -- resolved, UTM-stripped
  raw_url    TEXT NOT NULL,   -- exactly what the source returned
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 8. job_ingest_runs — per-run observability
-- ----------------------------------------------------------------------------
-- Modelled on reddit_fetch_log. Doubles as the rate-limit ledger: budget.js
-- sums api_calls across rolling windows to enforce ToS caps across restarts.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_ingest_runs (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source  TEXT NOT NULL,
  market  TEXT,
  trigger TEXT NOT NULL DEFAULT 'cron'
          CHECK (trigger IN ('cron','manual','backfill')),
  status  TEXT NOT NULL DEFAULT 'running'
          CHECK (status IN ('running','success','partial','failed','abandoned')),

  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,

  api_calls     INTEGER NOT NULL DEFAULT 0,
  fetched       INTEGER NOT NULL DEFAULT 0,
  inserted      INTEGER NOT NULL DEFAULT 0,
  updated       INTEGER NOT NULL DEFAULT 0,
  auto_approved INTEGER NOT NULL DEFAULT 0,
  queued        INTEGER NOT NULL DEFAULT 0,
  expired       INTEGER NOT NULL DEFAULT 0,

  -- Filter-cascade breakdown, e.g.
  -- {"no_profession":812,"company_blocked":40,"duplicate":121,"too_old":33}
  dropped JSONB NOT NULL DEFAULT '{}'::jsonb,
  error   TEXT
);

COMMENT ON COLUMN public.job_ingest_runs.dropped IS
  'Counts per drop reason. All ingest tuning starts here — if the queue is too '
  'big or too small, this says which filter to move.';


-- ============================================================================
-- 9. job_rejection_fingerprints — rejection memory
-- ----------------------------------------------------------------------------
-- Never re-surface a role that was already rejected, even when an agency
-- reposts it under a fresh source_job_id.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_rejection_fingerprints (
  fingerprint  TEXT PRIMARY KEY,   -- sha256(company_norm|market|title_norm)
  company_norm TEXT NOT NULL,
  title_norm   TEXT NOT NULL,
  market       TEXT NOT NULL,
  reason       TEXT,
  hit_count    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '180 days'
);


-- ============================================================================
-- 10. job_apply_clicks — conversion analytics + the per-user rate cap
-- ----------------------------------------------------------------------------
-- Personal data: links a user to the roles they were interested in. Prune on a
-- 12-month window (see the nightly prune_notifications cron slot).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_apply_clicks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 11. Indexes
-- ============================================================================
-- The public board's only query shape.
CREATE INDEX IF NOT EXISTS idx_job_listings_public
  ON public.job_listings (market, profession, seniority, posted_at DESC)
  WHERE status = 'approved';

-- The admin queue's only query shape.
CREATE INDEX IF NOT EXISTS idx_job_listings_queue
  ON public.job_listings (source, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_job_listings_url_hash
  ON public.job_listings (canonical_url_hash)
  WHERE canonical_url_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_listings_block
  ON public.job_listings (block_key, posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_listings_last_seen
  ON public.job_listings (source, market, last_seen_at);

CREATE INDEX IF NOT EXISTS idx_job_listings_company
  ON public.job_listings (company_norm);

CREATE INDEX IF NOT EXISTS idx_job_listings_source_job
  ON public.job_listings (source, source_job_id);

CREATE INDEX IF NOT EXISTS idx_job_apply_clicks_user
  ON public.job_apply_clicks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_ingest_runs_recent
  ON public.job_ingest_runs (source, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_source_accounts_source
  ON public.job_source_accounts (source) WHERE enabled;


-- ============================================================================
-- 12. Triggers
-- ============================================================================

-- updated_at (same shape as update_prompts_updated_at)
CREATE OR REPLACE FUNCTION public.update_job_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_listings_updated_at ON public.job_listings;
CREATE TRIGGER job_listings_updated_at
  BEFORE UPDATE ON public.job_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_job_listings_updated_at();

DROP TRIGGER IF EXISTS job_sources_updated_at ON public.job_sources;
CREATE TRIGGER job_sources_updated_at
  BEFORE UPDATE ON public.job_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_job_listings_updated_at();


-- Approve/reject side effects: company counters + rejection memory.
CREATE OR REPLACE FUNCTION public.job_listings_review_side_effects()
RETURNS TRIGGER AS $$
DECLARE
  v_title_norm TEXT;
  v_fingerprint TEXT;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- NOTE: the conflict target is referenced by BARE table name, not
  -- schema-qualified. Postgres rejects `public.job_companies.approved_count`
  -- inside ON CONFLICT DO UPDATE with a missing-FROM-clause error.
  IF NEW.status = 'approved' THEN
    INSERT INTO public.job_companies (name_norm, display_name, approved_count)
    VALUES (NEW.company_norm, NEW.company, 1)
    ON CONFLICT (name_norm) DO UPDATE
      SET approved_count = job_companies.approved_count + 1,
          updated_at     = NOW();

  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.job_companies (name_norm, display_name, rejected_count)
    VALUES (NEW.company_norm, NEW.company, 1)
    ON CONFLICT (name_norm) DO UPDATE
      SET rejected_count = job_companies.rejected_count + 1,
          updated_at     = NOW();

    -- Fingerprint must match rejectionFingerprint() in
    -- server/jobs/lib/dedupe.js: md5 over company_norm|market|title_norm.
    -- md5 rather than sha256 because it is a Postgres built-in — this is a
    -- dedup key, not a security primitive, so pgcrypto is not worth the
    -- extension dependency.
    v_title_norm  := public.slugify(NEW.title);
    v_fingerprint := md5(NEW.company_norm || '|' || NEW.market || '|' || v_title_norm);

    INSERT INTO public.job_rejection_fingerprints
      (fingerprint, company_norm, title_norm, market, reason, hit_count, last_hit_at)
    VALUES
      (v_fingerprint, NEW.company_norm, v_title_norm, NEW.market, NEW.rejection_reason, 0, NULL)
    ON CONFLICT (fingerprint) DO UPDATE
      SET expires_at = NOW() + INTERVAL '180 days';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS job_listings_on_review ON public.job_listings;
CREATE TRIGGER job_listings_on_review
  AFTER UPDATE OF status ON public.job_listings
  FOR EACH ROW EXECUTE FUNCTION public.job_listings_review_side_effects();


-- ============================================================================
-- 13. RPCs
-- ============================================================================

-- View counter. Same shape as increment_prompt_usage: SECURITY DEFINER, gated
-- on approved status, granted to anon + authenticated.
CREATE OR REPLACE FUNCTION public.increment_job_view(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.job_listings
  SET view_count = view_count + 1
  WHERE id = p_id AND status = 'approved';
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_job_view(UUID) TO anon, authenticated;


-- Apply-click counter. Called by GET /api/jobs/:id/apply through the
-- service-role client, so the grant is belt-and-braces rather than required.
CREATE OR REPLACE FUNCTION public.increment_job_apply_click(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.job_listings
  SET apply_click_count = apply_click_count + 1
  WHERE id = p_id AND status = 'approved';
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_job_apply_click(UUID) TO authenticated;


-- Bulk review. SECURITY INVOKER so the admin RLS policy stays the authority —
-- a non-admin calling this updates zero rows rather than being trusted.
-- Approving 40 listings becomes one statement instead of 40 round trips.
CREATE OR REPLACE FUNCTION public.review_job_listings(
  p_ids        UUID[],
  p_status     TEXT DEFAULT NULL,
  p_reason     TEXT DEFAULT NULL,
  p_profession TEXT DEFAULT NULL,
  p_seniority  TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_status IS NOT NULL
     AND p_status NOT IN ('pending','approved','rejected','duplicate','expired','stale') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  IF p_seniority IS NOT NULL AND p_seniority NOT IN ('entry','mid','senior') THEN
    RAISE EXCEPTION 'Invalid seniority: %', p_seniority;
  END IF;

  UPDATE public.job_listings SET
    status = COALESCE(p_status, status),
    -- Overrides, never the generated columns.
    profession_override = COALESCE(p_profession, profession_override),
    seniority_override  = COALESCE(p_seniority,  seniority_override),
    approval_mode = CASE WHEN p_status = 'approved' THEN 'manual' ELSE approval_mode END,
    approved_at   = CASE WHEN p_status = 'approved' THEN NOW()     ELSE approved_at END,
    approved_by   = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE approved_by END,
    rejected_at   = CASE WHEN p_status = 'rejected' THEN NOW()     ELSE rejected_at END,
    rejected_by   = CASE WHEN p_status = 'rejected' THEN auth.uid() ELSE rejected_by END,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_reason ELSE rejection_reason END
  WHERE id = ANY (p_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_job_listings(UUID[], TEXT, TEXT, TEXT, TEXT)
  TO authenticated;


-- Queue counts for the admin header.
CREATE OR REPLACE FUNCTION public.job_queue_stats()
RETURNS TABLE (source TEXT, profession TEXT, seniority TEXT, pending BIGINT)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT l.source, l.profession, l.seniority, COUNT(*)
  FROM public.job_listings l
  WHERE l.status = 'pending'
  GROUP BY l.source, l.profession, l.seniority;
$$;

GRANT EXECUTE ON FUNCTION public.job_queue_stats() TO authenticated;


-- ============================================================================
-- 14. Row Level Security
-- ============================================================================

-- --- job_listings: public reads approved + unexpired; admins read/write all ---
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

-- Expiry is evaluated at READ time, so a role leaves the board the instant it
-- expires without waiting for the nightly sweep.
DROP POLICY IF EXISTS "Anyone can read approved job listings" ON public.job_listings;
CREATE POLICY "Anyone can read approved job listings"
  ON public.job_listings FOR SELECT
  USING (status = 'approved' AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Admins can manage all job listings" ON public.job_listings;
CREATE POLICY "Admins can manage all job listings"
  ON public.job_listings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin')
  );


-- --- Config tables the board must read for attribution badges ---
ALTER TABLE public.job_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read job markets" ON public.job_markets;
CREATE POLICY "Anyone can read job markets"
  ON public.job_markets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage job markets" ON public.job_markets;
CREATE POLICY "Admins can manage job markets"
  ON public.job_markets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read job sources" ON public.job_sources;
CREATE POLICY "Anyone can read job sources"
  ON public.job_sources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage job sources" ON public.job_sources;
CREATE POLICY "Admins can manage job sources"
  ON public.job_sources FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));


-- --- Admin-only tables. No public policy at all. -----------------------------
-- RLS on with no permissive SELECT policy = the anon and authenticated roles
-- see nothing. The service-role client (server/jobs/, Express) bypasses RLS.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'job_source_accounts','job_queries','job_companies',
    'job_ingest_runs','job_rejection_fingerprints','job_apply_clicks',
    'job_listing_apply'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can manage %s" ON public.%I', t, t);
    EXECUTE format($f$
      CREATE POLICY "Admins can manage %s" ON public.%I
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.users
                       WHERE users.id = auth.uid() AND users.role = 'admin'))
    $f$, t, t);
  END LOOP;
END $$;


COMMENT ON TABLE public.job_listings IS
  'Aggregated job vacancies for the public board at /jobs. Nothing is visible '
  'publicly until an admin sets status = approved.';
COMMENT ON TABLE public.job_listing_apply IS
  'Outbound apply URLs. Deliberately separate from job_listings and with no '
  'anon policy — this is what makes the sign-in-to-apply gate unbypassable.';
