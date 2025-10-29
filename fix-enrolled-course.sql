-- Fix the enrolled_course mismatch
-- Update user's enrolled_course from 'product-management' to 'product-manager'

UPDATE users
SET enrolled_course = 'product-manager'
WHERE enrolled_course = 'product-management';

-- Verify the update
SELECT id, email, enrolled_course, first_name
FROM users
WHERE enrolled_course = 'product-manager';
