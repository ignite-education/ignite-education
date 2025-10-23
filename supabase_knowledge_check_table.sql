-- Create knowledge_check_results table
-- This table stores the results of knowledge checks that users complete after each lesson

CREATE TABLE IF NOT EXISTS knowledge_check_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_check_user_id ON knowledge_check_results(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_check_course_id ON knowledge_check_results(course_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_check_lesson ON knowledge_check_results(user_id, course_id, module_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_knowledge_check_completed_at ON knowledge_check_results(completed_at DESC);

-- Add comment to describe the table
COMMENT ON TABLE knowledge_check_results IS 'Stores results from knowledge check quizzes completed after each lesson';
COMMENT ON COLUMN knowledge_check_results.answers IS 'JSONB array containing question, answer, isCorrect, and feedback for each question';
