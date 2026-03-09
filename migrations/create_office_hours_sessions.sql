-- Office Hours Sessions table for live video chat feature
-- Tracks active and past 1:1 video sessions between coaches and students

CREATE TABLE office_hours_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  daily_room_name TEXT NOT NULL,
  daily_room_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'occupied', 'ended')),
  student_id UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query live sessions by course
CREATE INDEX idx_ohs_course_status ON office_hours_sessions (course_id, status);

-- Prevent duplicate live sessions per coach (only one active session at a time)
CREATE UNIQUE INDEX idx_ohs_coach_live ON office_hours_sessions (coach_id) WHERE status IN ('live', 'occupied');

-- Link coaches to auth users (needed for coach identity verification)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Enable Supabase Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE office_hours_sessions;

-- Scheduled office hours (coaches set upcoming availability)
CREATE TABLE IF NOT EXISTS office_hours_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ohs_schedule_course ON office_hours_schedule (course_id, starts_at);
