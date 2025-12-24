-- Migration: Add columns for inactivity tracking
-- These columns enable the inactivity reminder email system

-- Add last_active_at column to track user activity
-- This should be updated whenever the user logs in or interacts with the app
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- Add inactivity_email_sent_at to prevent sending duplicate reminder emails
-- This tracks when we last sent an inactivity reminder to the user
ALTER TABLE users ADD COLUMN IF NOT EXISTS inactivity_email_sent_at TIMESTAMPTZ;

-- Set last_active_at to updated_at for existing users (best estimate of last activity)
UPDATE users
SET last_active_at = COALESCE(updated_at, created_at, NOW())
WHERE last_active_at IS NULL;

-- Create index for efficient querying of inactive users
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_inactivity_email ON users(inactivity_email_sent_at);
