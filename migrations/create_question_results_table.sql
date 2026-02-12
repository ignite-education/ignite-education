-- Per-question results table for tracking individual answers attributed to their source lesson.
-- Each knowledge check quiz (3 questions) produces 3 rows here.
-- source_module/source_lesson = the lesson the question tests (may differ from quiz lesson for recall questions).
-- quiz_module/quiz_lesson = the lesson where the quiz was actually taken.

CREATE TABLE question_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  source_module INTEGER NOT NULL,
  source_lesson INTEGER NOT NULL,
  quiz_module INTEGER NOT NULL,
  quiz_lesson INTEGER NOT NULL,
  question_id UUID,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  feedback TEXT,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_question_results_user ON question_results (user_id, course_id);
CREATE INDEX idx_question_results_source ON question_results (source_module, source_lesson);

ALTER TABLE question_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question results"
  ON question_results FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own question results"
  ON question_results FOR INSERT WITH CHECK (auth.uid()::text = user_id);
