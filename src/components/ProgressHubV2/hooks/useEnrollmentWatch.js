import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

const ENROLLMENT_CACHE_KEY = 'enrollment_status_cache';

/**
 * Recovers the hub when the user enrols somewhere else.
 *
 * The selector navigates in the same tab, so the usual path needs no help — the
 * return trip to /progress is a fresh load that reads the new course anyway.
 * This covers the cases where /progress survives the enrolment: a cmd-clicked
 * card, or the hub simply left open in another tab. Without it those windows sit
 * on the selector until manually reloaded.
 *
 * Clearing ProtectedRoute's cache before reloading is not optional — it holds
 * `hasEnrolled: false` for 5 minutes, and a course route would keep bouncing to
 * /progress on the strength of it. (EnrollmentCTA clears the same key by hand
 * for exactly this reason.)
 *
 * @param enabled  Only mount the listeners while the user has no course.
 * @param userId
 */
export default function useEnrollmentWatch(enabled, userId) {
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId) return;

    const check = async () => {
      if (checkingRef.current || document.visibilityState !== 'visible') return;
      checkingRef.current = true;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('enrolled_course')
          .eq('id', userId)
          .maybeSingle();

        if (error || !data?.enrolled_course) return;

        try { sessionStorage.removeItem(ENROLLMENT_CACHE_KEY); } catch { /* storage unavailable */ }
        window.location.reload();
      } catch {
        // Transient failure — the next focus tries again.
      } finally {
        checkingRef.current = false;
      }
    };

    // Both events: `focus` alone misses a tab switch in some browsers, and
    // `visibilitychange` alone misses refocusing an already-visible window.
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [enabled, userId]);
}
