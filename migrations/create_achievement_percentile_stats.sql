-- Pre-computed per-user percentile rankings, refreshed daily by pg_cron
CREATE TABLE IF NOT EXISTS public.achievement_percentile_stats (
  user_id UUID NOT NULL,
  course_id TEXT NOT NULL,
  percentile INTEGER NOT NULL,  -- 1-100, lower = better (top 5% = 5)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

ALTER TABLE public.achievement_percentile_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own percentile"
  ON public.achievement_percentile_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Function to refresh all percentile rankings
CREATE OR REPLACE FUNCTION refresh_achievement_percentile_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO public.achievement_percentile_stats (user_id, course_id, percentile, updated_at)
  SELECT
    user_id::uuid,
    course_id,
    GREATEST(1, CEIL((1.0 - percent_rank() OVER (
      PARTITION BY course_id ORDER BY avg_score ASC
    )) * 100))::integer,
    NOW()
  FROM (
    SELECT user_id, course_id,
      AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) AS avg_score
    FROM public.question_results
    GROUP BY user_id, course_id
  ) scores
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET percentile = EXCLUDED.percentile, updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run once immediately to populate
SELECT refresh_achievement_percentile_stats();

-- Schedule daily refresh at 00:15 UTC (requires pg_cron extension)
-- Run this in the Supabase SQL editor:
--   SELECT cron.schedule('refresh-achievement-percentile', '15 0 * * *', 'SELECT refresh_achievement_percentile_stats()');
