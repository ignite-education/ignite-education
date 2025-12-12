import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component for dynamic meta tags
 * Optimized for both traditional search engines and GenAI (ChatGPT, Claude, etc.)
 */
const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  structuredData
}) => {
  const location = useLocation();
  const baseUrl = 'https://www.ignite.education';
  const fullUrl = url || `${baseUrl}${location.pathname}`;
  const ogImage = image || `${baseUrl}/og-image.png`;

  useEffect(() => {
    // Update title
    if (title) {
      document.title = title;
    }

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      if (!content) return;

      const attribute = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        document.head.appendChild(tag);
      }

      tag.setAttribute('content', content);
    };

    // Primary meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:url', fullUrl, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:image', ogImage, true);

    // Twitter Card tags
    updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);
    updateMetaTag('twitter:url', fullUrl);

    // Additional SEO tags
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('author', 'Ignite');

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Add structured data if provided (supports single object or array of objects)
    if (structuredData) {
      // Remove ALL existing JSON-LD scripts except those marked with data-seo="keep-static"
      // This prevents duplicate schemas (e.g., multiple FAQPage) from conflicting
      const existingScripts = document.querySelectorAll('script[type="application/ld+json"]:not([data-seo="keep-static"])');
      existingScripts.forEach(script => script.remove());

      // Handle array of structured data objects (multiple schemas per page)
      const dataArray = Array.isArray(structuredData) ? structuredData : [structuredData];

      dataArray.forEach((data, index) => {
        const script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo', 'structured');
        script.setAttribute('data-seo-index', String(index));
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      });
    }

    // Cleanup function
    return () => {
      // Don't remove tags on unmount - they should persist for navigation
    };
  }, [title, description, keywords, fullUrl, ogImage, type, structuredData]);

  return null;
};

export default SEO;

/**
 * Generate structured data for a blog post
 * @param {Object} post - Blog post object
 * @param {string} url - Full URL of the blog post
 * @returns {Object} Schema.org BlogPosting structured data
 */
export const generateBlogPostStructuredData = (post, url) => {
  const baseUrl = 'https://www.ignite.education';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    image: post.og_image || post.featured_image,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name || 'Ignite Team',
      ...(post.author_avatar && { image: post.author_avatar }),
      ...(post.author_role && { jobTitle: post.author_role }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ignite',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
    url: fullUrl,
    articleBody: post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 500) : undefined,
    wordCount: post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : undefined,
    inLanguage: 'en-US',
  };
};

