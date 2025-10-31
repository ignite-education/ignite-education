-- Update Product Manager course (product-manager) to use r/ProductManagement subreddit
UPDATE courses
SET
  reddit_channel = 'r/ProductManagement',
  reddit_url = 'https://www.reddit.com/r/ProductManagement/'
WHERE name = 'product-manager';

-- Verify the update
SELECT name, title, reddit_channel, reddit_url
FROM courses
WHERE name = 'product-manager';
