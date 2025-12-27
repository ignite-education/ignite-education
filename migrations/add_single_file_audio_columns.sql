-- Add columns for single-file audio format (like blog_post_audio)
-- This enables simpler audio playback with word-level timestamps

-- Add audio_url for storing the Supabase Storage URL
ALTER TABLE lesson_audio
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add word_timestamps for word-level timing data
ALTER TABLE lesson_audio
ADD COLUMN IF NOT EXISTS word_timestamps JSONB;

-- Add title_word_count to know how many title words to skip highlighting
ALTER TABLE lesson_audio
ADD COLUMN IF NOT EXISTS title_word_count INTEGER DEFAULT 0;

-- Comment on new columns
COMMENT ON COLUMN lesson_audio.audio_url IS 'URL to single MP3 file in Supabase Storage (new format)';
COMMENT ON COLUMN lesson_audio.word_timestamps IS 'Array of [{word, start, end, index}] for word highlighting (new format)';
COMMENT ON COLUMN lesson_audio.title_word_count IS 'Number of title words to skip highlighting (new format)';

-- The existing section_audio column is kept for backwards compatibility
-- but will no longer be used for new audio generation
