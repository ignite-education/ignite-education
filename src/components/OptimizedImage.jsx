import React from 'react';
import { getOptimizedImageUrl, generateSrcSet } from '../utils/imageUtils';

/**
 * OptimizedImage - Responsive image component with Cloudflare Image Transformations
 * Provides srcset for responsive loading and automatic WebP/AVIF conversion
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  fetchPriority,
  sizes = '100vw',
  widths = [320, 640, 960, 1280],
  fit = 'cover',
  quality = 85,
  ...props
}) => {
  // Generate optimized URLs via Cloudflare
  const srcSet = generateSrcSet(src, widths, { fit, quality });
  const defaultSrc = getOptimizedImageUrl(src, { width: widths[1], fit, quality });

  return (
    <img
      src={defaultSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchpriority={fetchPriority}
      decoding="async"
      className={className}
      {...props}
    />
  );
};

export default OptimizedImage;
