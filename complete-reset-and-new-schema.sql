-- =====================================================
-- COMPLETE DATABASE RESET AND NEW SCHEMA
-- This will delete all existing data and create proper tables
-- =====================================================

-- Step 1: Clean all existing lesson data
DELETE FROM lessons;

-- Step 2: Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  bullet_points TEXT[], -- Array of bullet point descriptions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, module_number)
);

-- Step 4: Create lessons_metadata table (for lesson-level info)
CREATE TABLE IF NOT EXISTS lessons_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  lesson_name TEXT NOT NULL,
  description TEXT,
  bullet_points TEXT[], -- Array of bullet point descriptions for upcoming lessons card
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, module_number, lesson_number)
);

-- Step 5: Ensure lessons table has proper structure
-- (Keep existing lessons table but ensure it has all needed columns)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_description TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS bullet_points TEXT[];

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_id ON courses(id);
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id, module_number);
CREATE INDEX IF NOT EXISTS idx_lessons_metadata_course ON lessons_metadata(course_id, module_number, lesson_number);

-- Step 7: Enable RLS on new tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_metadata ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users can manage courses" ON courses;
DROP POLICY IF EXISTS "Anyone can view modules" ON modules;
DROP POLICY IF EXISTS "Authenticated users can manage modules" ON modules;
DROP POLICY IF EXISTS "Anyone can view lessons_metadata" ON lessons_metadata;
DROP POLICY IF EXISTS "Authenticated users can manage lessons_metadata" ON lessons_metadata;

CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage courses"
  ON courses FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage modules"
  ON modules FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view lessons_metadata"
  ON lessons_metadata FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage lessons_metadata"
  ON lessons_metadata FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Step 9: Insert default course
INSERT INTO courses (id, name, description)
VALUES ('product-management', 'Product Management', 'Complete Product Management course')
ON CONFLICT (id) DO NOTHING;

-- Step 10: Verify setup
SELECT 'Courses' as table_name, COUNT(*) as count FROM courses
UNION ALL
SELECT 'Modules' as table_name, COUNT(*) as count FROM modules
UNION ALL
SELECT 'Lessons Metadata' as table_name, COUNT(*) as count FROM lessons_metadata
UNION ALL
SELECT 'Lesson Content' as table_name, COUNT(*) as count FROM lessons;
