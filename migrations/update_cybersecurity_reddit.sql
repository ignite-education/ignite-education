-- Update Cyber Security Analyst course to use r/cybersecurity subreddit
UPDATE courses
SET
  reddit_channel = 'r/cybersecurity',
  reddit_url = 'https://www.reddit.com/r/cybersecurity/'
WHERE name = 'cyber-security-analyst';

-- Verify the update
SELECT name, title, reddit_channel, reddit_url
FROM courses
WHERE name = 'cyber-security-analyst';
