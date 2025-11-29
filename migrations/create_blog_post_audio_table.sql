-- Create blog_post_audio table for pre-generated narration audio
CREATE TABLE IF NOT EXISTS blog_post_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to blog post
  blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,

  -- Audio data (stored as JSONB array with audio_url and word_timestamps for each section)
  audio_url TEXT NOT NULL,
  word_timestamps JSONB,

  -- Metadata
  duration_seconds DECIMAL(10, 2),
  content_hash TEXT, -- Hash of content to detect changes

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one audio per blog post
  UNIQUE(blog_post_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_post_audio_blog_post_id ON blog_post_audio(blog_post_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_post_audio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_blog_post_audio_updated_at ON blog_post_audio;
CREATE TRIGGER trigger_update_blog_post_audio_updated_at
  BEFORE UPDATE ON blog_post_audio
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_audio_updated_at();

-- Enable Row Level Security
ALTER TABLE blog_post_audio ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read blog post audio" ON blog_post_audio;
DROP POLICY IF EXISTS "Authenticated users can manage blog post audio" ON blog_post_audio;

-- Create policies
CREATE POLICY "Public can read blog post audio"
  ON blog_post_audio
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage blog post audio"
  ON blog_post_audio
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
