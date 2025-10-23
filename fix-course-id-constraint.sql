-- Fix course_id column by removing foreign key constraint first
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the foreign key constraint
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;

-- Step 2: Change the column type from UUID to TEXT
ALTER TABLE lessons ALTER COLUMN course_id TYPE TEXT USING course_id::text;

-- Step 3: Set default value
ALTER TABLE lessons ALTER COLUMN course_id SET DEFAULT 'product-management';

-- Step 4: Verify the change worked
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lessons' AND column_name = 'course_id';

-- Note: We removed the foreign key constraint because we're using text course IDs
-- like 'product-management' instead of UUID references to a courses table
