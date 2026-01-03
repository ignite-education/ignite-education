import React, { useState } from 'react';
import { getOptimizedImageUrl, generateSrcSet } from '../utils/imageUtils';

/**
 * OptimizedImage - Responsive image component with Supabase Image Transformations
 * Provides srcset for responsive loading and automatic resizing
 * Falls back to original URL if transformation fails
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
  resize = 'cover',
  quality = 80,
  ...props
}) => {
  const [useFallback, setUseFallback] = useState(false);

  // Generate optimized URLs via Supabase (or fallback to original)
  const srcSet = useFallback ? '' : generateSrcSet(src, widths, { resize, quality });
  const defaultSrc = useFallback ? src : getOptimizedImageUrl(src, { width: widths[1], resize, quality });

  return (
    <img
      src={defaultSrc}
      srcSet={srcSet || undefined}
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
