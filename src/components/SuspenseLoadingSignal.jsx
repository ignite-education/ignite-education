import useGlobalLoading from '../hooks/useGlobalLoading';

/**
 * The app-level <Suspense> fallback. Renders nothing — it just holds a claim on
 * the global loading overlay while a lazy route chunk is in flight, so the
 * overlay (and its Lottie player) is never remounted at the boundary.
 *
 * Must stay a static import and must not pull in lottie-react.
 */
const SuspenseLoadingSignal = () => {
  useGlobalLoading(true);
  return null;
};

export default SuspenseLoadingSignal;
