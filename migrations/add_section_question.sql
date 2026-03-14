-- Add section_question column to lessons table
-- This stores a question tied to each H2 section group that users must answer before continuing
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS section_question TEXT;
