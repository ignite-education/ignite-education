/**
 * Centralized SEO Metadata Configuration
 *
 * This file contains SEO metadata for all static routes.
 * Dynamic routes (courses, blog posts) generate their metadata from API data.
 *
 * Used by:
 * - Pre-render script (scripts/prerender.js)
 * - SEO component (src/components/SEO.jsx)
 */

export const BASE_URL = 'https://ignite.education';
export const SITE_NAME = 'Ignite Education';
export const DEFAULT_OG_IMAGE = 'https://ignite.education/og-image.png';

// Static route metadata
export const staticRoutes = {
  '/': {
    title: 'Ignite Education | Free Online Courses in Tech & Professional Skills',
    description: 'Learn Product Management, Data Analysis, UX Design, Cyber Security and more with free, expert-led courses. AI-powered learning with real-world projects and completion certificates.',
    keywords: 'free online courses, product management, data analysis, UX design, cyber security, digital marketing, career change, tech skills, online learning UK',
    ogType: 'website',
  },
  '/welcome': {
    title: 'Welcome to Ignite | Start Your Free Learning Journey',
    description: 'Discover free online courses in Product Management, Data Analysis, UX Design, and more. Expert-led lessons with AI-powered feedback. No experience required.',
    keywords: 'free courses, online learning, career change, beginner courses, tech education, professional development',
    ogType: 'website',
  },
  '/privacy': {
    title: 'Privacy Policy | Ignite Education',
    description: 'Learn how Ignite Education protects your privacy and handles your data in compliance with GDPR and UK data protection laws.',
    keywords: 'privacy policy, data protection, GDPR, UK data privacy, Ignite Education',
    ogType: 'article',
  },
  '/terms': {
    title: 'Terms of Service | Ignite Education',
    description: 'Terms and conditions for using Ignite Education online learning platform. Read our user agreement and service terms.',
    keywords: 'terms of service, terms and conditions, user agreement, Ignite Education',
    ogType: 'article',
  },
};

// Course metadata generator
export const generateCourseMetadata = (course) => {
  const courseName = course.name || course.title;
  const slug = courseName.toLowerCase().replace(/\s+/g, '-');

  return {
    title: `Free ${courseName} Course | Ignite Education`,
    description: course.description?.slice(0, 155) ||
      `Learn ${courseName} skills with our free, expert-led online course. Includes AI-powered lessons, real-world projects, and a completion certificate.`,
    keywords: generateCourseKeywords(courseName),
    ogType: 'website',
    ogImage: course.og_image || DEFAULT_OG_IMAGE,
    canonicalUrl: `${BASE_URL}/courses/${slug}`,
    structuredData: generateCourseSchema(course),
  };
};

// Blog post metadata generator
export const generateBlogMetadata = (post) => {
  return {
    title: `${post.title} | Ignite Blog`,
    description: post.meta_description || post.excerpt?.slice(0, 155),
    keywords: post.tags?.join(', ') || 'education, learning, career development',
    ogType: 'article',
    ogImage: post.og_image || DEFAULT_OG_IMAGE,
    canonicalUrl: `${BASE_URL}/blog/${post.slug}`,
    structuredData: generateBlogSchema(post),
  };
};

// Course keywords generator
function generateCourseKeywords(courseName) {
  const baseKeywords = [
    `${courseName} course`,
    `free ${courseName} course`,
    `${courseName} training`,
    `learn ${courseName}`,
    `${courseName} certification`,
    `${courseName} for beginners`,
    `online ${courseName} course`,
    `${courseName} course UK`,
    `${courseName} career change`,
  ];
  return baseKeywords.join(', ');
}

// Course structured data schema
export function generateCourseSchema(course) {
  const courseName = course.name || course.title;
  const slug = courseName.toLowerCase().replace(/\s+/g, '-');

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: courseName,
    description: course.description || `Learn ${courseName} with Ignite Education's free online course.`,
    provider: {
      '@type': 'Organization',
      name: 'Ignite Education',
      sameAs: 'https://ignite.education',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
      category: 'Free',
    },
    courseMode: 'Online',
    educationalLevel: 'Beginner',
    isAccessibleForFree: true,
    inLanguage: 'en-GB',
    url: `${BASE_URL}/courses/${slug}`,
  };
}

// Blog post structured data schema
function generateBlogSchema(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: 'Ignite Education',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ignite Education',
      logo: {
        '@type': 'ImageObject',
        url: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/blog/${post.slug}`,
    },
  };
}

// FAQ schema for course pages
export const courseFAQs = [
  {
    question: 'Is this course really free?',
    answer: 'Yes, this course is completely free. We believe quality education should be accessible to everyone.',
  },
  {
    question: 'Do I get a certificate?',
    answer: 'Yes, you receive a digital certificate upon completing the course that you can share on LinkedIn.',
  },
  {
    question: 'How long does the course take?',
    answer: 'The course is self-paced. Most learners complete it in 2-4 weeks with a few hours of study per week.',
  },
  {
    question: 'Do I need prior experience?',
    answer: 'No prior experience is required. Our courses are designed for beginners and career changers.',
  },
  {
    question: 'Can I access the course on mobile?',
    answer: 'Yes, the platform is fully responsive and works on all devices.',
  },
  {
    question: 'How does the AI tutor work?',
    answer: 'Our AI tutor provides personalized feedback on your projects and answers questions in real-time, helping you learn more effectively.',
  },
];

// Generate FAQ schema
export function generateFAQSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: courseFAQs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Speakable schema for voice search
export function generateSpeakableSchema(route, metadata) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: metadata.title,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.course-summary', '.course-description', '.key-learnings', 'h1', '.hero-text'],
    },
    url: `${BASE_URL}${route}`,
  };
}
