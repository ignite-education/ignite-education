/**
 * Image optimization utilities using Supabase Image Transformations
 * Provides responsive images with automatic resizing
 * https://supabase.com/docs/guides/storage/serving/image-transformations
 */

/**
 * Generate an optimized image URL via Supabase Image Transformations
 *
 * @param {string} originalUrl - Original Supabase storage URL
 * @param {Object} options - Transformation options
 * @param {number} options.width - Target width
 * @param {number} [options.height] - Target height (optional)
 * @param {string} [options.resize='cover'] - Resize mode: 'cover', 'contain', 'fill'
 * @param {number} [options.quality=80] - Quality 1-100
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(originalUrl, { width, height, resize = 'cover', quality = 80 } = {}) {
  if (!originalUrl) return originalUrl;

  // Only transform Supabase storage URLs
  if (!originalUrl.includes('supabase.co/storage/v1/object/public/')) {
    return originalUrl;
  }

  // Convert public URL to render URL with transformations
  // From: .../storage/v1/object/public/bucket/path
  // To:   .../storage/v1/render/image/public/bucket/path?width=X&resize=Y
  const transformedUrl = originalUrl.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (width) params.set('width', width.toString());
  if (height) params.set('height', height.toString());
  params.set('resize', resize);
  params.set('quality', quality.toString());

  return `${transformedUrl}?${params.toString()}`;
}

/**
 * Generate srcSet string for responsive images
 *
 * @param {string} url - Original image URL
 * @param {number[]} [widths=[320, 640, 960, 1280]] - Array of widths for srcset
 * @param {Object} [options={}] - Additional options (resize, quality)
 * @returns {string} srcSet string (empty if URL is not transformable)
 */
export function generateSrcSet(url, widths = [320, 640, 960, 1280], options = {}) {
  if (!url) return '';

  // Only generate srcSet for Supabase URLs that can be transformed
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return '';
  }

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
