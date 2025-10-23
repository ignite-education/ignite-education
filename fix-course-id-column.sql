-- Simple fix to change course_id from UUID to TEXT
-- Run this in your Supabase SQL Editor

-- Step 1: Change the column type
ALTER TABLE lessons ALTER COLUMN course_id TYPE TEXT USING course_id::text;

-- Step 2: Set default value
ALTER TABLE lessons ALTER COLUMN course_id SET DEFAULT 'product-management';

-- Step 3: Verify the change worked
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lessons' AND column_name = 'course_id';
