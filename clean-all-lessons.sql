-- Delete ALL lesson content from the database
-- This will give you a completely clean slate
-- After running this, you can upload fresh content through the upload page

-- Option 1: Delete ALL lessons for product-management course
DELETE FROM lessons WHERE course_id = 'product-management';

-- Verify deletion
SELECT
    course_id,
    module_number,
    lesson_number,
    COUNT(*) as section_count
FROM lessons
WHERE course_id = 'product-management'
GROUP BY course_id, module_number, lesson_number
ORDER BY module_number, lesson_number;

-- This should return 0 rows, meaning all content has been deleted
