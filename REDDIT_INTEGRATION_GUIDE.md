# Reddit Integration Guide - Likes & Comments

This guide explains how the Ignite Learning Platform integrates directly with Reddit for likes and comments on Reddit posts, while using Supabase for user-generated posts.

## Overview

The platform now supports **dual-mode interaction**:

### Reddit Posts (from r/ProductManagement)
- ✅ **Upvote directly on Reddit** - Votes are sent to Reddit's API
- ✅ **Comment directly on Reddit** - Comments appear on the actual Reddit post
- ✅ **Requires Reddit OAuth** - Users authenticate with their Reddit account
- ✅ **Visual indicator** - Reddit posts show an orange "Reddit" badge

### User-Generated Posts (Ignite Community)
- ✅ **Like/Unlike in Supabase** - Stored in the `post_likes` table
- ✅ **Comment in Supabase** - Stored in the `post_comments` table
- ✅ **Requires Ignite auth** - Uses your Ignite/Supabase account

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 ProgressHub Component               │
│                                                     │
│  ┌────────────────────┐    ┌────────────────────┐ │
│  │   Reddit Posts     │    │  User Posts        │ │
│  │   (source: reddit) │    │  (source: user)    │ │
│  └────────┬───────────┘    └──────┬─────────────┘ │
│           │                       │               │
│           │                       │               │
└───────────┼───────────────────────┼───────────────┘
            │                       │
            ▼                       ▼
  ┌─────────────────┐     ┌─────────────────┐
  │  Reddit API     │     │  Supabase API   │
  │  (OAuth)        │     │  (post_likes,   │
  │                 │     │   post_comments)│
  │ • Vote          │     │                 │
  │ • Comment       │     │ • Like/Unlike   │
  │ • Read          │     │ • Comment       │
  └─────────────────┘     └─────────────────┘
```

## Reddit OAuth Setup

### Required Scopes

The Reddit OAuth integration requires the following scopes:
- `identity` - Read user's account information
- `read` - Read Reddit posts and comments
- `vote` - Upvote/downvote posts and comments
- `submit` - Post new content (comments)

### Configuration

Update your `.env` file with Reddit credentials:

```env
VITE_REDDIT_CLIENT_ID=your_reddit_client_id
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret
VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback
VITE_REDDIT_USER_AGENT=Ignite-Learning-Platform/1.0
```

### How to Get Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: Ignite Learning Platform
   - **App type**: Select "web app"
   - **Description**: Learning platform integration
   - **About URL**: Your website URL
   - **Redirect URI**: `http://localhost:5173/auth/reddit/callback` (for development)
4. Click "Create app"
5. Copy the **client ID** (under your app name) and **client secret**

## Implementation Details

### Reddit API Functions ([src/lib/reddit.js](src/lib/reddit.js))

#### `voteOnReddit(thingId, direction)`
Upvote or downvote a Reddit post or comment.

**Parameters:**
- `thingId` (string) - Full Reddit ID (e.g., `t3_abc123` for posts)
- `direction` (number) - `1` (upvote), `-1` (downvote), `0` (remove vote)

**Returns:** `Promise<{success: boolean}>`

**Example:**
```javascript
// Upvote a post
await voteOnReddit('t3_abc123', 1);

// Remove vote
await voteOnReddit('t3_abc123', 0);
```

#### `commentOnReddit(thingId, text)`
Add a comment to a Reddit post.

**Parameters:**
- `thingId` (string) - Full Reddit ID of the post
- `text` (string) - Comment content (supports markdown)

**Returns:** `Promise<{success: boolean, comment: Object, id: string, name: string}>`

**Example:**
```javascript
const result = await commentOnReddit('t3_abc123', 'Great post! Thanks for sharing.');
console.log('Comment posted:', result.id);
```

#### `getRedditComments(subreddit, postId)`
Fetch comments for a Reddit post.

**Parameters:**
- `subreddit` (string) - Subreddit name (without r/)
- `postId` (string) - Post ID (without prefix)

**Returns:** `Promise<Array>` - Array of comment objects

**Example:**
```javascript
const comments = await getRedditComments('ProductManagement', 'abc123');
```

### Component Logic ([src/components/ProgressHub.jsx](src/components/ProgressHub.jsx))

#### Post Source Detection

Posts have a `source` field:
```javascript
post.source === 'reddit'  // Reddit post
post.source === 'user'    // User-generated post
```

Reddit posts also include:
```javascript
post.redditId          // Original Reddit ID (e.g., 'abc123')
post.redditFullname    // Full Reddit name (e.g., 't3_abc123')
```

#### Like/Upvote Flow

```javascript
const handleLikePost = async (postId) => {
  const post = communityPosts.find(p => p.id === postId);

  if (post.source === 'reddit') {
    // Check Reddit authentication
    if (!isRedditAuthenticated()) {
      // Prompt user to connect Reddit
      initiateRedditAuth();
      return;
    }

    // Vote on Reddit
    const direction = isLiked ? 0 : 1;
    await voteOnReddit(post.redditFullname, direction);
  } else {
    // Like in Supabase
    if (isLiked) {
      await unlikePost(postId, userId);
    } else {
      await likePost(postId, userId);
    }
  }
};
```

#### Comment Flow

```javascript
const handleSubmitComment = async (postId) => {
  const post = communityPosts.find(p => p.id === postId);

  if (post.source === 'reddit') {
    // Check Reddit authentication
    if (!isRedditAuthenticated()) {
      initiateRedditAuth();
      return;
    }

    // Comment on Reddit
    await commentOnReddit(post.redditFullname, commentText);
  } else {
    // Comment in Supabase
    await createComment(postId, userId, commentText);
  }
};
```

## User Experience

### For Reddit Posts

