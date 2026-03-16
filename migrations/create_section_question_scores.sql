-- Section question scores: stores best score (0-10) per user per section
-- Used to calculate lesson scores as average of section question scores (%)
CREATE TABLE section_question_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  module_number INT NOT NULL,
  lesson_number INT NOT NULL,
  section_number INT NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 10),
  question_text TEXT,
  answer_text TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One best score per user per section (enables UPSERT with GREATEST)
CREATE UNIQUE INDEX idx_sqs_user_section
  ON section_question_scores (user_id, course_id, module_number, lesson_number, section_number);

-- For per-lesson aggregation (getLessonScores)
CREATE INDEX idx_sqs_user_lesson
  ON section_question_scores (user_id, course_id, module_number, lesson_number);

-- For global scores endpoint (cross-user aggregation)
CREATE INDEX idx_sqs_course_lesson
  ON section_question_scores (course_id, module_number, lesson_number);

-- RLS
ALTER TABLE section_question_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scores"
  ON section_question_scores FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own scores"
  ON section_question_scores FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Update percentile stats function to use section_question_scores
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
      SUM(score)::float / (COUNT(*) * 10) AS avg_score
    FROM public.section_question_scores
    GROUP BY user_id, course_id
  ) scores
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET percentile = EXCLUDED.percentile, updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Erase old scoring data
TRUNCATE question_results;
TRUNCATE knowledge_check_results;
DELETE FROM achievement_percentile_stats;
