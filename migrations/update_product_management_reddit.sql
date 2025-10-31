-- Update Product Management course to use r/ProductManagement subreddit
UPDATE courses
SET
  reddit_channel = 'r/ProductManagement',
  reddit_url = 'https://www.reddit.com/r/ProductManagement/'
WHERE name = 'product-management' OR name = 'product-manager';

-- Verify the update
SELECT name, title, reddit_channel, reddit_url
FROM courses
WHERE name IN ('product-management', 'product-manager');
