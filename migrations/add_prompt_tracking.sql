-- Add real tracking columns to prompts table
ALTER TABLE public.prompts
  ADD COLUMN IF NOT EXISTS real_usage_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_thumbs_up INTEGER NOT NULL DEFAULT 0;

-- RPC function to atomically increment usage count (callable by anon + authenticated)
CREATE OR REPLACE FUNCTION public.increment_prompt_usage(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.prompts
  SET real_usage_count = real_usage_count + 1
  WHERE id = p_id AND status = 'published';
END;
$$;

-- RPC function to atomically increment thumbs up count (callable by anon + authenticated)
CREATE OR REPLACE FUNCTION public.increment_prompt_thumbs_up(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.prompts
  SET real_thumbs_up = real_thumbs_up + 1
  WHERE id = p_id AND status = 'published';
END;
$$;

-- RPC function to atomically decrement thumbs up count (callable by anon + authenticated)
CREATE OR REPLACE FUNCTION public.decrement_prompt_thumbs_up(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.prompts
  SET real_thumbs_up = GREATEST(real_thumbs_up - 1, 0)
  WHERE id = p_id AND status = 'published';
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.increment_prompt_usage(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_prompt_thumbs_up(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_prompt_thumbs_up(UUID) TO anon, authenticated;
