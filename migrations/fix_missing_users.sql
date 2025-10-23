-- Fix missing user records
-- This script finds all auth users that don't have a corresponding record in public.users
-- and creates them automatically

-- Run this in your Supabase SQL Editor

-- Insert missing user records from auth.users into public.users
INSERT INTO public.users (id, first_name, last_name, onboarding_completed)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'first_name',
    split_part(au.raw_user_meta_data->>'full_name', ' ', 1)
  ) as first_name,
  COALESCE(
    au.raw_user_meta_data->>'last_name',
    split_part(au.raw_user_meta_data->>'full_name', ' ', 2)
  ) as last_name,
  false as onboarding_completed
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Check the results
SELECT
  au.id,
  au.email,
  pu.first_name,
  pu.last_name,
  pu.onboarding_completed
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;
