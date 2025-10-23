-- =====================================================
-- COMPLETE DATABASE RESET AND NEW SCHEMA (FIXED)
-- This will delete all existing data and create proper tables
-- =====================================================

-- Step 1: Drop existing tables that might conflict (in correct order due to foreign keys)
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS lessons_metadata CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

-- Step 2: Create courses table with TEXT id
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create modules table
CREATE TABLE modules (
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
CREATE TABLE lessons_metadata (
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

-- Step 5: Create lessons table (for lesson content)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  section_number INTEGER NOT NULL DEFAULT 1,
  lesson_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  content JSONB,
  content_text TEXT,
  lesson_description TEXT,
  bullet_points TEXT[],
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for performance
CREATE INDEX idx_courses_id ON courses(id);
CREATE INDEX idx_modules_course ON modules(course_id, module_number);
CREATE INDEX idx_lessons_metadata_course ON lessons_metadata(course_id, module_number, lesson_number);
CREATE INDEX idx_lessons_module_lesson ON lessons(module_number, lesson_number);
CREATE INDEX idx_lessons_course ON lessons(course_id);

-- Step 7: Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for courses
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage courses"
  ON courses FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Step 9: Create RLS policies for modules
CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage modules"
  ON modules FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Step 10: Create RLS policies for lessons_metadata
CREATE POLICY "Anyone can view lessons_metadata"
  ON lessons_metadata FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage lessons_metadata"
  ON lessons_metadata FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Step 11: Create RLS policies for lessons
CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage lessons"
  ON lessons FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Step 12: Insert default course
INSERT INTO courses (id, name, description)
VALUES ('product-management', 'Product Management', 'Complete Product Management course');

-- Step 13: Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 14: Create triggers for updated_at
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_metadata_updated_at
    BEFORE UPDATE ON lessons_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 15: Verify setup
SELECT 'Courses' as table_name, COUNT(*) as count FROM courses
UNION ALL
SELECT 'Modules' as table_name, COUNT(*) as count FROM modules
UNION ALL
SELECT 'Lessons Metadata' as table_name, COUNT(*) as count FROM lessons_metadata
UNION ALL
SELECT 'Lesson Content' as table_name, COUNT(*) as count FROM lessons;

-- Success! Your database is now ready to use with the new curriculum management system.
