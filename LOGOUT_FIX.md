# Logout Issue Fix Guide

## Problems Identified

### 1. Logout Error (403 Forbidden)
```
POST https://yjvdakdghkfnlhdpbocg.supabase.co/auth/v1/logout?scope=global 403 (Forbidden)
AuthSessionMissingError: Auth session missing!
```

### 2. Community Posts Database Error
```
Could not find a relationship between 'community_posts' and 'users' in the schema cache
```

## Solution 1: Fixed Logout Function

I've updated the logout function in [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) to handle session errors gracefully.

### What Changed

**Before:**
```javascript
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
```

**After:**
```javascript
const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // If there's an auth session error, clear local storage manually
      if (error.message?.includes('Auth session missing') || error.status === 403) {
        console.log('Session already invalid, clearing local storage...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
        return;
      }
      throw error;
    }
  } catch (err) {
    // If logout fails, force clear and redirect
    console.error('Error during logout:', err);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
};
```

### Why This Fixes It

1. **Detects invalid sessions** - Checks for 403 errors or "Auth session missing"
2. **Force clears storage** - Removes all cached auth data
3. **Redirects to home** - Sends user back to login page
4. **Graceful fallback** - Even if Supabase logout fails, user still gets logged out

## Solution 2: Fix Community Posts Database Error

The error indicates a missing foreign key relationship in your Supabase database.

### Steps to Fix

#### Option A: Recreate the Foreign Key (Recommended)

1. Go to **Supabase Dashboard** → Your Project
2. Click **Table Editor** → Select `community_posts` table
3. Click on the **Foreign Keys** tab
4. Add a foreign key:
   - **Column**: `user_id`
   - **References**: `users` table → `id` column
   - **On Delete**: `CASCADE` (deletes posts when user is deleted)
   - **On Update**: `CASCADE`

#### Option B: Run SQL to Fix Relationship

Go to **SQL Editor** in Supabase and run:

```sql
-- Add foreign key constraint
ALTER TABLE community_posts
ADD CONSTRAINT community_posts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
```

#### Option C: Modify the Query (Quick Fix)

If you can't modify the database, update the query in `src/lib/api.js`:

Find the `getCommunityPosts` function and change:

```javascript
// FROM:
.select(`
  *,
  users!community_posts_user_id_fkey (
    first_name,
    last_name
  )
`)

// TO:
.select('*')
```

Then handle user data separately:

```javascript
export async function getCommunityPosts(limit = null) {
  let query = supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: posts, error } = await query;
  if (error) throw error;

  // Fetch user data separately
  const transformedPosts = await Promise.all((posts || []).map(async (post) => {
    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', post.user_id)
      .single();

    // Get comment count
    const { count } = await supabase
      .from('community_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    return {
      ...post,
      author_name: user ? `${user.first_name} ${user.last_name}` : post.author,
      comment_count: count || 0
    };
  }));

  return transformedPosts;
}
```

## Why These Errors Happened

### Logout Error
When you changed the Site URL in Supabase from the Supabase subdomain to `ignite.education`, existing sessions became invalid because:
- OAuth tokens were issued for the old domain
- Session validation failed with the new domain
- Supabase couldn't verify the session

### Database Error
The `community_posts` table is missing a proper foreign key relationship to the `users` table, so Supabase can't use the `!community_posts_user_id_fkey` join syntax.

## Testing

### Test Logout Fix

1. Deploy the changes
2. Try to log out
3. Should see either:
   - ✅ Successful logout and redirect to home
   - ✅ "Session already invalid" message and redirect to home
4. No more 403 errors in console

### Test Community Posts Fix

After fixing the database:

1. Go to Progress Hub
2. Check console - no more foreign key errors
3. User posts should load correctly
4. Both Reddit and user posts should display

## Immediate Workaround (If Can't Wait for Deployment)

If you need to log out right now:

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Run:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   window.location.href = '/';
   ```
4. You'll be logged out and redirected to home

## Deployment Steps

```bash
git add src/contexts/AuthContext.jsx LOGOUT_FIX.md
git commit -m "Fix logout error with invalid sessions and add graceful fallback"
git push origin main
```

## Summary

**Logout Fix:**
- ✅ Detects invalid sessions (403 or "Auth session missing")
- ✅ Clears local storage even if Supabase logout fails
- ✅ Always redirects user to login page
- ✅ No more stuck in logged-in state

**Community Posts:**
- ⚠️ Needs database foreign key setup
- 📝 See options above to fix
- 🔧 Can work around with query modification

## Related Files

- [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) - Fixed logout
- [src/lib/api.js](src/lib/api.js) - Community posts query
- Database: `community_posts` table needs foreign key

---

**Status**: Logout fix ready to deploy
**Database**: Needs manual fix in Supabase
**Last Updated**: 2025-10-25
