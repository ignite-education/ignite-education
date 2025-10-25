-- Create course_requests table to track user interest in upcoming/requested courses
CREATE TABLE IF NOT EXISTS public.course_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'requested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate requests from same user for same course
  UNIQUE(user_id, course_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_course_requests_course_name ON public.course_requests(course_name);
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON public.course_requests(status);
CREATE INDEX IF NOT EXISTS idx_course_requests_created_at ON public.course_requests(created_at);

-- Enable RLS
ALTER TABLE public.course_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert their own course requests"
  ON public.course_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own course requests"
  ON public.course_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all course requests"
  ON public.course_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE public.course_requests IS 'Tracks user interest in upcoming and requested courses for analytics';
