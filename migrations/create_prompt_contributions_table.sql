-- Create prompt_contributions table for user-submitted prompt ideas (admin review required)
CREATE TABLE IF NOT EXISTS public.prompt_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_prompt TEXT NOT NULL,
  profession TEXT NOT NULL,
  llm_tools TEXT[] NOT NULL DEFAULT '{}',
  complexity TEXT NOT NULL CHECK (complexity IN ('Low', 'Mid', 'High')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin review queries
CREATE INDEX IF NOT EXISTS idx_prompt_contributions_status ON public.prompt_contributions(status);
CREATE INDEX IF NOT EXISTS idx_prompt_contributions_user_id ON public.prompt_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_contributions_created_at ON public.prompt_contributions(created_at);

-- Enable RLS
ALTER TABLE public.prompt_contributions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own contributions
CREATE POLICY "Users can insert their own prompt contributions"
  ON public.prompt_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own contributions
CREATE POLICY "Users can view their own prompt contributions"
  ON public.prompt_contributions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admins can view all contributions
CREATE POLICY "Admins can view all prompt contributions"
  ON public.prompt_contributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update status
CREATE POLICY "Admins can update prompt contributions"
  ON public.prompt_contributions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

COMMENT ON TABLE public.prompt_contributions IS 'User-submitted prompt contributions pending admin review';
