-- Recurring office hours
-- Coaches declare a repeating availability rule ("every Thursday, 17:00-18:00")
-- instead of adding one dated slot at a time. Occurrences are expanded on read
-- (see server/office-hours/recurrence.js) rather than materialised as rows, so a
-- rule edit takes effect everywhere immediately and there is nothing to backfill.

CREATE TABLE IF NOT EXISTS office_hours_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  -- 0 = Sunday ... 6 = Saturday (matches JS Date.getDay)
  weekdays SMALLINT[] NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- IANA zone the wall-clock times are anchored to, so 17:00 stays 17:00 across DST
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  -- 1 = every week, 2 = fortnightly, 4 = every four weeks
  interval_weeks SMALLINT NOT NULL DEFAULT 1,
  starts_on DATE NOT NULL,
  ends_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ohr_weekdays_not_empty CHECK (array_length(weekdays, 1) BETWEEN 1 AND 7),
  CONSTRAINT ohr_end_after_start CHECK (end_time > start_time),
  CONSTRAINT ohr_interval_range CHECK (interval_weeks BETWEEN 1 AND 8),
  CONSTRAINT ohr_ends_after_starts CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_ohr_course ON office_hours_recurring (course_id);
CREATE INDEX IF NOT EXISTS idx_ohr_coach ON office_hours_recurring (coach_id);

-- One-off cancellations of a single occurrence ("skip this Thursday")
CREATE TABLE IF NOT EXISTS office_hours_recurring_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_id UUID NOT NULL REFERENCES office_hours_recurring(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recurrence_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_ohr_exceptions_rule ON office_hours_recurring_exceptions (recurrence_id);
