/**
 * Generate SEO keywords for a course based on its title
 */
export function generateCourseKeywords(courseTitle: string, courseType?: string): string {
  const title = courseTitle.toLowerCase()

  // Specialisms are career paths people "become"; skills and subjects are things
  // they "learn". An unknown or missing type defaults to the specialism wording.
  const isCareer = !courseType || courseType === 'specialism'
  const howTo = isCareer ? `how do I become a ${title}` : `how do I learn ${title}`

  const keywords = [
    `${title} courses free`,
    howTo,
    `${title} courses uk`,
    `${title} certification courses free`,
    `best free ${title} courses`,
    `${title} courses online`,
    `${title} training free`,
    `${title} course free with certificate`,
    `${howTo} with no experience`,
    `${title} courses`,
    title,
    `learn ${title}`,
    `what qualifications required for ${title}`,
    `what are the best ${title} courses`,
    `${title} courses free online`,
  ]

  return keywords.join(', ')
}
