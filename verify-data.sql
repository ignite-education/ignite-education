-- Verify that data was saved correctly

-- Check courses
SELECT 'Courses:' as info;
SELECT * FROM courses;

-- Check modules
SELECT 'Modules:' as info;
SELECT * FROM modules;

-- Check lessons metadata
SELECT 'Lessons Metadata:' as info;
SELECT * FROM lessons_metadata;

-- Check lesson content
SELECT 'Lesson Content:' as info;
SELECT
    course_id,
    module_number,
    lesson_number,
    section_number,
    lesson_name,
    title,
    content_type,
    LEFT(content_text, 50) as content_preview
FROM lessons
ORDER BY module_number, lesson_number, section_number;
