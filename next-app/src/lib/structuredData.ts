import type { Course, Coach, FAQ } from '@/types/course'
import type { BlogPost } from '@/types/blog'
import type { Certificate } from '@/types/certificate'
import type { JobDetail } from '@/data/jobsData'
import { SITE_URL, ORG_ID, DEFAULT_OG_IMAGE } from '@/lib/siteConfig'

const BASE_URL = SITE_URL

/**
 * The canonical homepage — deliberately NOT `SITE_URL`.
 *
 * The bare root 308s to /welcome, and every breadcrumb below used to nominate it
 * as position 1. That put a link to a redirecting URL on every indexable page,
 * contradicting /welcome's self-canonical and the sitemap; combined with the
 * root redirect being a *temporary* 307 until 2026-08-25, it let Google pick `/`
 * as the homepage canonical and drop /welcome out of Search Console entirely.
 * Breadcrumbs are a signal Google actively consumes — never point one at a redirect.
 */
const HOME_URL = `${SITE_URL}/welcome`

/**
 * Reference to the single Organization node declared once in
 * components/SiteJsonLd.tsx (rendered from the root layout).
 *
 * Every schema below points at this instead of redeclaring the organisation,
 * so search engines and LLMs resolve one entity rather than seven variants.
 */
const ORG_REF = { '@id': ORG_ID } as const

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
    'image': course.image_url || DEFAULT_OG_IMAGE,
    'provider': ORG_REF,
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
      'worksFor': ORG_REF,
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
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOME_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Courses', 'item': `${BASE_URL}/courses` },
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
        'provider': ORG_REF,
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
    'image': post.og_image || post.featured_image || DEFAULT_OG_IMAGE,
    'datePublished': post.published_at,
    'dateModified': post.updated_at,
    'author': {
      '@type': 'Person',
      'name': post.author_name || 'Ignite Team',
      ...(post.author_role && { 'jobTitle': post.author_role }),
      ...(post.author_avatar && { 'image': post.author_avatar }),
    },
    'publisher': ORG_REF,
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
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOME_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': `${BASE_URL}/blog` },
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
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOME_URL },
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

/**
 * Generate EducationalOccupationalCredential schema.org structured data
 */
export function generateCertificateStructuredData(certificate: Certificate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    'credentialCategory': 'Certificate of Completion',
    'name': `${certificate.course_name} Certificate`,
    'description': `Verified certificate of completion for the ${certificate.course_name} course from Ignite Education, awarded to ${certificate.user_name}.`,
    'recognizedBy': ORG_REF,
    'dateCreated': certificate.issued_date,
    'identifier': {
      '@type': 'PropertyValue',
      'propertyID': 'Certificate Number',
      'value': certificate.certificate_number,
    },
    'url': `${BASE_URL}/certificate/${certificate.id}`,
  }
}

/**
 * Generate Person schema.org structured data for public profile pages
 */
export function generatePersonStructuredData(profile: {
  display_name: string
  username: string
  avatar_url: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    'name': profile.display_name,
    'url': `${BASE_URL}/${profile.username}`,
    ...(profile.avatar_url ? { 'image': profile.avatar_url } : {}),
    'memberOf': ORG_REF,
  }
}

/**
 * Generate Breadcrumb schema.org structured data for public profile pages
 */
export function generateProfileBreadcrumbStructuredData(displayName: string, username: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOME_URL },
      { '@type': 'ListItem', 'position': 2, 'name': displayName, 'item': `${BASE_URL}/${username}` },
    ],
  }
}

/**
 * Generate Breadcrumb schema.org structured data for certificate pages
 */
export function generateCertificateBreadcrumbStructuredData(
  userName: string,
  certificateId: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOME_URL },
      { '@type': 'ListItem', 'position': 2, 'name': `${userName}'s Certificate`, 'item': `${BASE_URL}/certificate/${certificateId}` },
    ],
  }
}

// ─── Job postings ────────────────────────────────────────────────────────────

/**
 * Google's requirements for JobPosting, checked 2026-10-12 against
 * developers.google.com/search/docs/appearance/structured-data/job-posting:
 *
 *  - ONE posting per page, on a page dedicated to that job. Never on a list.
 *  - Required: title, description (HTML, not equal to the title), datePosted,
 *    hiringOrganization, and jobLocation — or for a fully remote role,
 *    jobLocationType TELECOMMUTE plus applicantLocationRequirements.
 *  - baseSalary only when the EMPLOYER states it. Our estimated figures
 *    (salary_is_estimate) must never be emitted.
 *  - validThrough in the past, a 404, or no markup once the job expires.
 *    The per-job page 404s via RLS + the freshness cut; validThrough is set
 *    to the same moment so the two never disagree.
 *  - directApply: false. Applying here means signing in first, which is more
 *    than Google's "a short, simple process".
 */

const PROFESSION_PAGE_HOME = `${BASE_URL}/jobs`

/** Minimum advert length for markup. Under this Google reads it as incomplete. */
export const MIN_JOBPOSTING_DESCRIPTION_CHARS = 200

const EMPLOYMENT_TYPE_RULES: [RegExp, string][] = [
  [/intern/i, 'INTERN'],
  [/contract|fixed.?term|freelance/i, 'CONTRACTOR'],
  [/\btemp/i, 'TEMPORARY'],
  [/part.?time/i, 'PART_TIME'],
  [/full.?time|permanent|regular/i, 'FULL_TIME'],
]

