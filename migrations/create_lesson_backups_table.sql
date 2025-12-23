-- Create lesson_backups table for version history
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lesson_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lesson identification
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  lesson_name TEXT,

  -- Backup metadata
  version_number INTEGER NOT NULL DEFAULT 1,
  backup_reason TEXT,  -- 'manual', 'auto_before_save', 'auto_before_audio'
  created_by UUID REFERENCES auth.users(id),

  -- The actual lesson content (array of content blocks)
  content_blocks JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for fast lookups
  CONSTRAINT unique_lesson_version UNIQUE(course_id, module_number, lesson_number, version_number)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lesson_backups_lookup
ON lesson_backups(course_id, module_number, lesson_number);

CREATE INDEX IF NOT EXISTS idx_lesson_backups_created
ON lesson_backups(created_at DESC);

-- Add RLS policies
ALTER TABLE lesson_backups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read backups
CREATE POLICY "Allow authenticated read access to lesson_backups"
ON lesson_backups FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create backups
CREATE POLICY "Allow authenticated insert access to lesson_backups"
ON lesson_backups FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to delete their own backups or admins to delete any
CREATE POLICY "Allow backup deletion"
ON lesson_backups FOR DELETE
TO authenticated
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Function to get next version number for a lesson
CREATE OR REPLACE FUNCTION get_next_lesson_version(
  p_course_id TEXT,
  p_module_number INTEGER,
  p_lesson_number INTEGER
) RETURNS INTEGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO max_version
  FROM lesson_backups
  WHERE course_id = p_course_id
    AND module_number = p_module_number
    AND lesson_number = p_lesson_number;

  RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE lesson_backups IS 'Version history for lesson content with ability to restore previous versions';
