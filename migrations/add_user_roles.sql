-- Add role column to public.users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin'));

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update existing users to 'student' role if null
UPDATE public.users SET role = 'student' WHERE role IS NULL;

-- Add comment
COMMENT ON COLUMN public.users.role IS 'User role: student (learning only), teacher (learning + curriculum), admin (full access)';
