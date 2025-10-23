-- Database schema for Ignite Learning Platform
-- Run these SQL commands in your Supabase SQL editor to set up the tables

-- =====================================================
-- POST LIKES TABLE
-- =====================================================
-- Stores likes on community posts (both user posts and Reddit posts)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL, -- Can be 'user-{id}' or 'reddit-{id}'
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Each user can only like a post once
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

-- Enable Row Level Security
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_likes
CREATE POLICY "Users can view all likes"
  ON post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- POST COMMENTS TABLE
-- =====================================================
-- Stores comments on community posts
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL, -- Can be 'user-{id}' or 'reddit-{id}'
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_comments
CREATE POLICY "Users can view all comments"
  ON post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for post_comments
CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- OPTIONAL: Add comment count to community_posts
-- =====================================================
-- You can also add a comment_count column to community_posts for performance
-- This would need to be updated via triggers or manually when comments are added/deleted

-- ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
-- ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
