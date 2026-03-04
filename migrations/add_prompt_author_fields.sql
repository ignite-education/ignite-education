-- Add author attribution fields to prompts table
ALTER TABLE prompts
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_image TEXT,
  ADD COLUMN IF NOT EXISTS author_title TEXT,
  ADD COLUMN IF NOT EXISTS author_linkedin TEXT;
