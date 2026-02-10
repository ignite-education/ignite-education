/**
 * Generate SEO keywords for a course based on its title
 */
export function generateCourseKeywords(courseTitle: string): string {
  const title = courseTitle.toLowerCase()

  const keywords = [
    `${title} courses free`,
    `how do I become a ${title}`,
    `${title} courses uk`,
    `${title} certification courses free`,
    `best free ${title} courses`,
    `${title} courses online`,
    `${title} training free`,
    `${title} course free with certificate`,
    `how do I become a ${title} with no experience`,
    `${title} courses`,
    title,
    `learn ${title}`,
    `what qualifications required for ${title}`,
    `what are the best ${title} courses`,
    `${title} courses free online`,
  ]

  return keywords.join(', ')
}
