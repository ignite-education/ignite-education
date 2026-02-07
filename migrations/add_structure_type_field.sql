-- Migration: Add structure_type field to courses table
-- Note: course_type field already exists in the database
-- This migration only adds the content display mode field

-- Add structure_type field for content display mode
ALTER TABLE courses ADD COLUMN IF NOT EXISTS structure_type TEXT
  DEFAULT 'modules_and_lessons'
  CHECK (structure_type IN ('modules_and_lessons', 'lessons_only'));

-- Set default for existing courses
UPDATE courses
SET structure_type = 'modules_and_lessons'
WHERE structure_type IS NULL;

-- Add indexes for query performance (course_type index may already exist)
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_structure_type ON courses(structure_type);

-- Documentation
COMMENT ON COLUMN courses.course_type IS 'Type of course: specialism (career), skill (ability), or subject (academic)';
COMMENT ON COLUMN courses.structure_type IS 'Display mode: modules_and_lessons (hierarchical) or lessons_only (flat)';
