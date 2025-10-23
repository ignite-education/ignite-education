-- Check what content exists for Module 1, Lesson 1
SELECT
    id,
    section_number,
    lesson_name,
    title,
    content_type,
    content_text,
    order_index,
    created_at
FROM lessons
WHERE course_id = 'product-management'
    AND module_number = 1
    AND lesson_number = 1
ORDER BY section_number, order_index;
