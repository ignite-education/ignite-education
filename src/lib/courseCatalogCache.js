import { getCoursesByType } from './api';

// Cache TTL: 1 hour (appropriate since courses update weekly)
const CACHE_TTL = 60 * 60 * 1000;
const CACHE_KEY = 'courses_by_type';

export const getCachedCourses = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
};

export const setCachedCourses = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore cache errors (e.g., quota exceeded)
  }
};

/**
 * Prefetch courses in background (call from App.jsx after initial render)
 * Only fetches if cache is empty or stale
 */
export const prefetchCourses = async () => {
  const cached = getCachedCourses();
  if (!cached) {
    try {
      const data = await getCoursesByType();
      setCachedCourses(data);
    } catch (e) {
      // Silent fail - prefetch is opportunistic
    }
  }
};
