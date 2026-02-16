-- Create a trigger to automatically create a user record when someone signs up
-- This ensures that auth.users and public.users stay in sync

-- First, create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, onboarding_completed, role)
  VALUES (
    NEW.id,
    TRIM(COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      ''
    )),
    TRIM(COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2),
      ''
    )),
    false,
    'student'
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
INSERT INTO public.users (id, first_name, last_name, onboarding_completed, role)
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
  'student' as role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
