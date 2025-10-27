-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('live', 'coming_soon', 'requested')),
  modules TEXT,
  lessons INTEGER,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
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

-- Insert initial courses
INSERT INTO courses (title, status, modules, lessons, description, display_order) VALUES
  ('Product Manager', 'live', '3', 15, 'Master the fundamentals of product management, from strategy to execution.', 1),
  ('Cyber Security Analyst', 'coming_soon', 'Multiple', 0, 'Learn essential cybersecurity skills to protect systems and data from threats.', 2),
  ('Data Analyst', 'coming_soon', 'Multiple', 0, 'Analyze data to drive business insights and drive decision-making.', 3),
  ('UX Designer', 'coming_soon', 'Multiple', 0, 'Design user-centered experiences that delight and engage.', 4)
ON CONFLICT (id) DO NOTHING;
