-- Fix lessons table schema to match application requirements
-- This script safely migrates from UUID course_id to TEXT course_id

-- First, add missing columns if they don't exist
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_name TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_text TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Check if course_id is UUID type and change it to TEXT
-- First, we need to drop any foreign key constraints or indexes on course_id
DO $$
BEGIN
    -- Drop the default value first if it exists
    ALTER TABLE lessons ALTER COLUMN course_id DROP DEFAULT;
EXCEPTION
    WHEN undefined_column THEN NULL;
END $$;

-- Change course_id from UUID to TEXT
-- This will fail if there's data that can't be converted, but that's okay for empty tables
ALTER TABLE lessons ALTER COLUMN course_id TYPE TEXT USING course_id::text;

-- Set the default value for course_id
ALTER TABLE lessons ALTER COLUMN course_id SET DEFAULT 'product-management';

-- Make sure NOT NULL constraints are properly set
DO $$
BEGIN
    ALTER TABLE lessons ALTER COLUMN lesson_name SET NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE lessons ALTER COLUMN title SET NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_lessons_module_lesson ON lessons(module_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);

-- Enable Row Level Security if not already enabled
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON lessons;

CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage lessons"
  ON lessons FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Update trigger
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;

CREATE OR REPLACE FUNCTION update_lesson_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_lesson_updated_at();
