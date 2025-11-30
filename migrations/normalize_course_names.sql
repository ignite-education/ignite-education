-- Normalize course names to use hyphens instead of spaces
-- ONLY affects: Cyber Security Analyst, Data Analyst, UX Designer
-- Does NOT touch Product Manager or any other courses
-- Run this migration in Supabase SQL Editor

-- Wrap everything in a transaction
BEGIN;

-- Drop ONLY the lessons FK constraint (the one causing the error)
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;

-- Update the 3 courses (parent table first)
UPDATE courses SET name = 'cyber-security-analyst' WHERE name = 'Cyber Security Analyst';
UPDATE courses SET name = 'data-analyst' WHERE name = 'Data Analyst';
UPDATE courses SET name = 'ux-designer' WHERE name = 'UX Designer';

-- Update lessons table for these 3 courses only
UPDATE lessons SET course_id = 'cyber-security-analyst' WHERE course_id = 'Cyber Security Analyst';
UPDATE lessons SET course_id = 'data-analyst' WHERE course_id = 'Data Analyst';
UPDATE lessons SET course_id = 'ux-designer' WHERE course_id = 'UX Designer';

-- Re-add lessons FK constraint
ALTER TABLE lessons ADD CONSTRAINT lessons_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(name) ON DELETE CASCADE;

COMMIT;

-- Verify the changes (should show hyphenated names for the 3 courses)
SELECT name, title, status FROM courses ORDER BY name;
