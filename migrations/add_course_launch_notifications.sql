-- Add course launch notification support
-- 1. Add notified_at column to track which waitlist users have been notified
-- 2. Create priority_tokens table for secure enrollment links

-- Add notified_at column to course_requests
ALTER TABLE public.course_requests
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Create index for efficient queries on unnotified users
CREATE INDEX IF NOT EXISTS idx_course_requests_notified_at
ON public.course_requests(notified_at);

-- Create priority_tokens table for secure enrollment links
CREATE TABLE IF NOT EXISTS public.priority_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One priority token per user per course
  UNIQUE(user_id, course_name)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_priority_tokens_token ON public.priority_tokens(token);
CREATE INDEX IF NOT EXISTS idx_priority_tokens_expires_at ON public.priority_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_priority_tokens_course_name ON public.priority_tokens(course_name);

-- Enable RLS
ALTER TABLE public.priority_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all tokens (used by backend)
-- Note: Frontend won't directly access this table, all access is via API

-- Policy: Users can view their own tokens
CREATE POLICY "Users can view their own priority tokens"
  ON public.priority_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all tokens
CREATE POLICY "Admins can view all priority tokens"
  ON public.priority_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE public.priority_tokens IS 'Stores time-limited priority enrollment tokens for course launch notifications';
COMMENT ON COLUMN public.course_requests.notified_at IS 'Timestamp when user was notified about course launch';
