/**
 * Example usage of API functions
 * This file demonstrates how to use the different data fetching functions
 */

import { getLessons, getLessonsByModule, getCommunityPosts } from './api';

// Example 1: Get all lessons for a course (flat list)
export async function exampleGetLessons() {
  try {
    const courseId = 'product-management';
    const lessons = await getLessons(courseId);

    console.log('All lessons:', lessons);
    // Output: Array of lesson objects ordered by order_index

    return lessons;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Get lessons grouped by module and lesson number
export async function exampleGetLessonsByModule() {
  try {
    const courseId = 'product-management';
    const groupedLessons = await getLessonsByModule(courseId);

    console.log('Grouped lessons:', groupedLessons);
    /* Output structure:
    {
      module_1: {
        lesson_1: [
          { id: 1, module_number: 1, lesson_number: 1, section_number: 1, title: "...", ... },
          { id: 2, module_number: 1, lesson_number: 1, section_number: 2, title: "...", ... }
        ],
        lesson_2: [
          { id: 3, module_number: 1, lesson_number: 2, section_number: 1, title: "...", ... }
        ]
      },
      module_2: {
        lesson_1: [ ... ],
        lesson_2: [ ... ]
      }
    }
    */

    // Accessing specific module/lesson
    const module1Lesson1 = groupedLessons.module_1?.lesson_1 || [];
    console.log('Module 1, Lesson 1:', module1Lesson1);

    return groupedLessons;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Using grouped lessons in a React component
export function exampleReactUsage() {
  return `
  import { useState, useEffect } from 'react';
  import { getLessonsByModule } from '../lib/api';

  function CourseStructure() {
    const [modules, setModules] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      async function loadCourse() {
        try {
          const courseId = 'product-management';
          const data = await getLessonsByModule(courseId);
          setModules(data);
        } catch (error) {
          console.error('Error loading course:', error);
        } finally {
          setLoading(false);
        }
      }
      loadCourse();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
      <div>
        {Object.entries(modules).map(([moduleKey, lessons]) => (
          <div key={moduleKey}>
            <h2>{moduleKey.replace('_', ' ')}</h2>
            {Object.entries(lessons).map(([lessonKey, sections]) => (
              <div key={lessonKey}>
                <h3>{lessonKey.replace('_', ' ')}</h3>
                <ul>
                  {sections.map((section) => (
                    <li key={section.id}>{section.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  `;
}

// Example 4: Get community posts with limit
export async function exampleGetCommunityPosts() {
  try {
    // Get all posts
    const allPosts = await getCommunityPosts();
    console.log('All posts:', allPosts);

    // Get only 10 most recent posts
    const recentPosts = await getCommunityPosts(10);
    console.log('Recent 10 posts:', recentPosts);

    return recentPosts;
  } catch (error) {
    console.error('Error:', error);
  }
}
