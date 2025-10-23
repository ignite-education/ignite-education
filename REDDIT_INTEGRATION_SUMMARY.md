# Reddit Integration Summary

## What's Been Implemented ✅

Your Ignite Learning Platform now has **dual-mode likes and comments**:

### 🔴 Reddit Posts (r/ProductManagement)
- **Upvotes go directly to Reddit** using Reddit's API
- **Comments appear on actual Reddit threads**
- **Requires Reddit OAuth authentication**
- **Visual "Reddit" badge** to identify Reddit posts
- **Real-time community engagement** with the actual subreddit

### 🟣 User Posts (Ignite Community)
- **Likes stored in Supabase** (`post_likes` table)
- **Comments stored in Supabase** (`post_comments` table)
- **Requires Ignite authentication**
- **Internal community features**

## Key Benefits

1. **Authentic Engagement**: Your users' upvotes and comments appear on real Reddit, building your community presence
2. **No Data Duplication**: Reddit data stays on Reddit, no syncing needed
3. **Unified UX**: Users can interact with both sources in one interface
4. **Real Impact**: Contributions count toward actual Reddit karma and discussions

## Files Modified

### 1. [src/lib/reddit.js](src/lib/reddit.js)
**Added Functions:**
- `voteOnReddit(thingId, direction)` - Upvote/downvote on Reddit
- `commentOnReddit(thingId, text)` - Comment on Reddit posts
- `getRedditComments(subreddit, postId)` - Fetch Reddit comments
- `getUserVote(postFullname)` - Get user's vote status

**Updated:**
- OAuth scope from `submit identity` → `submit identity vote read`

### 2. [src/components/ProgressHub.jsx](src/components/ProgressHub.jsx)
**Updated Functions:**
- `handleLikePost()` - Routes to Reddit API for Reddit posts, Supabase for user posts
- `handleSubmitComment()` - Routes to Reddit API for Reddit posts, Supabase for user posts

**Added:**
- Reddit badge UI component (orange badge with Reddit logo)
- Post source detection (`post.source === 'reddit'`)
- Reddit fullname tracking (`post.redditFullname = 't3_abc123'`)
- Authentication prompts for Reddit interactions

### 3. Database (Supabase)
**Note**: Database schema unchanged!
- `post_likes` and `post_comments` tables are only used for **user-generated posts**
- Reddit posts don't use these tables at all

## How It Works

### When User Clicks "Like" on a Post:

```javascript
1. Check post source
   ├── If Reddit post:
   │   ├── Check Reddit authentication
   │   ├── Prompt to connect if not authenticated
   │   ├── Call voteOnReddit(post.redditFullname, 1)
   │   └── Vote appears on actual Reddit
   │
   └── If user post:
       ├── Check Ignite authentication
       ├── Call likePost(postId, userId)
       └── Like stored in Supabase
```

### When User Comments on a Post:

```javascript
1. Check post source
   ├── If Reddit post:
   │   ├── Check Reddit authentication
   │   ├── Prompt to connect if not authenticated
   │   ├── Call commentOnReddit(post.redditFullname, text)
   │   └── Comment appears on actual Reddit thread
   │
   └── If user post:
       ├── Check Ignite authentication
       ├── Call createComment(postId, userId, text)
       └── Comment stored in Supabase
```

## User Experience Flow

### First Time Interacting with Reddit Post:
1. User clicks like/comment on a Reddit post
2. Dialog: "To interact with Reddit posts, you need to connect your Reddit account. Would you like to connect now?"
3. User clicks "OK"
4. Redirected to Reddit OAuth page
5. User grants permissions: `identity`, `read`, `vote`, `submit`
6. Redirected back to Ignite
7. Can now like and comment on Reddit posts

### Subsequent Interactions:
- No prompts needed
- Instant upvoting and commenting
- Shows "Connected as u/username" in post modal

## Visual Indicators

### Reddit Posts Show:
```
[Avatar] u/JohnDoe • 2h ago [🔴 Reddit]
```
- Orange badge with Reddit logo
- Clicking post title opens Reddit thread

### User Posts Show:
```
[Avatar] u/JaneDoe • 1h ago
```
- No badge
- Standard Ignite styling

