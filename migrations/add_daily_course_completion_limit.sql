-- Migration: Add course_completions table for tracking daily course completion limits
-- This enables the "2 courses per day" limit feature

-- Create course_completions table to track when users complete entire courses
CREATE TABLE IF NOT EXISTS course_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key to users table (if exists)
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Unique constraint: one completion per user per course per day
  -- This prevents duplicate completions on the same day
  CONSTRAINT unique_user_course_day UNIQUE (user_id, course_id, DATE(completed_at))
);

-- Create index for faster lookups by user and date
CREATE INDEX IF NOT EXISTS idx_course_completions_user_date
  ON course_completions(user_id, DATE(completed_at));

-- Create index for faster lookups by user and course
CREATE INDEX IF NOT EXISTS idx_course_completions_user_course
  ON course_completions(user_id, course_id);

-- Comment on table
COMMENT ON TABLE course_completions IS 'Tracks when users complete entire courses - used for daily completion limits';
COMMENT ON COLUMN course_completions.user_id IS 'Reference to the user who completed the course';
COMMENT ON COLUMN course_completions.course_id IS 'Reference to the completed course (e.g., ''product-manager'', ''cybersecurity'')';
COMMENT ON COLUMN course_completions.completed_at IS 'Timestamp when the course was completed';
