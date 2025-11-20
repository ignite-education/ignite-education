-- Create user_progress table to track user's current position in courses
-- This table stores which module and lesson a user is currently on

CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  current_module INTEGER NOT NULL DEFAULT 1,
  current_lesson INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);

-- Add RLS policies
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all progress" ON user_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update all progress
CREATE POLICY "Admins can update all progress" ON user_progress
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert progress for any user
CREATE POLICY "Admins can insert all progress" ON user_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can delete progress
CREATE POLICY "Admins can delete progress" ON user_progress
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comment to table
COMMENT ON TABLE user_progress IS 'Tracks the current module and lesson position for each user in each course';
