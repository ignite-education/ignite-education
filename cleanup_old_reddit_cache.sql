-- Clean up old Reddit cache data
-- Remove productmanagement (lowercase) and ProductManager (inactive subreddit)
-- Keep only ProductManagement and cybersecurity

-- =============================================================================
-- STEP 1: Show current state before cleanup
-- =============================================================================

SELECT 'BEFORE CLEANUP - Current cache state:' as info;

SELECT
  subreddit,
  COUNT(*) as post_count,
  MAX(fetched_at) as last_cached
FROM reddit_posts_cache
GROUP BY subreddit
ORDER BY subreddit;

SELECT
  subreddit,
  COUNT(*) as comment_count
FROM reddit_comments_cache
GROUP BY subreddit
ORDER BY subreddit;

-- =============================================================================
-- STEP 2: Delete productmanagement (lowercase) - has 0 posts anyway
-- =============================================================================

SELECT 'Deleting productmanagement (lowercase) cache data...' as info;

DELETE FROM reddit_comments_cache WHERE subreddit = 'productmanagement';
DELETE FROM reddit_posts_cache WHERE subreddit = 'productmanagement';
DELETE FROM reddit_fetch_log WHERE subreddit = 'productmanagement';

-- =============================================================================
-- STEP 3: Delete ProductManager (inactive subreddit)
-- =============================================================================

SELECT 'Deleting ProductManager (inactive subreddit) cache data...' as info;

DELETE FROM reddit_comments_cache WHERE subreddit = 'ProductManager';
DELETE FROM reddit_posts_cache WHERE subreddit = 'ProductManager';
DELETE FROM reddit_fetch_log WHERE subreddit = 'ProductManager';

-- =============================================================================
-- STEP 4: Show final state after cleanup
-- =============================================================================

SELECT 'AFTER CLEANUP - Final cache state:' as info;

SELECT
  subreddit,
  COUNT(*) as post_count,
  MAX(fetched_at) as last_cached
FROM reddit_posts_cache
GROUP BY subreddit
ORDER BY subreddit;

SELECT
  subreddit,
  COUNT(*) as comment_count
FROM reddit_comments_cache
GROUP BY subreddit
ORDER BY subreddit;

SELECT
  subreddit,
  last_fetch_at,
  posts_count,
  comments_count,
  status
FROM reddit_fetch_log
ORDER BY subreddit;

-- =============================================================================
-- EXPECTED FINAL STATE:
-- Only 2 subreddits should remain:
-- - ProductManagement (50 posts, 243 comments)
-- - cybersecurity (50 posts, 229 comments)
-- =============================================================================

SELECT 'Cleanup complete! Expected result: 2 subreddits (ProductManagement, cybersecurity)' as info;
