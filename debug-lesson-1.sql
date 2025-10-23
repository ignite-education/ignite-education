-- Check exactly what's in Module 1, Lesson 1 right now
SELECT
    id,
    course_id,
    module_number,
    lesson_number,
    section_number,
    lesson_name,
    title,
    content_type,
    LEFT(content_text, 100) as content_preview,
    order_index,
    created_at
FROM lessons
WHERE course_id = 'product-management'
    AND module_number = 1
    AND lesson_number = 1
ORDER BY section_number, order_index;
