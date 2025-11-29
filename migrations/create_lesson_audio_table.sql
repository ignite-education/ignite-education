-- Create lesson_audio table for pre-generated lesson narration
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lesson_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,

  -- Content tracking
  content_hash TEXT NOT NULL,  -- SHA-256 of concatenated lesson text
  lesson_name TEXT,
  full_text TEXT,              -- The exact text that was converted to audio

  -- Audio data
  audio_base64 TEXT NOT NULL,  -- Full lesson audio (base64 encoded MP3)
  alignment_data JSONB,        -- Character-level timestamps from ElevenLabs

  -- Section markers for seeking
  section_markers JSONB,       -- [{section_index, text, char_start, char_end, time_start, time_end}]

  -- Config
  voice_gender TEXT DEFAULT 'male',
  voice_id TEXT,

  -- Metadata
  duration_seconds FLOAT,
  character_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint per lesson
  UNIQUE(course_id, module_number, lesson_number)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_lesson_audio_lookup
ON lesson_audio(course_id, module_number, lesson_number);

-- Add RLS policies (adjust based on your auth setup)
ALTER TABLE lesson_audio ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read lesson audio (for playback)
CREATE POLICY "Allow public read access to lesson_audio"
ON lesson_audio FOR SELECT
USING (true);

-- Allow service role to insert/update (for admin operations)
CREATE POLICY "Allow service role full access to lesson_audio"
ON lesson_audio FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE lesson_audio IS 'Pre-generated audio for lesson narration with word-level timestamps';