1. **First Interaction**: When a user tries to like or comment on a Reddit post without being connected:
   - A confirmation dialog appears: "To interact with Reddit posts, you need to connect your Reddit account. Would you like to connect now?"
   - If they click "OK", they're redirected to Reddit's OAuth page
   - After authorizing, they're redirected back and can interact

2. **After Authentication**:
   - Upvotes go directly to Reddit (visible on Reddit)
   - Comments appear on the actual Reddit thread
   - The platform shows a "Connected as u/username" indicator

3. **Visual Indicator**:
   - Reddit posts display an orange "Reddit" badge with the Reddit logo
   - This helps users understand they're interacting with the actual Reddit community

### For User Posts

1. **Authentication**: Users must be signed into Ignite (Supabase auth)
2. **Interactions**: All likes and comments are stored in Supabase
3. **Privacy**: These are internal to the Ignite platform

## Database Schema (Supabase Only)

### For User-Generated Posts Only

Run this SQL in your Supabase SQL Editor:

```sql
-- Likes for user-generated posts
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comments for user-generated posts
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note**: Reddit posts do NOT use these tables. Reddit interactions go directly to Reddit's API.

## Benefits of Reddit Integration

### 1. **Authentic Community Engagement**
- Users interact with real Reddit posts and comments
- Contributions appear on actual Reddit threads
- Builds presence in the r/ProductManagement community

### 2. **No Duplicate Data**
- Reddit posts and interactions stay on Reddit
- No need to sync or mirror Reddit data
- Always shows real-time Reddit engagement

### 3. **Unified Interface**
- Users can engage with both Reddit and internal content
- Seamless switching between community sources
- Clear visual indicators for source type

### 4. **Real Impact**
- Upvotes count on actual Reddit posts
- Comments contribute to Reddit discussions
- Increases community visibility

## Limitations & Considerations

### Reddit API Rate Limits
- **OAuth requests**: 60 per minute per user
- **API requests**: 600 per 10 minutes per user
- The platform handles token refresh automatically

### Reddit Authentication Expiry
- Access tokens expire after 1 hour
- Refresh tokens are permanent (until revoked)
- The platform automatically refreshes tokens when needed
- If refresh fails, users are prompted to re-authenticate

### Reddit Permissions
Users must grant the following permissions:
- Read their identity (username)
- Read posts and comments
- Vote on posts and comments
- Submit comments

### Offline Mode
- Reddit posts cannot be liked/commented offline
- User posts can still be liked/commented (when Supabase is accessible)
- The UI clearly indicates when Reddit auth is required

## Testing Checklist

### Reddit Integration
- [ ] User can connect Reddit account
- [ ] Upvoting a Reddit post works
- [ ] Removing an upvote works
- [ ] Commenting on a Reddit post works
- [ ] Comments appear on actual Reddit (verify on reddit.com)
- [ ] Reddit badge appears on Reddit posts
- [ ] Token refresh works after 1 hour
- [ ] Re-authentication prompt appears when token expires
- [ ] Error handling works for failed API calls

### Supabase Integration (User Posts)
- [ ] User can like a user-generated post
- [ ] User can unlike a user-generated post
- [ ] User can comment on a user-generated post
- [ ] Comments persist after page refresh
- [ ] Likes persist after page refresh
- [ ] Comment count updates correctly

### User Experience
- [ ] Clear distinction between Reddit and user posts
- [ ] Authentication prompts are clear and helpful
- [ ] Error messages are user-friendly
- [ ] Loading states are handled gracefully

## Troubleshooting

### "Reddit authentication expired"
**Cause**: Access token expired and refresh token failed
**Solution**: User needs to reconnect their Reddit account

### "Failed to vote on Reddit: 403"
**Cause**: Missing permissions or archived post
**Solution**: Check OAuth scopes include `vote`, or the post may be too old (Reddit archives posts after 6 months)

### "Failed to comment on Reddit"
**Cause**: Rate limiting or banned user
**Solution**: Wait for rate limit to reset, or check if user is shadowbanned on Reddit

### Votes not showing up
**Cause**: Reddit's vote fuzzing (anti-spam measure)
**Note**: This is normal Reddit behavior - exact vote counts are hidden

### Comments not appearing
**Cause**: Reddit spam filter
**Solution**: Check the Reddit post directly; comment may be in spam queue

## Security Best Practices

1. **Never expose client secret** in frontend code
2. **Store tokens securely** in localStorage (or secure cookie for production)
3. **Validate all user input** before sending to Reddit API
4. **Handle token refresh** gracefully
5. **Implement rate limiting** on your backend for production
6. **Use HTTPS** for all OAuth redirects in production

## Production Deployment

### Environment Variables
Update your production `.env`:
```env
VITE_REDDIT_REDIRECT_URI=https://yourdomain.com/auth/reddit/callback
```

### Reddit App Configuration
Update your Reddit app settings:
1. Go to https://www.reddit.com/prefs/apps
2. Edit your app
3. Update redirect URI to production URL
4. Save changes

### Backend Proxy (Recommended)
For production, consider proxying Reddit API calls through your backend:
- Keeps client secret secure
- Implements rate limiting
- Provides better error handling
- Enables caching and analytics

## Support

For issues or questions:
- Reddit API Documentation: https://www.reddit.com/dev/api
- Reddit OAuth Guide: https://github.com/reddit-archive/reddit/wiki/OAuth2
- Ignite Support: hello@ignite.education

## Summary

This integration provides a powerful dual-mode system:
- **Reddit posts** → Direct Reddit API integration (authentic community engagement)
- **User posts** → Supabase storage (internal community features)

Users get the best of both worlds: real Reddit community interaction plus internal Ignite community features, all in one unified interface.
