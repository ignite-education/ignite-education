-- COMPLETE DATABASE RESET FOR LESSON CONTENT
-- WARNING: This will delete ALL lesson data. Make sure this is what you want!

-- Step 1: Drop all existing lesson content
DELETE FROM lessons;

-- Step 2: Reset the sequence (if using auto-increment IDs)
-- This ensures IDs start fresh from the beginning

-- Step 3: Verify deletion
SELECT COUNT(*) as total_lessons FROM lessons;
-- Should return 0

-- Step 4: Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lessons'
ORDER BY ordinal_position;

-- This will show you the current table structure
