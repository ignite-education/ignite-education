/**
 * SEO Utility Functions
 * Helpers for generating and injecting structured data
 */

/**
 * Inject course-specific structured data into the page
 * Use this when displaying individual course pages
 */
export const injectCourseSchema = (courseData) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": courseData.title,
    "description": courseData.description,
    "provider": {
      "@type": "EducationalOrganization",
      "name": "Ignite Education",
      "url": "https://ignite.education"
    },
    "educationalLevel": courseData.level || "Beginner to Advanced",
    "courseMode": "online",
    "availableLanguage": "en",
    "teaches": courseData.topics || [],
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": courseData.duration || "Self-paced",
      "instructor": courseData.instructor ? {
        "@type": "Person",
        "name": courseData.instructor.name,
        "description": courseData.instructor.bio
      } : undefined
    },
    "offers": courseData.price ? {
      "@type": "Offer",
      "price": courseData.price,
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock",
      "url": `https://ignite.education${courseData.path || ''}`
    } : undefined,
    "aggregateRating": courseData.rating ? {
      "@type": "AggregateRating",
      "ratingValue": courseData.rating.value,
      "reviewCount": courseData.rating.count
    } : undefined
  };

  // Remove undefined values
  Object.keys(schema).forEach(key => schema[key] === undefined && delete schema[key]);
  if (schema.hasCourseInstance.instructor === undefined) {
    delete schema.hasCourseInstance.instructor;
  }

  // Check if script already exists
  let scriptTag = document.querySelector('script[data-schema="course"]');

  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.setAttribute('type', 'application/ld+json');
    scriptTag.setAttribute('data-schema', 'course');
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(schema);
};

/**
 * Inject breadcrumb structured data
 */
export const injectBreadcrumbSchema = (items) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://ignite.education${item.path}`
    }))
  };

  let scriptTag = document.querySelector('script[data-schema="breadcrumb"]');

  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.setAttribute('type', 'application/ld+json');
    scriptTag.setAttribute('data-schema', 'breadcrumb');
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(schema);
};

/**
 * Inject article/blog post structured data
 */
export const injectArticleSchema = (articleData) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": articleData.title,
    "description": articleData.description,
    "image": articleData.image || "https://ignite.education/og-image.png",
    "datePublished": articleData.publishedDate,
    "dateModified": articleData.modifiedDate || articleData.publishedDate,
    "author": {
      "@type": "Organization",
      "name": "Ignite Education"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ignite Education",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://ignite.education${articleData.path}`
    }
  };

  let scriptTag = document.querySelector('script[data-schema="article"]');

  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.setAttribute('type', 'application/ld+json');
    scriptTag.setAttribute('data-schema', 'article');
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(schema);
};

/**
 * Remove schema by type
 */
export const removeSchema = (type) => {
  const scriptTag = document.querySelector(`script[data-schema="${type}"]`);
  if (scriptTag) {
    scriptTag.remove();
  }
};

/**
 * Generate page-specific keywords based on content
 */
export const generateKeywords = (baseKeywords, ...additionalKeywords) => {
  const allKeywords = [
    ...baseKeywords,
    ...additionalKeywords.flat(),
    'Ignite Education',
    'online learning',
    'AI-powered education'
  ];
  return [...new Set(allKeywords)].join(', ');
};

/**
 * Track page view in Google Analytics (if configured)
 */
export const trackPageView = (pagePath, pageTitle) => {
  if (typeof window.gtag === 'function') {
    window.gtag('config', 'G-FH4CYRKWME', {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
};

/**
 * Track custom event in Google Analytics (if configured)
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
};
