-- Lesson checkpoint: one graded checkpoint at the end of each lesson.
--
-- Replaces the per-section `scored_question` gates and `section_question_scores`.
-- Three questions are drawn from the existing `lesson_questions` bank, each graded
-- 0-10, and the average gates the lesson at 50%.
--
-- Why a new table rather than reshaping the old one: `section_question_scores` was
-- keyed on `section_number`, a positional index into the lesson's block list that
-- CurriculumUpload renumbers on every save. Every score row in production had
-- already drifted off the block it belonged to. A checkpoint belongs to a *lesson*,
-- and each answer carries the stable `lesson_questions.id` it was asked from.
--
-- Full attempt history is kept; "best attempt" is derived on read. Volumes are tiny
-- and the history is worth more than the denormalisation would save.

CREATE TABLE IF NOT EXISTS lesson_checkpoint_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,
  course_id      TEXT NOT NULL,
  module_number  INT NOT NULL,
  lesson_number  INT NOT NULL,
  attempt_number INT NOT NULL,
  -- [{ question_id, question_text, answer_text, score, feedback }]
  -- Questions are chosen up front, so unanswered entries have score/answer_text NULL.
  answers        JSONB NOT NULL DEFAULT '[]',
  total_score    INT,     -- sum of the 0-10 grades; NULL until completed
  question_count INT,     -- how many questions this attempt asked
  passed         BOOLEAN,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user lesson lookup: resume an in-flight attempt, and read the best completed one.
CREATE INDEX IF NOT EXISTS idx_lca_user_lesson
  ON lesson_checkpoint_attempts (user_id, course_id, module_number, lesson_number);

-- Cross-user aggregation for the global lesson-scores endpoint.
CREATE INDEX IF NOT EXISTS idx_lca_course_lesson
  ON lesson_checkpoint_attempts (course_id, module_number, lesson_number)
  WHERE completed_at IS NOT NULL;

ALTER TABLE lesson_checkpoint_attempts ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner. There is deliberately no INSERT or UPDATE policy:
-- grading and completion run server-side under the service role, because passing
-- the checkpoint is what writes `lesson_completions`, which in turn fires
-- qualify_referral_on_lesson() and grants the referrer a paid week.
DROP POLICY IF EXISTS "Users can read own checkpoint attempts" ON lesson_checkpoint_attempts;
CREATE POLICY "Users can read own checkpoint attempts"
  ON lesson_checkpoint_attempts FOR SELECT
  USING (auth.uid()::text = user_id);

-- The checkpoint draws from `lesson_questions`, whose difficulty mix had three
-- disagreeing sources of truth: this comment said 3 easy / 4 medium / 3 hard, the
-- generator prompt says 3 easy / 7 medium and never produces hard, and the admin
-- edit dropdown offers only easy and medium. The live data matches the prompt
-- (45 easy, 105 medium across 15 lessons), so the comment is what was wrong.
COMMENT ON TABLE lesson_questions IS 'Pre-generated question bank for each lesson. 10 questions per lesson, drawn on demand by the end-of-lesson checkpoint.';
COMMENT ON COLUMN lesson_questions.difficulty IS 'easy or medium. Target distribution: 3 easy, 7 medium per lesson. "hard" is permitted by the CHECK constraint but the generator never emits it.';

-- Percentile stats now rank on the best completed attempt per lesson, summed across
-- the course, rather than on per-section question scores.
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
      SUM(total_score)::float / NULLIF(SUM(question_count) * 10, 0) AS avg_score
    FROM (
      -- Best attempt per lesson, by proportion rather than raw total, so a
      -- shorter checkpoint cannot outrank a longer one on volume alone.
      SELECT DISTINCT ON (user_id, course_id, module_number, lesson_number)
        user_id, course_id, total_score, question_count
      FROM public.lesson_checkpoint_attempts
      WHERE completed_at IS NOT NULL AND question_count > 0
      ORDER BY user_id, course_id, module_number, lesson_number,
        (total_score::float / question_count) DESC
    ) best
    GROUP BY user_id, course_id
  ) scores
  WHERE avg_score IS NOT NULL
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET percentile = EXCLUDED.percentile, updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
