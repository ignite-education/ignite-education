-- Create blog_posts table for SEO-optimized blog system
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- URL and identification
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Content fields
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Media
  featured_image TEXT,

  -- Author information
  author_name VARCHAR(255) NOT NULL DEFAULT 'Ignite Team',
  author_role VARCHAR(255),
  author_avatar TEXT,

  -- SEO fields
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  og_image TEXT,

  -- Publishing
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trigger_update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can read all posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON blog_posts;

-- Create policies
CREATE POLICY "Public can read published posts"
  ON blog_posts
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authenticated users can read all posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (true);
