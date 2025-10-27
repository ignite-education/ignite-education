-- Update courses table to add missing columns
-- This version works with the existing table structure that has a 'name' column

-- First, ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default for id column if it doesn't have one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'courses' AND column_name = 'id') THEN
    ALTER TABLE courses ALTER COLUMN id SET DEFAULT uuid_generate_v4();
  END IF;
END $$;

-- Add title column if it doesn't exist (separate from name)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'title') THEN
    ALTER TABLE courses ADD COLUMN title TEXT;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'status') THEN
    ALTER TABLE courses ADD COLUMN status TEXT DEFAULT 'requested' CHECK (status IN ('live', 'coming_soon', 'requested'));
  END IF;
END $$;

-- Add modules column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'modules') THEN
    ALTER TABLE courses ADD COLUMN modules TEXT;
  END IF;
END $$;

-- Add lessons column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'lessons') THEN
    ALTER TABLE courses ADD COLUMN lessons INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'description') THEN
    ALTER TABLE courses ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add display_order column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'display_order') THEN
    ALTER TABLE courses ADD COLUMN display_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enable Row Level Security if not already enabled
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON courses;
DROP POLICY IF EXISTS "Allow authenticated insert" ON courses;
DROP POLICY IF EXISTS "Allow authenticated update" ON courses;
DROP POLICY IF EXISTS "Allow authenticated delete" ON courses;

-- Allow public read access
CREATE POLICY "Allow public read access" ON courses
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert, update, delete
CREATE POLICY "Allow authenticated insert" ON courses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON courses
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON courses
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Insert initial courses using the 'name' column for the existing structure
-- Note: Using a different approach - insert only the columns we're sure exist
INSERT INTO courses (id, name, status, modules, lessons, description, display_order, title)
SELECT
  uuid_generate_v4(),
  'Product Manager',
  'live',
  '3',
  15,
  'Master the fundamentals of product management, from strategy to execution. This comprehensive course is designed for complete beginners and will take you through everything you need to know to start your career as a Product Manager.',
  1,
  'Product Manager'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Product Manager');

INSERT INTO courses (id, name, status, modules, lessons, description, display_order, title)
SELECT
  uuid_generate_v4(),
  'Cyber Security Analyst',
  'coming_soon',
  'Multiple',
  0,
  'Learn essential cybersecurity skills to protect systems and data from threats. This comprehensive course will prepare you for a career as a Cyber Security Analyst with hands-on training in threat detection, security analysis, and incident response.',
  2,
  'Cyber Security Analyst'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Cyber Security Analyst');

INSERT INTO courses (id, name, status, modules, lessons, description, display_order, title)
SELECT
  uuid_generate_v4(),
  'Data Analyst',
  'coming_soon',
  'Multiple',
  0,
  'Analyze data to drive business insights and inform decision-making. Learn statistical analysis, data visualization, and business intelligence tools to become a skilled Data Analyst.',
  3,
  'Data Analyst'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'Data Analyst');

INSERT INTO courses (id, name, status, modules, lessons, description, display_order, title)
SELECT
  uuid_generate_v4(),
  'UX Designer',
  'coming_soon',
  'Multiple',
  0,
  'Design user-centered experiences that delight and engage. Master the principles of user experience design, from research and wireframing to prototyping and testing.',
  4,
  'UX Designer'
WHERE NOT EXISTS (SELECT 1 FROM courses WHERE name = 'UX Designer');
