-- Section feedback: thumbs up/down per H2 group in lessons
CREATE TABLE IF NOT EXISTS section_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  section_number INTEGER NOT NULL,
  rating BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, module_number, lesson_number, section_number)
);

CREATE INDEX IF NOT EXISTS idx_section_feedback_agg
  ON section_feedback(course_id, module_number, lesson_number, section_number);

ALTER TABLE section_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own section feedback"
  ON section_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own section feedback"
  ON section_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own section feedback"
  ON section_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own section feedback"
  ON section_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Chat feedback: thumbs up/down on Claude responses with full message pair for evals
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  section_number INTEGER,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  rating BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, module_number, lesson_number, assistant_message)
);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chat feedback"
  ON chat_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat feedback"
  ON chat_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat feedback"
  ON chat_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat feedback"
  ON chat_feedback FOR DELETE
  USING (auth.uid() = user_id);
