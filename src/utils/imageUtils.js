/**
 * Image optimization utilities for Cloudflare Image Transformations
 * Uses Cloudflare's cdn-cgi/image endpoint for on-the-fly optimization
 * Automatically converts to WebP/AVIF based on browser support
 */

const CF_TRANSFORM_BASE = 'https://ignite.education/cdn-cgi/image';

/**
 * Generate an optimized image URL via Cloudflare Image Transformations
 *
 * @param {string} originalUrl - Original image URL (e.g., Supabase storage)
 * @param {Object} options - Transformation options
 * @param {number} options.width - Target width
 * @param {number} [options.height] - Target height (optional)
 * @param {string} [options.fit='cover'] - Fit mode: 'cover', 'contain', 'scale-down', 'crop', 'pad'
 * @param {number} [options.quality=85] - Quality 1-100
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(originalUrl, { width, height, fit = 'cover', quality = 85 } = {}) {
  if (!originalUrl) return originalUrl;

  // Build transformation parameters
  const params = [`width=${width}`, `fit=${fit}`, `format=auto`, `quality=${quality}`];
  if (height) params.push(`height=${height}`);

  return `${CF_TRANSFORM_BASE}/${params.join(',')}/${originalUrl}`;
}

/**
 * Generate srcSet string for responsive images
 *
 * @param {string} url - Original image URL
 * @param {number[]} [widths=[320, 640, 960, 1280]] - Array of widths for srcset
 * @param {Object} [options={}] - Additional options passed to getOptimizedImageUrl
 * @returns {string} srcSet string
 */
export function generateSrcSet(url, widths = [320, 640, 960, 1280], options = {}) {
  if (!url) return '';

  return widths
    .map(w => `${getOptimizedImageUrl(url, { ...options, width: w })} ${w}w`)
    .join(', ');
}

/**
 * Generate sizes attribute for common responsive patterns
 *
 * @param {Object} breakpoints - Object mapping media queries to sizes
 * @returns {string} sizes attribute value
 */
export function getSizes(breakpoints = {}) {
  const defaultBreakpoints = {
    '(max-width: 640px)': '100vw',
    '(max-width: 1024px)': '50vw',
    default: '33vw'
  };

  const bp = { ...defaultBreakpoints, ...breakpoints };

  return Object.entries(bp)
    .filter(([key]) => key !== 'default')
    .map(([key, value]) => `${key} ${value}`)
    .concat([bp.default])
    .join(', ');
}
