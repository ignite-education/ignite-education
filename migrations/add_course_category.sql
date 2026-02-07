-- Migration: Add category column to courses table
-- This allows each course to have a category tag (e.g., "Specialism", "Technical", "Business")

-- Add category column with default value 'Specialism'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Specialism';

-- Update existing courses to have the default category
UPDATE courses SET category = 'Specialism' WHERE category IS NULL;
