-- Fix enrolled course names from role names to course names
-- This updates users who enrolled in "Product Manager" to show "Product Management"
-- which matches the course name used in the analytics dashboard

UPDATE public.users
SET
  enrolled_course = 'Product Management',
  updated_at = NOW()
WHERE enrolled_course = 'Product Manager';

-- Also update any Cyber Security Analyst to Cyber Security
UPDATE public.users
SET
  enrolled_course = 'Cyber Security',
  updated_at = NOW()
WHERE enrolled_course = 'Cyber Security Analyst';

-- Check the results
SELECT
  id,
  first_name,
  last_name,
  enrolled_course,
  updated_at
FROM public.users
WHERE enrolled_course IN ('Product Management', 'Cyber Security')
ORDER BY updated_at DESC;
