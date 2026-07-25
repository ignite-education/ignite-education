import { useEffect, useMemo, useRef, useState } from 'react';
import Lottie from 'lottie-react';
import { useAnimation } from '../contexts/AnimationContext';

const LOGO_FADE_MS = 600;

/**
 * The contents of <GlobalLoadingOverlay />. Mounted exactly once per document.
 *
 * Do NOT render this anywhere else, and never key or conditionally mount it —
 * the Lottie player would be recreated from frame 0, which is the flash/restart
 * this component was refactored to eliminate. To show the loader, hold a claim
 * with useGlobalLoading() instead.
 */
const LoadingScreen = ({ message = null, paused = false }) => {
  const { lottieData } = useAnimation();
  const lottieRef = useRef(null);
  const [logoVisible, setLogoVisible] = useState(false);

  // lottie-web mutates the animationData it is handed, and several other screens
  // render the *same* object from AnimationContext (e.g. the LearningHubV2
  // sidebar logo). Give this long-lived player its own copy — the JSON is ~3.5 KB.
  const animationData = useMemo(
    () => (lottieData && Object.keys(lottieData).length > 0 ? structuredClone(lottieData) : null),
    [lottieData]
  );

  // visibility: hidden does not stop lottie's rAF loop. play() resumes from the
  // current frame, so pausing can never cause a restart.
  useEffect(() => {
    const player = lottieRef.current;
    if (!player) return;
    if (paused) player.pause();
    else player.play();
  }, [paused, animationData]);

  // Fade the logo in whenever it (re)appears. This has to be an explicit 0 -> 1
  // flip rather than `opacity: dataReady ? 1 : 0`: a CSS transition only runs when
  // the value *changes*, and since this component is lazy-loaded (and the JSON is
  // preloaded) the data is normally ready before the first render — so it would
  // paint at opacity 1 with nothing to transition from. The double rAF guarantees
  // the browser commits opacity 0 for a frame first.
  useEffect(() => {
    if (!animationData || paused) {
      setLogoVisible(false);
      return;
    }
    let inner;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setLogoVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [animationData, paused]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div
        className="w-[140px] h-[140px] lg:w-[200px] lg:h-[200px]"
        style={{
          opacity: logoVisible ? 1 : 0,
          transition: `opacity ${LOGO_FADE_MS}ms ease-out`,
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden'
        }}
      >
        {animationData ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop
            autoplay
            style={{
              width: '100%',
              height: '100%',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      {message && (
        <p className="mt-6 text-gray-400 text-lg animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingScreen;
