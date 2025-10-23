-- =====================================================
-- EXPLAINED SECTIONS TABLE
-- =====================================================
-- Stores text selections that Will has explained for users
CREATE TABLE IF NOT EXISTS explained_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  selected_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_explained_sections_user_id ON explained_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_explained_sections_lesson ON explained_sections(user_id, course_id, module_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_explained_sections_created_at ON explained_sections(created_at DESC);

-- Enable Row Level Security
ALTER TABLE explained_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for explained_sections
CREATE POLICY "Users can view their own explained sections"
  ON explained_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own explained sections"
  ON explained_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own explained sections"
  ON explained_sections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own explained sections"
  ON explained_sections FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_explained_sections_updated_at
    BEFORE UPDATE ON explained_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
