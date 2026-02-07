import { useState, useEffect, useRef } from 'react';

/**
 * LazySection - Delays rendering of children until the section is near the viewport.
 * Uses IntersectionObserver for efficient viewport detection.
 *
 * @param {React.ReactNode} children - Content to render when visible
 * @param {React.ReactNode} fallback - Placeholder to show before content loads
 * @param {string} rootMargin - How far from viewport to trigger loading (default: '100px')
 * @param {number} threshold - Visibility threshold to trigger (default: 0)
 */
const LazySection = ({ children, fallback = null, rootMargin = '100px', threshold = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
};

export default LazySection;
