-- Migration: Add course_type and structure_type fields to courses table
-- This enables course categorization and content display mode configuration

-- Add course_type field (standardizes category usage)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type TEXT
  DEFAULT 'specialism'
  CHECK (course_type IN ('specialism', 'skill', 'subject'));

-- Migrate existing category data to course_type
UPDATE courses
SET course_type = LOWER(category)
WHERE course_type IS NULL
  AND category IS NOT NULL
  AND LOWER(category) IN ('specialism', 'skill', 'subject');

-- Add structure_type field for content display mode
ALTER TABLE courses ADD COLUMN IF NOT EXISTS structure_type TEXT
  DEFAULT 'modules_and_lessons'
  CHECK (structure_type IN ('modules_and_lessons', 'lessons_only'));

-- Set default for existing courses
UPDATE courses
SET structure_type = 'modules_and_lessons'
WHERE structure_type IS NULL;

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_structure_type ON courses(structure_type);

-- Documentation
COMMENT ON COLUMN courses.course_type IS 'Type of course: specialism (career), skill (ability), or subject (academic)';
COMMENT ON COLUMN courses.structure_type IS 'Display mode: modules_and_lessons (hierarchical) or lessons_only (flat)';
