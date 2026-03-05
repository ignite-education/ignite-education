-- Add author attribution fields to prompt_contributions
-- These are filled by the user when submitting a prompt and carry over to the published prompt on approval

ALTER TABLE public.prompt_contributions
  ADD COLUMN IF NOT EXISTS author_name     TEXT,
  ADD COLUMN IF NOT EXISTS author_image    TEXT,
  ADD COLUMN IF NOT EXISTS author_title    TEXT,
  ADD COLUMN IF NOT EXISTS author_linkedin TEXT;
