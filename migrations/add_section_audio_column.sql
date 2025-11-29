-- Add section_audio column for per-section audio storage
-- This replaces the single audio_base64 + alignment_data approach with per-section audio
-- Each section has its own audio and timestamps, enabling perfect word highlighting sync

-- Add the new column
ALTER TABLE lesson_audio
ADD COLUMN IF NOT EXISTS section_audio JSONB;

-- Comment on the new column
COMMENT ON COLUMN lesson_audio.section_audio IS 'Array of per-section audio: [{section_index, text, audio_base64, alignment}]';

-- The existing columns (audio_base64, alignment_data) are kept for backwards compatibility
-- but will no longer be used for new audio generation
