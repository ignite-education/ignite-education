-- Create certificates table to track course completion certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON public.certificates(certificate_number);

-- Enable Row Level Security
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policies for certificates
-- Users can view their own certificates
CREATE POLICY "Users can view their own certificates" ON public.certificates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view certificates by certificate number (for public verification)
CREATE POLICY "Anyone can view certificates by number" ON public.certificates
  FOR SELECT
  USING (true);

-- Only the system can insert certificates (via service role)
CREATE POLICY "System can insert certificates" ON public.certificates
  FOR INSERT
  WITH CHECK (true);
