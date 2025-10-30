-- Update Product Management course to use r/productmanagement subreddit
UPDATE courses
SET
  reddit_channel = 'r/productmanagement',
  reddit_url = 'https://www.reddit.com/r/productmanagement/'
WHERE name = 'product-management';
