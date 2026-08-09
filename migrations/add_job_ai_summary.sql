-- AI-written descriptions for the job board.
--
-- The card has always shown `description_snippet`: the first 300 characters of
-- the advert, cut on a word boundary by buildSnippet() in
-- server/jobs/lib/normalise.js. It reads like what it is -- an arbitrary
-- truncation that usually stops mid-thought, and often spends its whole budget
-- on "we're a fast-growing team" before reaching anything about the role.
--
-- These columns hold a written summary of `description_text` instead, generated
-- by server/jobs/lib/summarise.js and rendered in the snippet's place.
--
-- WHY NOT JUST OVERWRITE description_snippet
-- Because it would not survive the night. `description_snippet` is in
-- VOLATILE_FIELDS (server/jobs/lib/persist.js), so the ingest recomputes and
-- rewrites it for every listing on every run, whether or not the source changed.
-- A summary written there would be silently replaced by a truncation within 24
-- hours, with nothing in the logs to say so. `company_logo_url` is out of that
-- list for the same class of reason, and `ai_summary` must stay out of it too.
--
-- Apply in the Supabase SQL editor (repo convention -- there is no Supabase CLI
-- in this project). Safe to re-run.

/* -------------------------------------------------------------------------- */
/* 1. job_listings -- summary state                                           */
/* -------------------------------------------------------------------------- */

ALTER TABLE public.job_listings
  -- The generated summary. NULL until one exists; the board falls back to
  -- description_snippet, so a listing without one renders exactly as before.
  ADD COLUMN IF NOT EXISTS ai_summary        TEXT,

  -- SHA-256 of the description_text this summary was generated from.
  --
  -- This is the entire cost-control story. The ingest re-fetches every ATS
  -- board in full every night and rewrites description_text unconditionally --
  -- there is no content-hash short-circuit in persist.js -- so "has no summary
  -- yet" would regenerate nothing after the first run, while "was re-ingested"
  -- would regenerate all 300 listings nightly, forever. Comparing this hash to
  -- the current text regenerates only genuinely edited adverts.
  ADD COLUMN IF NOT EXISTS ai_summary_hash   TEXT,

  -- ok | skipped | failed.
  --
  --   ok      -- ai_summary is current for ai_summary_hash.
  --   skipped -- deliberately never summarised. Set automatically when the
  --              source gave only an excerpt (is_snippet, i.e. adzuna/reed) or
  --              the text is too short to summarise, and settable by hand to
  --              opt one listing out permanently. The worklist never returns
  --              these, so a manual 'skipped' is not undone by the next run.
  --   failed  -- the last attempt errored. Retried on the next run.
  ADD COLUMN IF NOT EXISTS ai_summary_status TEXT,

  ADD COLUMN IF NOT EXISTS ai_summary_at     TIMESTAMPTZ;

ALTER TABLE public.job_listings
  DROP CONSTRAINT IF EXISTS job_listings_ai_summary_status_check;

ALTER TABLE public.job_listings
  ADD CONSTRAINT job_listings_ai_summary_status_check
  CHECK (ai_summary_status IS NULL OR ai_summary_status IN ('ok', 'skipped', 'failed'));

/* -------------------------------------------------------------------------- */
/* 2. Index                                                                    */
/* -------------------------------------------------------------------------- */

-- The summariser's worklist is: approved listings that have real description
-- text and are not opted out. Partial on status because the board only ever
-- summarises what it would actually display, and the vast majority of rows in
-- this table are rejected or expired.
CREATE INDEX IF NOT EXISTS idx_job_listings_ai_summary_worklist
  ON public.job_listings (ai_summary_status, ai_summary_at)
  WHERE status = 'approved';
