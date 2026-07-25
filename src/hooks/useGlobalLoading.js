import { useEffect, useId, useSyncExternalStore } from 'react';
import {
  subscribe,
  getPhase,
  getMessage,
  openLoadingClaim,
  closeLoadingClaim,
} from '../lib/loadingStore';

export const useLoadingPhase = () => useSyncExternalStore(subscribe, getPhase, getPhase);
export const useLoadingMessage = () => useSyncExternalStore(subscribe, getMessage, getMessage);

/**
 * Hold a claim on the global loading overlay while `isLoading` is true.
 *
 * Intentionally does NOT subscribe to the store, so callers that only push
 * loading state (ProtectedRoute, VideoChat, Certificate, LearningHub v1) never
 * re-render when the overlay fades.
 *
 * Must be useEffect rather than useLayoutEffect: React destroys the *layout*
 * effects of content hidden by a re-suspending boundary, but passive effects
 * survive — so a claim held while a lazy chunk loads isn't torn down.
 */
export default function useGlobalLoading(isLoading, { autoRefreshAfter, message = null } = {}) {
  const id = useId();

  useEffect(() => {
    if (isLoading) openLoadingClaim(id, { autoRefreshAfter, message });
    else closeLoadingClaim(id);
  }, [id, isLoading, autoRefreshAfter, message]);

  // Unmount-only release, so a component that dies mid-load can't strand the
  // overlay. The transient close during a StrictMode double-invoke only
  // *schedules* a cancellable hide, which the immediate re-open cancels.
  useEffect(() => () => closeLoadingClaim(id), [id]);
}
