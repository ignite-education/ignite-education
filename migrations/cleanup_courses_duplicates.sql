-- Cleanup script for courses table
-- This script removes duplicate and incomplete course entries

-- Step 1: Show current courses for review
SELECT id, name, title, status, modules, lessons, display_order, description
FROM courses
ORDER BY display_order, name;

-- Step 2: Delete courses that have NULL or empty modules AND lessons = 0
-- These are likely incomplete/test entries
DELETE FROM courses
WHERE (modules IS NULL OR modules = '' OR modules = '-')
  AND (lessons = 0 OR lessons IS NULL)
  AND name != 'Product Management'; -- Keep the main product management course

-- Step 3: Delete duplicate entries where both name and title are identical
-- Keep only the one with the highest display_order (most recent/complete)
DELETE FROM courses a
USING courses b
WHERE a.id < b.id
  AND a.name = b.name
  AND a.title = b.title;

-- Step 4: Ensure all courses have proper values
-- Set modules to 'Multiple' if it's NULL or empty
UPDATE courses
SET modules = 'Multiple'
WHERE modules IS NULL OR modules = '' OR modules = '-';

-- Step 5: Ensure all courses have a display_order
UPDATE courses
SET display_order = 999
WHERE display_order IS NULL OR display_order = 0;

-- Step 6: Standardize display_order for the main courses
UPDATE courses SET display_order = 1 WHERE LOWER(name) LIKE '%product%manager%' OR LOWER(title) LIKE '%product%manager%';
UPDATE courses SET display_order = 2 WHERE LOWER(name) LIKE '%cyber%security%' OR LOWER(title) LIKE '%cyber%security%';
UPDATE courses SET display_order = 3 WHERE LOWER(name) LIKE '%data%analyst%' OR LOWER(title) LIKE '%data%analyst%';
UPDATE courses SET display_order = 4 WHERE LOWER(name) LIKE '%ux%designer%' OR LOWER(title) LIKE '%ux%designer%';

-- Step 7: Show final result
SELECT id, name, title, status, modules, lessons, display_order
FROM courses
ORDER BY display_order, name;
