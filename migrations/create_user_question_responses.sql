-- Add save_feedback flag to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS save_feedback BOOLEAN DEFAULT false;

-- Create table to store user responses to engagement questions
CREATE TABLE IF NOT EXISTS user_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  section_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  claude_feedback TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficiently querying unprocessed responses per user
CREATE INDEX IF NOT EXISTS idx_uqr_user_unprocessed
  ON user_question_responses (user_id, processed)
  WHERE processed = false;

-- RLS policies
ALTER TABLE user_question_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own responses
CREATE POLICY "Users can view own responses"
  ON user_question_responses FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for cron aggregation)
CREATE POLICY "Service role full access"
  ON user_question_responses FOR ALL
  USING (true)
  WITH CHECK (true);
