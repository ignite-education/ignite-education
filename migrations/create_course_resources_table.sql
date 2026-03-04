-- Create course_resources table for course-specific learning resources
CREATE TABLE IF NOT EXISTS public.course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching resources by course
CREATE INDEX IF NOT EXISTS idx_course_resources_course_id
  ON public.course_resources(course_id, display_order);

-- Enable RLS
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read resources
CREATE POLICY "Authenticated users can read resources"
  ON public.course_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert, update, delete
CREATE POLICY "Admins can manage resources"
  ON public.course_resources
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Auto-update updated_at
CREATE TRIGGER update_course_resources_updated_at
  BEFORE UPDATE ON public.course_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
