import { useState, useEffect, useRef } from 'react';

/**
 * Manages a crossfade transition from a loading screen to content.
 * During the crossfade, both are mounted — the loader overlays the content and fades out.
 */
export default function useFadeTransition(loading, { fadeDuration = 500, minLoadingMs = 750 } = {}) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'crossfading' | 'ready'
  const timerRef = useRef(null);
  const loadStartRef = useRef(Date.now());

  useEffect(() => {
    if (loading) {
      setPhase('loading');
      loadStartRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
    } else if (phase === 'loading') {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadingMs - elapsed);

      timerRef.current = setTimeout(() => {
        setPhase('crossfading');
        timerRef.current = setTimeout(() => {
          setPhase('ready');
        }, fadeDuration);
      }, remaining);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading]);

  return {
    showLoading: phase !== 'ready',
    showContent: phase !== 'loading',
    loadingClassName: phase === 'crossfading' ? 'animate-crossfadeOut' : '',
    contentClassName: '',
  };
}
