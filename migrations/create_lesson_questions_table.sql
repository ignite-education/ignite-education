-- Migration: Create lesson_questions table for pre-generated knowledge check questions
-- This table stores 10 questions per lesson, generated during curriculum upload

CREATE TABLE IF NOT EXISTS lesson_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  content_hash TEXT,  -- SHA-256 of lesson content when questions were generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by course/module/lesson
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lookup
ON lesson_questions(course_id, module_number, lesson_number);

-- Index for querying prior lessons (for recall questions)
CREATE INDEX IF NOT EXISTS idx_lesson_questions_prior
ON lesson_questions(course_id, module_number, lesson_number)
WHERE difficulty IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE lesson_questions ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for fetching questions during knowledge check)
CREATE POLICY "Allow public read access to lesson_questions"
ON lesson_questions FOR SELECT
USING (true);

-- Allow authenticated users with service role full access (for admin operations)
CREATE POLICY "Allow service role full access to lesson_questions"
ON lesson_questions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE lesson_questions IS 'Pre-generated knowledge check questions for each lesson. 10 questions per lesson with varying difficulty.';
COMMENT ON COLUMN lesson_questions.content_hash IS 'SHA-256 hash of lesson content when questions were generated, used to detect if regeneration is needed';
COMMENT ON COLUMN lesson_questions.difficulty IS 'Question difficulty: easy, medium, or hard. Target distribution: 3 easy, 4 medium, 3 hard per lesson';
