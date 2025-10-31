-- Verify Reddit configuration for all courses
-- This script checks that reddit_channel and reddit_url are properly set

SELECT
  name,
  title,
  status,
  reddit_channel,
  reddit_url,
  CASE
    WHEN reddit_channel IS NULL THEN '❌ Missing reddit_channel'
    WHEN reddit_url IS NULL THEN '❌ Missing reddit_url'
    WHEN reddit_channel NOT LIKE 'r/%' THEN '⚠️  Invalid format (should start with r/)'
    WHEN reddit_url NOT LIKE 'https://www.reddit.com%' THEN '⚠️  Invalid URL format'
    ELSE '✅ Configured correctly'
  END as configuration_status
FROM courses
WHERE status = 'live' OR name IN ('product-manager', 'cyber-security-analyst', 'cybersecurity-analyst')
ORDER BY display_order;

-- Show reddit_posts_cache statistics
SELECT
  subreddit,
  COUNT(*) as cached_posts,
  MAX(fetched_at) as last_cached,
  AVG(upvotes) as avg_upvotes
FROM reddit_posts_cache
GROUP BY subreddit
ORDER BY subreddit;

-- Show reddit_fetch_log status
SELECT
  subreddit,
  last_fetch_at,
  posts_count,
  comments_count,
  status
FROM reddit_fetch_log
ORDER BY last_fetch_at DESC;
