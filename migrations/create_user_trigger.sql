-- Create a trigger to automatically create a user record when someone signs up
-- This ensures that auth.users and public.users stay in sync

-- First, create the function that will be called by the trigger
-- Also generates a public profile username + copies the avatar URL out of
-- auth metadata (which is not anon-readable) so the public profile page can
-- show it. See migrations/add_public_profiles.sql for the helper functions.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first  TEXT;
  v_last   TEXT;
BEGIN
  v_first := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
    ''
  ));
  v_last := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2),
    ''
  ));

  INSERT INTO public.users (id, first_name, last_name, onboarding_completed, role, username, avatar_url)
  VALUES (
    NEW.id,
    v_first,
    v_last,
    false,
    'student',
    public.generate_username(v_first, v_last),
    COALESCE(
      NEW.raw_user_meta_data->>'custom_avatar_url',
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also fix any existing missing users
INSERT INTO public.users (id, first_name, last_name, onboarding_completed, role, username, avatar_url)
SELECT
  au.id,
  TRIM(COALESCE(
    au.raw_user_meta_data->>'first_name',
    split_part(au.raw_user_meta_data->>'full_name', ' ', 1),
    ''
  )) as first_name,
  TRIM(COALESCE(
    au.raw_user_meta_data->>'last_name',
    split_part(au.raw_user_meta_data->>'full_name', ' ', 2),
    ''
  )) as last_name,
  false as onboarding_completed,
  'student' as role,
  public.generate_username(
    TRIM(COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.raw_user_meta_data->>'full_name', ' ', 1), '')),
    TRIM(COALESCE(au.raw_user_meta_data->>'last_name', split_part(au.raw_user_meta_data->>'full_name', ' ', 2), ''))
  ) as username,
  COALESCE(
    au.raw_user_meta_data->>'custom_avatar_url',
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ) as avatar_url
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
