-- Create flashcards table to store pre-generated flashcards for each lesson
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by course, module, and lesson
CREATE INDEX IF NOT EXISTS idx_flashcards_lookup
ON flashcards(course_id, module_number, lesson_number);

-- Add RLS policies
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read flashcards (public content)
CREATE POLICY "Flashcards are viewable by everyone"
ON flashcards FOR SELECT
USING (true);

-- Only allow authenticated users to insert/update/delete (for admin purposes)
CREATE POLICY "Authenticated users can manage flashcards"
ON flashcards FOR ALL
USING (auth.role() = 'authenticated');
