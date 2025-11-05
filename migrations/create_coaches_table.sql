-- Create coaches table for managing course coaches/tutors
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES courses(name) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  description TEXT,
  image_url TEXT,
  linkedin_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster course-based queries
CREATE INDEX IF NOT EXISTS idx_coaches_course_id ON coaches(course_id);
CREATE INDEX IF NOT EXISTS idx_coaches_display_order ON coaches(display_order);

-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active coaches
CREATE POLICY "Anyone can view active coaches"
  ON coaches
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users to manage coaches (update this for production to restrict to admins only)
CREATE POLICY "Authenticated users can manage coaches"
  ON coaches
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coaches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaches_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW
  EXECUTE FUNCTION update_coaches_updated_at();
