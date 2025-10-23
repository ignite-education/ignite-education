-- Force delete ALL content for Module 1, Lesson 1
-- This uses multiple approaches to ensure complete deletion

-- Approach 1: Delete by course_id, module, and lesson
DELETE FROM lessons
WHERE course_id = 'product-management'
    AND module_number = 1
    AND lesson_number = 1;

-- Approach 2: Delete any lessons with these specific titles (in case there's a mismatch)
DELETE FROM lessons
WHERE title IN (
    'Role and Responsibilities of a Product Manager',
    'Overview of Product Management',
    'Core Responsibilities of a Product Manager',
    'Competencies and Skills for PMs',
    'The PM''s Role in Company Strategy and Culture',
    'Learning Objectives',
    'Section 1: Overview of Product Management',
    'Defining Product Management',
    'Lesson 1 - Role and Responsibilities of a Product Manager'
);

-- Approach 3: Delete by lesson_name pattern
DELETE FROM lessons
WHERE lesson_name LIKE '%Role and Responsibilities%';

-- Verify everything is gone
SELECT
    id,
    course_id,
    module_number,
    lesson_number,
    lesson_name,
    title
FROM lessons
WHERE course_id = 'product-management'
    AND module_number = 1
    AND lesson_number = 1;

-- Should return 0 rows
