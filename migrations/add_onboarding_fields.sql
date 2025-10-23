-- Create users table and add onboarding fields
-- Run this migration in your Supabase SQL Editor

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  enrolled_course TEXT,
  seniority_level TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own data
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON public.users(onboarding_completed);

-- Create function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
  full_name_val TEXT;
BEGIN
  -- Try to get first_name and last_name from metadata
  first_name_val := new.raw_user_meta_data->>'first_name';
  last_name_val := new.raw_user_meta_data->>'last_name';

  -- If not present, try to parse from full_name (for OAuth providers like Google)
  IF first_name_val IS NULL THEN
    full_name_val := new.raw_user_meta_data->>'full_name';
    IF full_name_val IS NOT NULL THEN
      first_name_val := split_part(full_name_val, ' ', 1);
      last_name_val := split_part(full_name_val, ' ', 2);
    END IF;
  END IF;

  INSERT INTO public.users (id, first_name, last_name)
  VALUES (
    new.id,
    first_name_val,
    last_name_val
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
