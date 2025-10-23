-- Verify that the database is now clean
SELECT COUNT(*) as total_lessons FROM lessons WHERE course_id = 'product-management';

-- This should return 0, meaning the database is clean and ready for new content
