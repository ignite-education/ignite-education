-- Pre-computed community learner counts, refreshed daily by pg_cron
CREATE TABLE IF NOT EXISTS public.community_stats (
  country TEXT PRIMARY KEY,  -- ISO code ('GB', 'US', etc.) or 'global' for all users
  learner_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: anyone can read, only functions can write
ALTER TABLE public.community_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community stats"
  ON public.community_stats FOR SELECT
  USING (true);

-- Function to refresh all counts
CREATE OR REPLACE FUNCTION refresh_community_stats()
RETURNS void AS $$
BEGIN
  -- Upsert per-country counts for supported countries
  INSERT INTO public.community_stats (country, learner_count, updated_at)
  SELECT country, COUNT(*)::integer, NOW()
  FROM public.users
  WHERE country IN ('GB', 'US', 'IN', 'FR', 'DE', 'IT', 'ES')
  GROUP BY country
  ON CONFLICT (country)
  DO UPDATE SET learner_count = EXCLUDED.learner_count, updated_at = EXCLUDED.updated_at;

  -- Upsert global count (all users)
  INSERT INTO public.community_stats (country, learner_count, updated_at)
  VALUES ('global', (SELECT COUNT(*)::integer FROM public.users), NOW())
  ON CONFLICT (country)
  DO UPDATE SET learner_count = EXCLUDED.learner_count, updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run once immediately to populate
SELECT refresh_community_stats();

-- Schedule daily refresh at midnight UTC (requires pg_cron extension)
-- Run this in the Supabase SQL editor:
--   SELECT cron.schedule('refresh-community-stats', '0 0 * * *', 'SELECT refresh_community_stats()');
