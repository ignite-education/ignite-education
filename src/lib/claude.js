/**
 * Generate course description using Claude AI via backend API
 * Analyzes module and lesson structure to create intelligent summary
 * @param {string} courseTitle - The course title
 * @param {string} courseType - The course type (specialism/skill/subject)
 * @param {Array} modules - Array of module objects with lessons
 * @returns {Promise<string>} Generated description (max 250 chars)
 */
export async function generateCourseDescription(courseTitle, courseType, modules) {
  // Only allow on production, not localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    throw new Error('AI description generation is only available on the live site');
  }

  // Use production origin
  const apiUrl = window.location.origin;

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
