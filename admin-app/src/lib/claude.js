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
