import React, { useState } from 'react';
import { getOptimizedImageUrl, generateSrcSet } from '../utils/imageUtils';

/**
 * OptimizedImage - Responsive image component with Cloudflare Image Transformations
 * Provides srcset for responsive loading and automatic WebP/AVIF conversion
 * Falls back to original URL if CDN transformation fails
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
  const [useFallback, setUseFallback] = useState(false);

  // Generate optimized URLs via Cloudflare (or fallback to original)
  const srcSet = useFallback ? undefined : generateSrcSet(src, widths, { fit, quality });
  const defaultSrc = useFallback ? src : getOptimizedImageUrl(src, { width: widths[1], fit, quality });

  return (
    <img
      src={defaultSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchpriority={fetchPriority}
      decoding="async"
      className={className}
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        }
      }}
      {...props}
    />
  );
};

export default OptimizedImage;
