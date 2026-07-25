import { useRef } from 'react';
import useGlobalLoading, { useLoadingPhase } from './useGlobalLoading';

/**
 * Hub-level coordination with the app-wide <GlobalLoadingOverlay />.
 *
 * This hook no longer renders or animates anything: it holds a claim on the
 * overlay while `loading` is true, and tells the hub when it may paint. The
 * crossfade itself is driven by the overlay, whose Lottie player is mounted once
 * for the lifetime of the document.
 */
export default function useFadeTransition(loading, { autoRefreshAfter } = {}) {
  useGlobalLoading(loading, { autoRefreshAfter });
  const phase = useLoadingPhase();

  // Monotonic latches. Once the hub has been allowed to paint it must never be
  // un-painted: an unrelated claim re-showing the overlay would otherwise unmount
  // the entire page and discard its state — the exact bug this refactor fixes.
  // Mutating refs during render is safe here: idempotent and monotonic.
  const shownRef = useRef(false);
  const readyRef = useRef(false);
  if (!loading && phase !== 'visible') shownRef.current = true;
  if (!loading && phase === 'hidden') readyRef.current = true;

  return {
    showContent: shownRef.current, // overlay has started fading — paint underneath it
    isReady: readyRef.current,     // overlay fully gone
  };
}
