/**
 * Generate course description using Claude AI via backend API
 * Analyzes module and lesson structure to create intelligent summary
 * @param {string} courseTitle - The course title
 * @param {string} courseType - The course type (specialism/skill/subject)
 * @param {Array} modules - Array of module objects with lessons
 * @returns {Promise<string>} Generated description (max 250 chars)
 */
export async function generateCourseDescription(courseTitle, courseType, modules) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    throw new Error('AI description generation is only available on the live site');
  }

  const apiUrl = import.meta.env.VITE_API_URL;

  try {
    const response = await fetch(`${apiUrl}/api/generate-course-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseTitle,
        courseType,
        modules
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate description');
    }

    const data = await response.json();
    return data.description;

  } catch (error) {
    console.error('Error generating description with Claude:', error);
    throw new Error(error.message || 'Failed to generate description. Please try again.');
  }
}

/**
 * Generate full course content (description + lesson names/descriptions/bullet points)
 * For lessons-only courses
 * @param {string} courseTitle - The course title
 * @param {string} courseType - The course type (skill/subject)
 * @param {number} lessonCount - Number of lessons to generate
 * @param {string} complexity - Complexity level: 'beginner', 'intermediate', or 'advanced'
 * @returns {Promise<{description: string, lessons: Array<{name: string, description: string, bullet_points: string[]}>}>}
 */
export async function generateCourseContent(courseTitle, courseType, lessonCount, complexity = 'intermediate') {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    throw new Error('AI content generation is only available on the live site');
  }

  const apiUrl = import.meta.env.VITE_API_URL;

  try {
    const response = await fetch(`${apiUrl}/api/generate-course-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseTitle,
        courseType,
        lessonCount,
        complexity
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate course content');
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error generating course content with Claude:', error);
    throw new Error(error.message || 'Failed to generate course content. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Course outline generation
//
// These deliberately do NOT block on localhost the way the two functions above
// do. That guard predates local Express: `npm run server` serves the same
// endpoints on :3001, so blocking only prevented testing.
// ---------------------------------------------------------------------------

const API = () => import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

async function postJson(path, body) {
  const response = await fetch(`${API()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request to ${path} failed`);
  }
  return response.json();
}

/**
 * Generate a whole modules→lessons tree for a course.
 * @returns {Promise<{description: string, modules: Array<{name: string, lessons: Array}>}>}
 */
export function generateCourseOutline(courseTitle, courseType, { complexity = 'intermediate', moduleCount = 5, lessonsPerModule = 4 } = {}) {
  return postJson('/api/generate-course-outline', { courseTitle, courseType, complexity, moduleCount, lessonsPerModule });
}

/**
 * Generate the lessons for a single module, told about its sibling modules so
 * it doesn't repeat their material.
 * @returns {Promise<{lessons: Array<{name, description, bullet_points}>}>}
 */
export function generateModuleLessons(courseTitle, moduleName, { lessonCount = 4, complexity = 'intermediate', otherModules = [] } = {}) {
  return postJson('/api/generate-module-lessons', { courseTitle, moduleName, lessonCount, complexity, otherModules });
}

/**
 * Generate the 3 card bullet points for one lesson.
 * @returns {Promise<{bullet_points: [string, string, string]}>}
 */
export function generateLessonBullets({ courseTitle, moduleName, lessonName, lessonDescription } = {}) {
  return postJson('/api/generate-lesson-bullets', { courseTitle, moduleName, lessonName, lessonDescription });
}

/**
 * Write or rewrite a single lesson paragraph.
 *
 * @param {'generate'|'enhance'} mode
 * @returns {Promise<{text: string, defaultGuidance: string}>}
 */
export function generateParagraph(mode, { existingText, instruction, guidance, lessonName, headingText, precedingText } = {}) {
  return postJson('/api/admin/generate-paragraph', {
    mode, existingText, instruction, guidance, lessonName, headingText, precedingText,
  });
}

/** The server's built-in house style, shown as the starting point for guidance. */
export async function fetchParagraphGuidance() {
  const response = await fetch(`${API()}/api/admin/paragraph-guidance`);
  if (!response.ok) throw new Error('Failed to load guidance');
  const data = await response.json();
  return data.guidance;
}
