/**
 * Dynamic SEO keyword generator for course pages
 * Generates optimized keywords based on course title
 */

/**
 * Generate keywords for a course based on its title
 * @param {string} courseTitle - The course title (e.g., "Product Manager", "Data Analyst")
 * @returns {string} Comma-separated keywords string
 */
export const generateCourseKeywords = (courseTitle) => {
  const title = courseTitle.toLowerCase();

  const keywords = [
    // Primary - high intent
    `${title} courses free`,
    `how do I become a ${title}`,
    `${title} courses uk`,

    // Secondary - specific queries
    `${title} certification courses free`,
    `best free ${title} courses`,
    `${title} courses online`,
    `${title} training free`,
    `${title} course free with certificate`,
    `how do I become a ${title} with no experience`,

    // Tertiary - discovery
    `${title} courses`,
    title,
    `learn ${title}`,
    `what qualifications required for ${title}`,
    `what are the best ${title} courses`,
    `${title} courses free online`,
  ];

  return keywords.join(', ');
};
