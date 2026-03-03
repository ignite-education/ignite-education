-- =====================================================
-- USER MEMORY TABLE
-- =====================================================
-- Stores user memory items (career, skills, interests, general notes)
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('career', 'skills', 'interests', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_user_category ON user_memory(user_id, category);

-- Enable Row Level Security
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_memory
CREATE POLICY "Users can view their own memory items"
  ON user_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memory items"
  ON user_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory items"
  ON user_memory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory items"
  ON user_memory FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_memory_updated_at
    BEFORE UPDATE ON user_memory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
