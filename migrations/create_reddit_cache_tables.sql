-- Create table for cached Reddit posts
CREATE TABLE IF NOT EXISTS reddit_posts_cache (
  id TEXT PRIMARY KEY,
  subreddit TEXT NOT NULL,
  author TEXT NOT NULL,
  author_icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tag TEXT,
  upvotes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  url TEXT NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(id, subreddit)
);

-- Create table for cached Reddit comments
CREATE TABLE IF NOT EXISTS reddit_comments_cache (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  author TEXT NOT NULL,
  author_icon TEXT,
  body TEXT NOT NULL,
  created_utc BIGINT NOT NULL,
  score INTEGER DEFAULT 0,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (post_id) REFERENCES reddit_posts_cache(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON reddit_posts_cache(subreddit, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_fetched_at ON reddit_posts_cache(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_post_id ON reddit_comments_cache(post_id);
CREATE INDEX IF NOT EXISTS idx_reddit_comments_subreddit ON reddit_comments_cache(subreddit);

-- Create table to track last fetch time per subreddit
CREATE TABLE IF NOT EXISTS reddit_fetch_log (
  subreddit TEXT PRIMARY KEY,
  last_fetch_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posts_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success'
);

COMMENT ON TABLE reddit_posts_cache IS 'Cached Reddit posts fetched daily to reduce API calls';
COMMENT ON TABLE reddit_comments_cache IS 'Cached Reddit comments for posts';
COMMENT ON TABLE reddit_fetch_log IS 'Tracks when each subreddit was last fetched';
