-- Delete all existing content for Module 1, Lesson 1
-- This will remove the old content so only what you upload through the upload page appears

DELETE FROM lessons
WHERE course_id = 'product-management'
    AND module_number = 1
    AND lesson_number = 1;

-- Verify deletion
SELECT COUNT(*) as remaining_rows
FROM lessons
WHERE course_id = 'product-management'
    AND module_number = 1
    AND lesson_number = 1;

-- This should return 0 rows, meaning all old content has been deleted
