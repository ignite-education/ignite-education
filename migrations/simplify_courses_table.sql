-- Migration: Simplify courses table to use name as primary key instead of UUID
-- This removes the unnecessary UUID id column and uses name as the identifier

-- Step 1: Add name column if it doesn't exist (should already exist from previous migrations)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS name TEXT;

-- Step 2: Populate name column for any existing courses that don't have it
UPDATE courses
SET name = LOWER(REPLACE(title, ' ', '-'))
WHERE name IS NULL OR name = '';

-- Step 3: Create a new courses table with name as primary key
CREATE TABLE IF NOT EXISTS courses_new (
  name TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('live', 'coming_soon', 'requested')),
  modules TEXT,
  lessons INTEGER,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  module_structure JSONB,
  tutor_name TEXT,
  tutor_position TEXT,
  tutor_description TEXT,
  tutor_image TEXT,
  linkedin_link TEXT,
  calendly_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Copy data from old table to new table
INSERT INTO courses_new (
  name, title, status, modules, lessons, description, display_order,
  module_structure, tutor_name, tutor_position, tutor_description,
  tutor_image, linkedin_link, calendly_link, created_at, updated_at
)
SELECT
  name, title, status, modules, lessons, description, display_order,
  module_structure, tutor_name, tutor_position, tutor_description,
  tutor_image, linkedin_link, calendly_link, created_at, updated_at
FROM courses
WHERE name IS NOT NULL AND name != ''
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  modules = EXCLUDED.modules,
  lessons = EXCLUDED.lessons,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  module_structure = EXCLUDED.module_structure,
  tutor_name = EXCLUDED.tutor_name,
  tutor_position = EXCLUDED.tutor_position,
  tutor_description = EXCLUDED.tutor_description,
  tutor_image = EXCLUDED.tutor_image,
  linkedin_link = EXCLUDED.linkedin_link,
  calendly_link = EXCLUDED.calendly_link,
  updated_at = EXCLUDED.updated_at;

-- Step 5: Drop old table and rename new table
DROP TABLE IF EXISTS courses CASCADE;
ALTER TABLE courses_new RENAME TO courses;

-- Step 6: Recreate RLS policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON courses;
DROP POLICY IF EXISTS "Allow authenticated insert" ON courses;
DROP POLICY IF EXISTS "Allow authenticated update" ON courses;
DROP POLICY IF EXISTS "Allow authenticated delete" ON courses;

CREATE POLICY "Allow public read access" ON courses
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert" ON courses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON courses
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON courses
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Step 7: Create index on display_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_courses_display_order ON courses(display_order);

-- Step 8: Update any foreign key references in other tables (only if tables exist)
-- Update lessons table if it exists and has course_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lessons') THEN
    ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;
    ALTER TABLE lessons ADD CONSTRAINT lessons_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES courses(name) ON DELETE CASCADE;
  END IF;
END $$;

-- Update lessons_metadata table if it exists and has course_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lessons_metadata') THEN
    ALTER TABLE lessons_metadata DROP CONSTRAINT IF EXISTS lessons_metadata_course_id_fkey;
    ALTER TABLE lessons_metadata ADD CONSTRAINT lessons_metadata_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES courses(name) ON DELETE CASCADE;
  END IF;
END $$;

-- Update modules table if it exists and has course_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'modules') THEN
    ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_course_id_fkey;
    ALTER TABLE modules ADD CONSTRAINT modules_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES courses(name) ON DELETE CASCADE;
  END IF;
END $$;

-- Update completed_lessons table if it exists and has course_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'completed_lessons') THEN
    ALTER TABLE completed_lessons DROP CONSTRAINT IF EXISTS completed_lessons_course_id_fkey;
    ALTER TABLE completed_lessons ADD CONSTRAINT completed_lessons_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES courses(name) ON DELETE CASCADE;
  END IF;
END $$;

-- Update lesson_progress table if it exists and has course_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lesson_progress') THEN
    ALTER TABLE lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_course_id_fkey;
    ALTER TABLE lesson_progress ADD CONSTRAINT lesson_progress_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES courses(name) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON TABLE courses IS 'Courses table using name as primary key (e.g., product-management)';
