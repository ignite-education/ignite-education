import { lazy, Suspense } from 'react';
import { useLoadingPhase, useLoadingMessage } from '../hooks/useGlobalLoading';
import { FADE_MS } from '../lib/loadingStore';

// Lazy so lottie-react stays out of the entry chunk. The white backdrop below is
// painted by this (entry-chunk) component, so there is nothing to wait for.
const LoadingScreen = lazy(() => import('./LoadingScreen'));

/**
 * Mounted once, for the lifetime of the document, outside <Suspense> and
 * <Routes> — so the Lottie player inside is created exactly once and can never
 * be remounted (which would restart it from frame 0).
 */
const GlobalLoadingOverlay = () => {
  const phase = useLoadingPhase();
  const message = useLoadingMessage();
  const isOpaque = phase === 'visible';
  const isHidden = phase === 'hidden';

  return (
    <div
      data-global-loading={phase}
      aria-hidden={isHidden ? 'true' : undefined}
      aria-busy={!isHidden}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000, // above the app's highest modal (9999)
        backgroundColor: '#FFFFFF',
        opacity: isOpaque ? 1 : 0,
        visibility: isHidden ? 'hidden' : 'visible',
        // Released as soon as the fade starts, so reduced-motion users (whose
        // fade is forced to 0.01ms by index.css) are never click-blocked.
        pointerEvents: isOpaque ? 'auto' : 'none',
        // No transition while opaque => showing is a hard cut, matching the old
        // `fixed inset-0 bg-white` backdrop. The fade only runs on the way out;
        // fading *in* would expose the page background during route changes.
        transition: isOpaque ? 'none' : `opacity ${FADE_MS}ms ease`,
      }}
    >
      <Suspense fallback={null}>
        <LoadingScreen message={message} paused={isHidden} />
      </Suspense>
    </div>
  );
};

export default GlobalLoadingOverlay;
