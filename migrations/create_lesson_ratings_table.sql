-- Create lesson_ratings table to store user feedback on lesson content
CREATE TABLE IF NOT EXISTS lesson_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  rating BOOLEAN NOT NULL, -- true for thumbs up, false for thumbs down
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure one rating per user per lesson
  UNIQUE(user_id, course_id, module_number, lesson_number)
);

-- Create index for faster lookups by lesson
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_lookup
ON lesson_ratings(course_id, module_number, lesson_number);

-- Create index for user ratings lookup
CREATE INDEX IF NOT EXISTS idx_lesson_ratings_user
ON lesson_ratings(user_id);

-- Add RLS policies
ALTER TABLE lesson_ratings ENABLE ROW LEVEL SECURITY;

-- Users can view their own ratings
CREATE POLICY "Users can view their own ratings"
ON lesson_ratings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own ratings
CREATE POLICY "Users can insert their own ratings"
ON lesson_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
ON lesson_ratings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
ON lesson_ratings FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_lesson_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_ratings_updated_at
BEFORE UPDATE ON lesson_ratings
FOR EACH ROW
EXECUTE FUNCTION update_lesson_ratings_updated_at();
