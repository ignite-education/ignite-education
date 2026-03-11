-- Add country column to users table (2-letter ISO country code, e.g. 'US', 'GB', 'AU')
-- Captured at sign-up from Vercel geo headers
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country TEXT;
