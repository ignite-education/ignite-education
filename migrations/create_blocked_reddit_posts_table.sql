-- Create table for blocked Reddit posts
-- Admins can block inappropriate Reddit posts from appearing in the community forum
CREATE TABLE IF NOT EXISTS blocked_reddit_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reddit_post_id TEXT NOT NULL UNIQUE,
  blocked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blocked_reddit_posts_reddit_id ON blocked_reddit_posts(reddit_post_id);
CREATE INDEX IF NOT EXISTS idx_blocked_reddit_posts_blocked_by ON blocked_reddit_posts(blocked_by);

COMMENT ON TABLE blocked_reddit_posts IS 'Stores Reddit post IDs that admins have blocked from appearing in the community forum';
COMMENT ON COLUMN blocked_reddit_posts.reddit_post_id IS 'The Reddit post ID (e.g., "1p04bfo" without "reddit-" prefix)';
COMMENT ON COLUMN blocked_reddit_posts.blocked_by IS 'The admin user ID who blocked the post';
COMMENT ON COLUMN blocked_reddit_posts.reason IS 'Optional reason for blocking the post';
