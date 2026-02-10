import type { Course, Coach, FAQ } from '@/types/course'

const BASE_URL = 'https://ignite.education'

/**
 * Generate Course schema.org structured data
 */
export function generateCourseStructuredData(
  course: Course,
  coaches: Coach[],
  courseSlug: string
) {
  const teaches = course.module_structure?.flatMap(m => [
    m.name,
    ...(m.lessons?.map(l => l.name) || []),
  ]) || []

  const totalLessons = course.module_structure?.reduce(
    (acc, m) => acc + (m.lessons?.length || 0), 0
  ) || 10

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    'name': course.title,
    'description': course.description,
    'url': `${BASE_URL}/courses/${courseSlug}`,
    'image': course.image_url || `${BASE_URL}/og-image.png`,
    'provider': {
      '@type': 'EducationalOrganization',
      'name': 'Ignite Education',
      'url': BASE_URL,
      'sameAs': [
        'https://www.linkedin.com/school/ignite-courses',
      ],
    },
    'educationalLevel': 'Beginner',
    'courseMode': 'online',
    'isAccessibleForFree': true,
    'inLanguage': 'en-GB',
    'teaches': teaches,
    'coursePrerequisites': 'No prior experience required. Basic computer skills and internet access.',
    'timeRequired': `PT${totalLessons * 2}H`,
    'numberOfCredits': totalLessons,
    'educationalCredentialAwarded': {
      '@type': 'EducationalOccupationalCredential',
      'credentialCategory': 'Certificate of Completion',
      'name': `${course.title} Certificate`,
      'description': `Verified certificate of completion for the ${course.title} course from Ignite Education`,
    },
    'audience': {
      '@type': 'EducationalAudience',
      'educationalRole': 'student',
      'audienceType': 'Career changers, graduates, aspiring professionals',
    },
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'GBP',
      'availability': 'https://schema.org/InStock',
      'url': `${BASE_URL}/courses/${courseSlug}`,
      'validFrom': '2024-01-01',
    },
    'hasCourseInstance': {
      '@type': 'CourseInstance',
      'courseMode': 'online',
      'courseSchedule': {
        '@type': 'Schedule',
        'repeatFrequency': 'P1W',
        'repeatCount': Math.ceil(totalLessons / 4),
      },
      'courseWorkload': `PT${totalLessons * 2}H`,
    },
    'instructor': coaches.map(coach => ({
      '@type': 'Person',
      'name': coach.name,
      'jobTitle': coach.position,
      'image': coach.image_url,
      'worksFor': {
        '@type': 'Organization',
        'name': 'Ignite Education',
      },
    })),
  }
}

/**
 * Generate FAQ schema.org structured data
 */
export function generateFAQStructuredData(faqs: FAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  }
}

/**
 * Generate Breadcrumb schema.org structured data
 */
export function generateBreadcrumbStructuredData(courseTitle: string, courseSlug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Courses', 'item': `${BASE_URL}/welcome` },
      { '@type': 'ListItem', 'position': 3, 'name': courseTitle, 'item': `${BASE_URL}/courses/${courseSlug}` },
    ],
  }
}

/**
 * Generate Speakable schema.org structured data for voice search
 */
export function generateSpeakableSchema(
  url: string,
  title: string,
  cssSelectors: string[] = ['.course-description', '.curriculum-section', 'h1', '.faq-section']
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': title,
    'speakable': {
      '@type': 'SpeakableSpecification',
      'cssSelector': cssSelectors,
    },
    'url': url,
  }
}
