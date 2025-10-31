-- Add Reddit channel fields to courses table
-- This allows each course to specify which subreddit to display in the community forum

-- Add reddit_channel column (format: r/subredditname)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS reddit_channel TEXT;

-- Add reddit_url column (full Reddit URL)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS reddit_url TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN courses.reddit_channel IS 'Reddit channel for course community forum (e.g., r/productmanagement)';
COMMENT ON COLUMN courses.reddit_url IS 'Full Reddit URL for the subreddit (e.g., https://www.reddit.com/r/productmanagement/)';

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'courses' AND column_name IN ('reddit_channel', 'reddit_url');
