/**
 * Generate Schema.org Course structured data
 * This helps search engines and GenAI understand your course content
 */
export const generateCourseStructuredData = (course) => {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.name || "Product Management Course",
    "description": course.description || "Comprehensive product management training with interactive lessons and AI support",
    "provider": {
      "@type": "EducationalOrganization",
      "name": "Ignite Learning",
      "url": "https://yourdomain.com"
    },
    "educationalLevel": "Beginner to Advanced",
    "teaches": [
      "Product Management",
      "Product Strategy",
      "Roadmapping",
      "Stakeholder Management",
      "Data-Driven Decision Making"
    ],
    "offers": {
      "@type": "Offer",
      "category": "Professional Development",
      "availability": "https://schema.org/InStock"
    },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": "PT10H" // Example: 10 hours
    }
  };
};

/**
 * Generate Schema.org LearningResource structured data for individual lessons
 */
export const generateLessonStructuredData = (lesson, moduleNumber, lessonNumber) => {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "name": lesson.name || `Module ${moduleNumber}, Lesson ${lessonNumber}`,
    "description": lesson.description || "Interactive lesson with knowledge checks and AI tutor support",
    "learningResourceType": "Lesson",
    "educationalLevel": "Professional",
    "audience": {
      "@type": "EducationalAudience",
      "educationalRole": "student"
    },
    "inLanguage": "en",
    "isPartOf": {
      "@type": "Course",
      "name": "Product Management Course",
      "provider": {
        "@type": "Organization",
        "name": "Ignite Learning"
      }
    },
    "interactivityType": "mixed",
    "teaches": lesson.bulletPoints || []
  };
};

/**
 * Generate BreadcrumbList structured data for navigation
 */
export const generateBreadcrumbStructuredData = (items) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://yourdomain.com${item.path}`
    }))
  };
};

/**
 * Generate FAQ structured data (useful for GenAI)
 */
export const generateFAQStructuredData = (faqs) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};
