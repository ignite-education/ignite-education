# Fix Reddit API - Deployment Issue

## Problem

Community Forum posts aren't loading because the Reddit API credentials are missing on the production server.

## Root Cause

The backend server (Render) needs these environment variables set:
- `VITE_REDDIT_CLIENT_ID`
- `VITE_REDDIT_CLIENT_SECRET`
- `VITE_REDDIT_USER_AGENT` (optional, defaults to "IgniteLearning/1.0")

## Solution

### Step 1: Check Current Environment Variables on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Navigate to your backend service (ignite-education-api)
3. Go to "Environment" tab
4. Check if these variables exist:
   - `VITE_REDDIT_CLIENT_ID`
   - `VITE_REDDIT_CLIENT_SECRET`

### Step 2: Add Missing Variables

If the Reddit variables are missing:

1. In Render Dashboard → Environment tab
2. Click "Add Environment Variable"
3. Add each variable:

```
Key: VITE_REDDIT_CLIENT_ID
Value: [your Reddit app client ID]

Key: VITE_REDDIT_CLIENT_SECRET
Value: [your Reddit app client secret]

Key: VITE_REDDIT_USER_AGENT
Value: IgniteLearning/1.0
```

### Step 3: Get Reddit Credentials

If you don't have Reddit credentials:

1. Go to https://www.reddit.com/prefs/apps
2. Create a new app (or use existing one)
   - Name: Ignite Learning Platform
   - Type: **web app**
   - Description: Educational platform for Product Management
   - Redirect URI: `https://ignite.education/auth/reddit/callback`
3. Copy the credentials:
   - Client ID (shown under app name)
   - Client Secret (click "edit" to see it)

### Step 4: Trigger Redeploy

After adding environment variables:

1. Render automatically redeploys when env vars change
2. Wait 2-3 minutes for deployment to complete
3. Check logs for:
   ```
   🔑 Fetching new Reddit OAuth token...
   ✅ Reddit OAuth token cached
   ✅ Fetched and cached 40 Reddit posts
   ```

### Step 5: Verify It Works

Test the API endpoint:
```bash
curl https://ignite-education-api.onrender.com/api/reddit-posts?limit=5
```

Should return JSON array with Reddit posts instead of empty array `[]`.

## Quick Fix (If Urgent)

If you need posts to show immediately while fixing credentials:

1. The system will fall back to cached posts if available
2. Or it returns an empty array (graceful degradation)
3. User-generated posts from Supabase will still show

## Error Messages to Watch For

In Render logs:

### Missing Credentials
```
❌ Error fetching Reddit posts: Reddit API credentials not configured
💡 Check that VITE_REDDIT_CLIENT_ID and VITE_REDDIT_CLIENT_SECRET are set
```
**Fix**: Add environment variables

### Invalid Credentials
```
Reddit OAuth error: 401
```
**Fix**: Verify credentials are correct

### Rate Limit (Shouldn't happen with new implementation)
```
Reddit API error: 429
```
**Fix**: Wait a minute, system will auto-recover

## Verification Checklist

- [ ] Environment variables added to Render
- [ ] Service redeployed successfully
- [ ] Logs show "✅ Fetched and cached X Reddit posts"
- [ ] API endpoint returns posts (not empty array)
- [ ] Frontend Community Forum displays posts
- [ ] No error messages in logs

## Additional Notes

The new rate-limiting implementation requires these credentials to be set for the Reddit integration to work. Without them:
- ✅ User-generated posts still work (Supabase)
- ❌ Reddit posts won't load
- ✅ App doesn't crash (graceful fallback)

## Related Files

- [server.js](server.js:671-810) - Reddit API endpoint
- [.env.example](.env.example) - Example environment variables
- [REDDIT_RATE_LIMITING.md](REDDIT_RATE_LIMITING.md) - Technical documentation

---

**Status**: Waiting for environment variables to be configured on Render
**Priority**: High (blocks Reddit integration feature)
**ETA**: 5 minutes after variables are set
