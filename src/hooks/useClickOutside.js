import { useEffect } from 'react';

/**
 * Calls `onDismiss` when a pointer-down lands outside `ref`, or on Escape.
 *
 * Uses mousedown rather than click so the popover closes on press, before any
 * click handler underneath runs. Listeners are only attached while `enabled`,
 * so a closed popover costs nothing.
 *
 * `onDismiss` receives 'pointer' or 'escape'. Callers need this to decide
 * whether to restore focus to the trigger: doing so after a pointer dismissal
 * can light up :focus-visible, which is a keyboard affordance appearing for a
 * mouse user.
 *
 * Memoise `onDismiss` with useCallback in the caller, otherwise the effect
 * re-subscribes on every render.
 *
 * @param {React.RefObject} ref - element that should NOT trigger dismissal
 * @param {(reason: 'pointer' | 'escape') => void} onDismiss
 * @param {boolean} [enabled]
 */
export default function useClickOutside(ref, onDismiss, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onDismiss('pointer');
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onDismiss('escape');
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, onDismiss, enabled]);
}
