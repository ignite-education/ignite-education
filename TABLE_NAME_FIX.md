# ✅ Fixed: Comments Table Name Issue

## What Was Wrong

Your Supabase database has a table named `community_comments` but the code was looking for `post_comments`.

## What I Fixed

Updated all references in [src/lib/api.js](src/lib/api.js) from `post_comments` to `community_comments`:

✅ `createComment()` - Now uses `community_comments`
✅ `getPostComments()` - Now uses `community_comments`
✅ `getMultiplePostsComments()` - Now uses `community_comments`
✅ `getPostCommentCount()` - Now uses `community_comments`
✅ `updateComment()` - Now uses `community_comments`
✅ `deleteComment()` - Now uses `community_comments`

## Next Steps

### 1. Refresh Your App
- Press Ctrl/Cmd + R to reload the page
- The 404 error should be gone!

### 2. Check if Likes Table Exists

The code also uses `post_likes` table. Check if you have:
- ✅ `post_likes` table in your database, OR
- ❌ A different name like `community_likes`?

**To check:**
1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Look for a likes table

**If you have `community_likes` instead:**
Let me know and I'll update the likes functions too!

### 3. Test Comments

Try commenting on a post:
1. Hover over a post in Community Forum
2. Type a comment in the input box
3. Press Enter or click "Post"
4. Comment should save to `community_comments` table

## Your Database Structure

Based on the error, you have:
```
✅ community_comments (for post comments)
❓ post_likes or community_likes? (for post likes)
```

## If You Still See Errors

**Check Table Names:**
```sql
-- Run this in Supabase SQL Editor to see all your tables:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

This will show you the exact table names you have.

## Common Table Names

Your database might use:
- `community_comments` ✅ (Fixed!)
- `community_posts`
- `community_likes` or `post_likes` (Check this one!)
- `users`
- `lessons`
- `courses`

Let me know what table names you see and I'll update the code to match!

---

**The comments error should be fixed now! Refresh your app and try it out.** 🎉
