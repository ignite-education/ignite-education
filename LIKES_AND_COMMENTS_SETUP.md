# Likes and Comments Setup Guide

This document explains how to set up the likes and comments functionality for posts in the Ignite Learning Platform's Progress Hub.

## Overview

Users can now:
- **Like/Unlike posts** - Both user-generated posts and Reddit posts can be liked
- **Comment on posts** - Add comments to any post with real-time updates
- **View comment counts** - See the actual number of comments on each post
- **Persistent data** - All likes and comments are stored in Supabase

## Database Setup

### Step 1: Run the SQL Schema

1. Open your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Copy the contents of `database-schema.sql` from the root of this project
4. Paste it into the SQL Editor and click **Run**

This will create:
- `post_likes` table - Stores user likes on posts
- `post_comments` table - Stores user comments on posts
- Indexes for performance optimization
- Row Level Security (RLS) policies for secure access
- Triggers for automatic timestamp updates

### Database Schema Details

#### `post_likes` table:
```sql
- id: UUID (Primary Key)
- post_id: TEXT (Format: 'user-{id}' or 'reddit-{id}')
- user_id: UUID (References auth.users)
- created_at: TIMESTAMPTZ
```

#### `post_comments` table:
```sql
- id: UUID (Primary Key)
- post_id: TEXT (Format: 'user-{id}' or 'reddit-{id}')
- user_id: UUID (References auth.users)
- content: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Step 2: Verify Row Level Security

The tables are protected with RLS policies:

**post_likes policies:**
- ✅ Anyone can view all likes
- ✅ Users can only create likes for themselves
- ✅ Users can only delete their own likes

**post_comments policies:**
- ✅ Anyone can view all comments
- ✅ Users can create comments for themselves
- ✅ Users can update their own comments
- ✅ Users can delete their own comments

## Features Implemented

### 1. Like/Unlike Functionality

**Location:** [ProgressHub.jsx:861-904](src/components/ProgressHub.jsx#L861-L904)

- Users must be authenticated to like posts
- Likes are persisted to the database
- Like count updates in real-time
- Visual feedback with filled/unfilled heart icon
- Prevents duplicate likes with unique constraint

**API Functions:**
- `likePost(postId, userId)` - Add a like
- `unlikePost(postId, userId)` - Remove a like
- `getUserLikedPosts(userId)` - Get all posts a user has liked

### 2. Comments Functionality

**Location:** [ProgressHub.jsx:907-950](src/components/ProgressHub.jsx#L907-L950)

- Users must be authenticated to comment
- Comments are persisted to the database
- Comments display in chronological order
- Real-time comment count updates
- Shows author name and timestamp
- Empty state when no comments exist

**API Functions:**
- `createComment(postId, userId, content)` - Add a comment
- `getPostComments(postId)` - Get comments for a specific post
- `getMultiplePostsComments(postIds)` - Get comments for multiple posts
- `getPostCommentCount(postId)` - Get comment count

### 3. Data Loading

On page load, the app:
1. Fetches all community posts (user + Reddit)
2. Loads user's liked posts from the database
3. Loads all comments for visible posts
4. Displays accurate like/comment counts

## User Experience

### Likes
1. Click the thumbs-up icon to like a post
2. Icon fills with pink color when liked
3. Click again to unlike
4. Like count updates immediately

### Comments
1. Hover over a post to see the comment section
2. Type a comment in the input field
3. Press Enter or click "Post" to submit
4. Comment appears immediately below the input
5. Other users' comments are displayed chronologically

## Technical Implementation

### Component Changes

**New State Variables:**
```javascript
const [likedPosts, setLikedPosts] = useState(new Set());
const [postComments, setPostComments] = useState({});
const [commentInputs, setCommentInputs] = useState({});
```

**New API Imports:**
```javascript
import {
  likePost,
  unlikePost,
  getUserLikedPosts,
  createComment,
  getMultiplePostsComments
} from '../lib/api';
```

### API Changes

Added 11 new functions to [src/lib/api.js](src/lib/api.js):
- 6 functions for likes management
- 5 functions for comments management

## Testing Checklist

- [ ] Database tables created successfully
- [ ] User can like a post
- [ ] User can unlike a post
- [ ] Like count updates correctly
- [ ] User can add a comment
- [ ] Comments display correctly
- [ ] Comment count updates in real-time
- [ ] Non-authenticated users see appropriate messages
- [ ] RLS policies prevent unauthorized access
- [ ] Comments persist after page refresh
- [ ] Likes persist after page refresh

## Known Limitations & Future Improvements

### Current Limitations:
1. **User Metadata in Comments**: Comments show "User" as the default name because fetching user metadata from Supabase Auth requires admin privileges.

### Recommended Improvements:
1. **User Profiles Table**: Create a public `user_profiles` table to store display names
   ```sql
   CREATE TABLE user_profiles (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id),
     display_name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Comment Editing**: Add ability to edit comments (API function already exists)

3. **Comment Deletion**: Add UI for users to delete their own comments

4. **Nested Comments**: Add reply functionality for comment threads

5. **Like Notifications**: Notify users when their posts are liked

6. **Comment Notifications**: Notify users when someone comments on their posts

7. **Pagination**: Add pagination for comments on posts with many comments

8. **Optimistic Updates**: Improve UX with optimistic UI updates before database confirmation

## Troubleshooting

### Likes not working?
- Check browser console for errors
- Verify database tables exist in Supabase
- Confirm RLS policies are enabled
- Ensure user is authenticated

### Comments not displaying?
- Check if `post_comments` table exists
- Verify the `getMultiplePostsComments` function is returning data
- Check browser console for API errors
- Confirm post IDs match between posts and comments

### "Please sign in" errors?
- User authentication is required for likes and comments
- Check that `authUser` is defined in the component
- Verify Supabase auth session is active

## Support

For issues or questions:
- Check the browser console for error messages
- Review the Supabase logs in your dashboard
- Verify database tables and RLS policies are set up correctly
- Contact: hello@ignite.education
