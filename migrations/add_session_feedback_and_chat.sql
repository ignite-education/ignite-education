-- Add feedback and chat log columns to office_hours_sessions
-- so all session data lives in one row.

ALTER TABLE office_hours_sessions
  ADD COLUMN IF NOT EXISTS rating TEXT CHECK (rating IN ('positive', 'negative')),
  ADD COLUMN IF NOT EXISTS feedback_comment TEXT,
  ADD COLUMN IF NOT EXISTS chat_log JSONB DEFAULT '[]'::jsonb;