/**
 * schema.org employmentType from the two free-text columns every ATS fills
 * differently ("Full-time", "FULL_TIME", "Permanent", "Fixed Term Contract").
 * May yield more than one; omitted when nothing matches.
 */
export function employmentTypes(contractType: string | null, contractTime: string | null): string[] {
  const text = [contractType, contractTime].filter(Boolean).join(' ')
  const found: string[] = []
  for (const [re, value] of EMPLOYMENT_TYPE_RULES) {
    if (re.test(text) && !found.includes(value)) found.push(value)
  }
  return found
}

const COUNTRY_NAMES: Record<string, string> = { GB: 'United Kingdom' }

function salaryUnit(period: string | null): string | null {
  const units: Record<string, string> = {
    year: 'YEAR', month: 'MONTH', week: 'WEEK', day: 'DAY', hour: 'HOUR',
  }
  return period ? units[period] || null : null
}

/**
 * validThrough: whichever comes first of the stored expiry and the 45-day
 * freshness cut that jobsData applies at read time, so the markup expires at
 * exactly the moment the page starts returning 404.
 */
export function jobValidThrough(job: JobDetail, maxPostedAgeDays: number): string | null {
  const candidates: number[] = []
  if (job.expiresAt) candidates.push(new Date(job.expiresAt).getTime())
  if (job.postedAt) candidates.push(new Date(job.postedAt).getTime() + maxPostedAgeDays * 86_400_000)
  const valid = candidates.filter(t => Number.isFinite(t))
  return valid.length ? new Date(Math.min(...valid)).toISOString() : null
}

/**
 * Generate JobPosting schema.org structured data for a per-job page.
 *
 * `descriptionHtml` is built from the SAME DescriptionBlock[] the page renders
 * (lib/jobPostingHtml.ts), so the markup matches the visible advert.
 */
export function generateJobPostingStructuredData(
  job: JobDetail,
  pageUrl: string,
  descriptionHtml: string,
  { maxPostedAgeDays }: { maxPostedAgeDays: number }
) {
  const countryCode = (job.countryCode || 'GB').toUpperCase()
  const validThrough = jobValidThrough(job, maxPostedAgeDays)
  const types = employmentTypes(job.contractType, job.contractTime)
  const unit = salaryUnit(job.salaryPeriod)
  const locality = job.locationCity || job.location

  const salary =
    !job.salaryIsEstimate && unit && (job.salaryMin != null || job.salaryMax != null)
      ? {
          '@type': 'MonetaryAmount',
          'currency': job.salaryCurrency || 'GBP',
          'value': {
            '@type': 'QuantitativeValue',
            ...(job.salaryMin != null && job.salaryMax != null && job.salaryMin !== job.salaryMax
              ? { 'minValue': job.salaryMin, 'maxValue': job.salaryMax }
              : { 'value': job.salaryMin ?? job.salaryMax }),
            'unitText': unit,
          },
        }
      : null

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    'title': job.title,
    'description': descriptionHtml,
    'datePosted': job.postedAt || job.firstSeenAt,
    ...(validThrough ? { 'validThrough': validThrough } : {}),
    'hiringOrganization': {
      '@type': 'Organization',
      'name': job.company,
      ...(job.companyLogoUrl ? { 'logo': job.companyLogoUrl } : {}),
    },
    // Remote roles carry NO jobLocation. Google does not require one when
    // applicantLocationRequirements is present, and our city/region columns
    // for a multi-country remote advert are whatever parseLocation() made of
    // "United States / Netherlands / UK" — publishing that as a postal address
    // is the "false location data" Google's content policy names. On-site
    // roles get the city when we have one and the country alone when not.
    ...(job.isRemote
      ? {
          'jobLocationType': 'TELECOMMUTE',
          'applicantLocationRequirements': {
            '@type': 'Country',
            'name': COUNTRY_NAMES[countryCode] || countryCode,
          },
        }
      : {
          'jobLocation': {
            '@type': 'Place',
            'address': {
              '@type': 'PostalAddress',
              ...(locality ? { 'addressLocality': locality } : {}),
              ...(locality && job.locationRegion ? { 'addressRegion': job.locationRegion } : {}),
              'addressCountry': countryCode,
            },
          },
        }),
    ...(types.length ? { 'employmentType': types.length === 1 ? types[0] : types } : {}),
    ...(salary ? { 'baseSalary': salary } : {}),
    // Our id, never source_job_id — the jsonld adapter stores the employer's
    // advert URL in that column, which the apply gate withholds.
    'identifier': { '@type': 'PropertyValue', 'name': job.company, 'value': job.id },
    'directApply': false,
    'url': pageUrl,
  }
}

/**
 * Generate Breadcrumb schema.org structured data for a per-job page.
 */
export function generateJobBreadcrumbStructuredData(
  professionName: string,
  professionSlug: string,
  job: { title: string; path: string }
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': HOME_URL },
      { '@type': 'ListItem', 'position': 2, 'name': 'Job Board', 'item': PROFESSION_PAGE_HOME },
      { '@type': 'ListItem', 'position': 3, 'name': `${professionName} Jobs`, 'item': `${PROFESSION_PAGE_HOME}/${professionSlug}` },
      { '@type': 'ListItem', 'position': 4, 'name': job.title, 'item': `${BASE_URL}${job.path}` },
    ],
  }
}
