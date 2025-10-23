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
  const baseUrl = 'https://yourdomain.com';
  const fullUrl = url || `${baseUrl}${location.pathname}`;
  const ogImage = image || `${baseUrl}/og-image.jpg`;

  useEffect(() => {
    // Update title
    if (title) {
      document.title = `${title} | Ignite Learning`;
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
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);
    updateMetaTag('twitter:url', fullUrl);

    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Add structured data if provided
    if (structuredData) {
      let script = document.querySelector('script[data-seo="structured"]');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('data-seo', 'structured');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function
    return () => {
      // Don't remove tags on unmount - they should persist for navigation
    };
  }, [title, description, keywords, fullUrl, ogImage, type, structuredData]);

  return null;
};

export default SEO;
