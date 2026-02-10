import type { Course, Coach, FAQ } from '@/types/course'
import type { BlogPost } from '@/types/blog'

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
 * Generate ItemList schema.org structured data for course catalog
 */
export function generateItemListStructuredData(
  coursesByType: { specialism: Array<{ name: string; title?: string; description?: string }>; skill: Array<{ name: string; title?: string; description?: string }>; subject: Array<{ name: string; title?: string; description?: string }> }
) {
  const allCourses = [
    ...coursesByType.specialism,
    ...coursesByType.skill,
    ...coursesByType.subject,
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Free Online Courses at Ignite Education',
    'description': 'Explore free, expert-led courses in Product Management, Cybersecurity, Data Analysis, and more.',
    'url': `${BASE_URL}/courses`,
    'numberOfItems': allCourses.length,
    'itemListElement': allCourses.map((course, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'Course',
        'name': course.title || course.name,
        'description': course.description || `Learn ${course.title || course.name} from industry experts`,
        'url': `${BASE_URL}/courses/${course.name?.toLowerCase().replace(/\s+/g, '-')}`,
        'provider': {
          '@type': 'EducationalOrganization',
          'name': 'Ignite Education',
          'url': BASE_URL,
        },
        'isAccessibleForFree': true,
        'inLanguage': 'en-GB',
      },
    })),
  }
}

/**
 * Generate BlogPosting schema.org structured data
 */
export function generateBlogPostStructuredData(post: BlogPost, postSlug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    'headline': post.meta_title || post.title,
    'description': post.meta_description || post.excerpt,
    'image': post.og_image || post.featured_image || `${BASE_URL}/og-image.png`,
    'datePublished': post.published_at,
    'dateModified': post.updated_at,
    'author': {
      '@type': 'Person',
      'name': post.author_name || 'Ignite Team',
      ...(post.author_role && { 'jobTitle': post.author_role }),
      ...(post.author_avatar && { 'image': post.author_avatar }),
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Ignite Education',
      'url': BASE_URL,
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png',
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${postSlug}`,
    },
    'url': `${BASE_URL}/blog/${postSlug}`,
    'inLanguage': 'en-GB',
  }
}

/**
 * Generate Breadcrumb schema.org structured data for blog posts
 */
export function generateBlogBreadcrumbStructuredData(postTitle: string, postSlug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Posts', 'item': `${BASE_URL}/blog` },
      { '@type': 'ListItem', 'position': 3, 'name': postTitle, 'item': `${BASE_URL}/blog/${postSlug}` },
    ],
  }
}

/**
 * Generate Breadcrumb schema.org structured data for static pages (e.g. Privacy, Terms)
 */
export function generateStaticPageBreadcrumb(pageName: string, pagePath: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': pageName, 'item': `${BASE_URL}${pagePath}` },
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