## Setup Required

### 1. Reddit OAuth Configuration
Add to your `.env`:
```env
VITE_REDDIT_CLIENT_ID=your_client_id
VITE_REDDIT_CLIENT_SECRET=your_client_secret
VITE_REDDIT_REDIRECT_URI=http://localhost:5173/auth/reddit/callback
```

### 2. Supabase Tables (User Posts Only)
Run `database-schema.sql` in Supabase SQL Editor to create:
- `post_likes` table
- `post_comments` table

## Testing

### Test Reddit Integration:
1. ✅ Click like on a Reddit post
2. ✅ Should prompt for Reddit authentication
3. ✅ After auth, upvote should work
4. ✅ Check the actual Reddit post to verify vote
5. ✅ Try commenting on Reddit post
6. ✅ Verify comment appears on actual Reddit thread

### Test User Post Integration:
1. ✅ Click like on a user-generated post (no Reddit badge)
2. ✅ Should work with Ignite authentication
3. ✅ Like should persist in Supabase
4. ✅ Try commenting on user post
5. ✅ Comment should persist in Supabase

## Documentation Files

1. **[REDDIT_INTEGRATION_GUIDE.md](REDDIT_INTEGRATION_GUIDE.md)** - Complete technical guide
   - Architecture diagrams
   - API documentation
   - Code examples
   - Troubleshooting
   - Production deployment guide

2. **[database-schema.sql](database-schema.sql)** - Supabase setup for user posts
   - `post_likes` table
   - `post_comments` table
   - RLS policies
   - Indexes

3. **[LIKES_AND_COMMENTS_SETUP.md](LIKES_AND_COMMENTS_SETUP.md)** - Original Supabase-only guide (still relevant for user posts)

## Quick Start

1. **Set up Reddit OAuth** (see [REDDIT_INTEGRATION_GUIDE.md](REDDIT_INTEGRATION_GUIDE.md))
2. **Run database schema** in Supabase SQL Editor
3. **Test in development**:
   ```bash
   npm run dev
   ```
4. **Try liking and commenting** on both Reddit and user posts

## Benefits Over Previous Implementation

| Feature | Before | After |
|---------|--------|-------|
| Reddit posts | Stored in Supabase | Direct Reddit API |
| Reddit upvotes | Local only | Appear on Reddit |
| Reddit comments | Local only | Appear on Reddit |
| Community impact | None | Real Reddit engagement |
| Data sync | Required | Not needed |
| User auth | Ignite only | Dual: Ignite + Reddit |

## What Happens on Reddit

When a user upvotes a Reddit post from Ignite:
- ✅ Vote counts on the actual Reddit post
- ✅ User's Reddit karma increases
- ✅ Post ranking on r/ProductManagement is affected

When a user comments on a Reddit post from Ignite:
- ✅ Comment appears on the actual Reddit thread
- ✅ Other Reddit users can see and reply to it
- ✅ User's Reddit karma increases from upvotes
- ✅ Helps build Ignite's presence on r/ProductManagement

## Security & Best Practices

✅ **OAuth tokens** stored in localStorage
✅ **Automatic token refresh** after 1 hour
✅ **Clear authentication prompts** for users
✅ **Source-aware routing** (Reddit vs Supabase)
✅ **Error handling** for expired auth
✅ **Rate limiting** handled by Reddit API
✅ **RLS policies** on Supabase tables

## Next Steps (Optional Enhancements)

1. **Backend Proxy**: Move Reddit API calls to backend for better security
2. **Comment Threading**: Display nested Reddit comment threads
3. **Vote Status Sync**: Show if user has already upvoted a Reddit post
4. **Notifications**: Notify when someone replies to your Reddit comment
5. **Post Sharing**: Share Ignite posts to Reddit
6. **Analytics**: Track which Reddit posts get most engagement

## Support

- Technical docs: [REDDIT_INTEGRATION_GUIDE.md](REDDIT_INTEGRATION_GUIDE.md)
- Reddit API: https://www.reddit.com/dev/api
- Ignite support: hello@ignite.education

---

**🎉 Your users can now engage with the actual Reddit community directly from Ignite!**
