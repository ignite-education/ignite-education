-- Update enrolled course names to match new naming convention
-- Product Management -> Product Manager
-- Cyber Security -> Cyber Security Analyst

UPDATE public.users
SET
  enrolled_course = 'Product Manager',
  updated_at = NOW()
WHERE enrolled_course = 'Product Management';

UPDATE public.users
SET
  enrolled_course = 'Cyber Security Analyst',
  updated_at = NOW()
WHERE enrolled_course = 'Cyber Security';

-- Verify the results
SELECT
  id,
  first_name,
  last_name,
  enrolled_course,
  updated_at
FROM public.users
WHERE enrolled_course IN ('Product Manager', 'Cyber Security Analyst')
ORDER BY updated_at DESC;
