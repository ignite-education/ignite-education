-- Add columns to store detailed module and lesson structure
-- This will allow us to save the nested module/lesson data from the Course Management UI

-- Add a JSONB column to store the full module and lesson structure
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS module_structure JSONB;

-- Update comment to explain the structure
COMMENT ON COLUMN courses.module_structure IS 'Stores the full course structure: [{ name: "Module 1", lessons: [{ name: "Lesson 1" }, { name: "Lesson 2" }] }]';

-- The 'modules' and 'lessons' columns will remain for backward compatibility and quick counts
-- module_structure will contain the detailed nested structure

-- Example structure:
-- [
--   {
--     "name": "Introduction to Product Management",
--     "lessons": [
--       { "name": "What is Product Management?" },
--       { "name": "Role of a Product Manager" }
--     ]
--   },
--   {
--     "name": "Product Strategy",
--     "lessons": [
--       { "name": "Market Research" },
--       { "name": "Competitive Analysis" }
--     ]
--   }
-- ]
