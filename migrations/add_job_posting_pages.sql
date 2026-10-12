-- ============================================================================
-- Per-job pages + Google for Jobs (JobPosting) eligibility
--
-- Companion to next-app/src/app/jobs/[professionSlug]/[jobSlug]/page.tsx and
-- server/jobs/lib/googleIndexing.js. See "Job board" in docs/ARCHITECTURE.md.
--
-- Apply by hand in the Supabase SQL editor. Idempotent.
-- ============================================================================

-- 1. Per-source opt-out from JobPosting markup, the sitemap and the Indexing
--    API. Aggregator feeds (Reed, Adzuna) are syndicated inventory whose terms
--    forbid redistribution to other aggregators — which is precisely what
--    Google for Jobs is. ATS feeds are the employer's own data and stay in.
--
--    The per-job PAGE still renders for every listing; what this gates is
--    whether the page carries JobPosting JSON-LD and is announced to Google.
ALTER TABLE public.job_sources
  ADD COLUMN IF NOT EXISTS allow_jobposting BOOLEAN NOT NULL DEFAULT true;

UPDATE public.job_sources SET allow_jobposting = false WHERE kind = 'aggregator';

COMMENT ON COLUMN public.job_sources.allow_jobposting IS
  'false = syndicated inventory whose terms forbid redistribution to other aggregators. '
  'Listings from this source get a per-job page but no JobPosting JSON-LD, no sitemap '
  'entry and no Indexing API call. New aggregator sources must be seeded with false.';

-- 2. Google Indexing API state, owned by server/jobs/lib/googleIndexing.js.
--    NOT in VOLATILE_FIELDS (persist.js): the nightly refresh must never
--    clobber these, or every listing would be re-announced every night and
--    burn the 200/day quota on no-ops.
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS index_notified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS index_notified_type TEXT
    CHECK (index_notified_type IN ('URL_UPDATED', 'URL_DELETED')),
  ADD COLUMN IF NOT EXISTS index_notify_error  TEXT;

COMMENT ON COLUMN public.job_listings.index_notified_type IS
  'Last Indexing API notification sent for this listing''s page. URL_UPDATED means Google '
  'has been told the page exists; URL_DELETED means it has been told the page is gone. '
  'NULL = never announced.';

-- The two worklist shapes in googleIndexing.js: "announced and now dead" and
-- "live and never announced".
CREATE INDEX IF NOT EXISTS idx_job_listings_index_notify
  ON public.job_listings (status, index_notified_type);
