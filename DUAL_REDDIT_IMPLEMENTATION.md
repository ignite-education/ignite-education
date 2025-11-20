# Dual Reddit Thread Implementation Summary

## Overview
Successfully implemented dual Reddit thread support for the community forum. Each course can now have:
1. **Read Thread**: Subreddit where posts are fetched and displayed
2. **Post Thread**: Subreddit where user submissions are posted

## Changes Made

### 1. Database Schema (`migrations/add_dual_reddit_threads.sql`)
- Added `reddit_read_url` column to `courses` table
- Added `reddit_post_url` column to `courses` table
- Migrated existing `reddit_url` data to both new columns for backward compatibility

### 2. Course Management UI (`src/components/CourseManagement.jsx`)
Updated the course configuration page to include:
- **Reddit Thread for Display**: URL for fetching/displaying posts
- **Reddit Thread for Posting**: URL for user submissions
- Kept legacy `reddit_channel` and `reddit_url` fields for backward compatibility

### 3. Community Forum (`src/components/ProgressHub.jsx`)
Updated the ProgressHub component to:
- Load both read and post URLs from course configuration
- Extract subreddit names from URLs automatically
- Fetch posts from the **read subreddit**
- Submit user posts to the **post subreddit**
- Update UI to show correct subreddit in "This will be posted to..." message
- Use appropriate subreddit for post flairs

## Testing Instructions

### Step 1: Run Database Migration
Run the migration to add the new columns:
```bash
node run-dual-reddit-migration-direct.js
```

Or manually execute the SQL in Supabase SQL Editor:
```sql
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reddit_read_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reddit_post_url TEXT;

UPDATE courses
SET reddit_read_url = reddit_url
WHERE reddit_read_url IS NULL AND reddit_url IS NOT NULL;

UPDATE courses
SET reddit_post_url = reddit_url
WHERE reddit_post_url IS NULL AND reddit_url IS NOT NULL;
```

### Step 2: Configure Course Reddit Threads
1. Navigate to the Curriculum Upload page (admin access)
2. Edit a course (e.g., Product Manager or Cybersecurity)
3. You'll see these fields:
   - **Reddit Channel**: e.g., `r/ProductManagement` (for display)
   - **Reddit Channel URL (Legacy)**: Kept for backward compatibility
   - **Reddit Thread for Display**: e.g., `https://www.reddit.com/r/ProductManagement/`
   - **Reddit Thread for Posting**: e.g., `https://www.reddit.com/r/PMcareers/`
4. Set different URLs for each course as needed
5. Save the course

### Step 3: Test Reading Posts
1. Enroll in the course you configured
2. Navigate to the ProgressHub (main dashboard)
3. Check the Community Forum panel on the right
4. Verify posts are displayed from the **Read Thread** subreddit

### Step 4: Test Posting
1. Click "Create Post" in the Community Forum
2. Fill in post details
3. Check the message at the bottom: "This will be posted to [POST_SUBREDDIT]"
4. Verify it shows the **Post Thread** subreddit, not the Read Thread
5. Submit the post
6. Confirm the post opens in a new tab at the correct subreddit

### Step 5: Test Both Courses
Repeat steps 2-4 for both:
- Product Manager course
- Cybersecurity course

## Example Configuration

### Product Manager Course
- **Reddit Thread for Display**: `https://www.reddit.com/r/ProductManagement/`
- **Reddit Thread for Posting**: `https://www.reddit.com/r/PMcareers/`

### Cybersecurity Course
- **Reddit Thread for Display**: `https://www.reddit.com/r/cybersecurity/`
- **Reddit Thread for Posting**: `https://www.reddit.com/r/cybersecurity_help/`

## Backward Compatibility
- If `reddit_read_url` is not set, falls back to `reddit_url` then `reddit_channel`
- If `reddit_post_url` is not set, falls back to `reddit_url` then `reddit_channel`
- Existing courses will work without modification

## Files Modified
1. `migrations/add_dual_reddit_threads.sql` - New migration
2. `src/components/CourseManagement.jsx` - Course configuration UI
3. `src/components/ProgressHub.jsx` - Community forum logic
4. `run-dual-reddit-migration.js` - Migration runner script
5. `run-dual-reddit-migration-direct.js` - Direct migration instructions

## Notes
- User experience remains the same except for the updated subreddit name in the post modal
- No changes to post display logic, sorting, or filtering
- Authentication flow unchanged
- Reddit API integration unchanged
