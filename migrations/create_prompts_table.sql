-- Create prompts table (replaces static prompts.json)
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  full_prompt TEXT NOT NULL,
  profession TEXT NOT NULL,
  llm_tools TEXT[] NOT NULL DEFAULT '{}',
  complexity TEXT NOT NULL CHECK (complexity IN ('Low', 'Mid', 'High')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  contribution_id UUID REFERENCES public.prompt_contributions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompts_status ON public.prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_profession ON public.prompts(profession);
CREATE INDEX IF NOT EXISTS idx_prompts_slug ON public.prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at DESC);

-- Enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Public read for published prompts (anon + authenticated)
CREATE POLICY "Anyone can read published prompts"
  ON public.prompts
  FOR SELECT
  USING (status = 'published');

-- Admin full CRUD
CREATE POLICY "Admins can manage all prompts"
  ON public.prompts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add review tracking columns to prompt_contributions
ALTER TABLE public.prompt_contributions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON TABLE public.prompts IS 'Published AI prompt templates for the prompt toolkit';
