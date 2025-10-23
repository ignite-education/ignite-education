-- Enhanced Curriculum Content Schema
-- Supports rich content including titles, subtitles, text, images, and YouTube videos

-- =====================================================
-- LESSONS TABLE (Enhanced for Rich Content)
-- =====================================================
-- If lessons table doesn't exist, create it:
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT DEFAULT 'product-management',
  module_number INTEGER NOT NULL,
  lesson_number INTEGER NOT NULL,
  section_number INTEGER NOT NULL DEFAULT 1,
  lesson_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- 'text', 'heading', 'subheading', 'image', 'video', 'youtube'
  content JSONB, -- Stores rich content structure
  content_text TEXT, -- Plain text version for backward compatibility
  order_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If lessons table already exists, add new columns:
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_text TEXT;

-- =====================================================
-- LESSON CONTENT BLOCKS TABLE (Alternative Approach)
-- =====================================================
-- For more flexible content structure
CREATE TABLE IF NOT EXISTS lesson_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL, -- 'heading', 'subheading', 'paragraph', 'image', 'youtube', 'list'
  content JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_module_lesson ON lessons(module_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_lesson_id ON lesson_content_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_order ON lesson_content_blocks(lesson_id, order_index);

-- Enable Row Level Security
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_content_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all authenticated users to read
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can view lesson content blocks" ON lesson_content_blocks;
DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Authenticated users can manage content blocks" ON lesson_content_blocks;

CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view lesson content blocks"
  ON lesson_content_blocks FOR SELECT
  USING (true);

-- Only admins can insert/update/delete (you'll need to create an admin role)
-- For now, allow authenticated users to manage content (update this for production)
CREATE POLICY "Authenticated users can manage lessons"
  ON lessons FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage content blocks"
  ON lesson_content_blocks FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- CONTENT BLOCK EXAMPLES
-- =====================================================

-- Example JSONB structures for different content types:

-- Heading:
-- {
--   "text": "Introduction to Product Management",
--   "level": 1  -- h1, h2, h3, etc.
-- }

-- Paragraph/Text:
-- {
--   "text": "Product management is...",
--   "formatting": ["bold", "italic"]  -- optional
-- }

-- Image:
-- {
--   "url": "https://...",
--   "alt": "Product roadmap example",
--   "caption": "Example roadmap for Q1 2025",
--   "width": "100%"
-- }

-- YouTube Video:
-- {
--   "videoId": "dQw4w9WgXcQ",
--   "title": "Product Management Intro",
--   "startTime": 0  -- optional start time in seconds
-- }

-- List:
-- {
--   "type": "ordered", -- or "unordered"
--   "items": ["Item 1", "Item 2", "Item 3"]
-- }

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_lesson_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_lesson_updated_at();

CREATE TRIGGER update_lesson_blocks_updated_at
    BEFORE UPDATE ON lesson_content_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_lesson_updated_at();
