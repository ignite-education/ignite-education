import { useState, useEffect } from 'react';

/**
 * Tracks whether the viewport is below a breakpoint.
 * Default 1024px aligns with Tailwind's `lg:` so JS-driven inline styles
 * and Tailwind responsive classes switch at the same width.
 */
export default function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}
