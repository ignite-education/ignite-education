-- Add dual Reddit thread support to courses table
-- reddit_read_url: The subreddit/thread to fetch and display posts from
-- reddit_post_url: The subreddit/thread where user posts will be submitted

ALTER TABLE courses ADD COLUMN IF NOT EXISTS reddit_read_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reddit_post_url TEXT;

-- Migrate existing reddit_url data to reddit_read_url
UPDATE courses
SET reddit_read_url = reddit_url
WHERE reddit_read_url IS NULL AND reddit_url IS NOT NULL;

-- Set reddit_post_url to same as reddit_read_url for backward compatibility
UPDATE courses
SET reddit_post_url = reddit_url
WHERE reddit_post_url IS NULL AND reddit_url IS NOT NULL;
