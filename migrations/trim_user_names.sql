-- Trim whitespace from existing user names in public.users
-- Run this in the Supabase SQL editor to fix any names with trailing/leading spaces
-- (e.g., LinkedIn OAuth sometimes returns names with trailing spaces)

UPDATE public.users
SET first_name = TRIM(first_name), last_name = TRIM(last_name)
WHERE first_name != TRIM(first_name) OR last_name != TRIM(last_name);
