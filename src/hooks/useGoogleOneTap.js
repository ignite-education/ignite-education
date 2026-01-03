import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Generate a cryptographically secure nonce for Google One-Tap
 * Returns both raw nonce (for Supabase) and hashed nonce (for Google)
 */
export const generateNonce = async () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const rawNonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

  // Hash for Google (SHA-256)
  const encoder = new TextEncoder();
  const data = encoder.encode(rawNonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { rawNonce, hashedNonce };
};

/**
 * Custom hook for Google One-Tap sign-in
 * Handles GIS script loading, initialization, and prompt management
 */
const useGoogleOneTap = ({
  onSuccess,
  onError,
  enabled = true,
  autoPrompt = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPromptShown, setIsPromptShown] = useState(false);
  const [error, setError] = useState(null);
  const nonceRef = useRef({ raw: null, hashed: null });
  const initializedRef = useRef(false);

  // Check if GIS script is loaded
  useEffect(() => {
    if (!enabled) return;

    const checkGIS = () => {
      if (window.google?.accounts?.id) {
        setIsLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkGIS()) return;

    // Poll for GIS availability (script loads async)
    const interval = setInterval(() => {
      if (checkGIS()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.google?.accounts?.id) {
        setError(new Error('Google Identity Services failed to load'));
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [enabled]);

  // Initialize One-Tap when GIS is loaded
  const initialize = useCallback(async () => {
    if (!isLoaded || !enabled || initializedRef.current) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id.apps.googleusercontent.com') {
      setError(new Error('Google Client ID not configured'));
      return;
    }

    try {
      // Generate nonce for this session
      const { rawNonce, hashedNonce } = await generateNonce();
      nonceRef.current = { raw: rawNonce, hashed: hashedNonce };

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onSuccess?.(response.credential, nonceRef.current.raw);
          } else {
            const err = new Error('No credential received from Google');
            setError(err);
            onError?.(err);
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true, // Chrome FedCM compatibility
        cancel_on_tap_outside: false,
        context: 'signup',
        itp_support: true, // Safari ITP compatibility
      });

      initializedRef.current = true;

      // Show prompt if autoPrompt is enabled
      if (autoPrompt) {
        showPrompt();
      }
    } catch (err) {
      setError(err);
      onError?.(err);
    }
  }, [isLoaded, enabled, onSuccess, onError, autoPrompt]);

  // Initialize when GIS loads
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show the One-Tap prompt
  const showPrompt = useCallback(() => {
    if (!isLoaded || !initializedRef.current) return;

    try {
      window.google.accounts.id.prompt((notification) => {
        setIsPromptShown(true);

        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.log('[GoogleOneTap] Prompt not displayed:', reason);

          // Handle specific reasons
          if (reason === 'opt_out_or_no_session') {
            // User previously dismissed or no Google session
          } else if (reason === 'suppressed_by_user') {
            // User dismissed too many times
          }
        }

        if (notification.isSkippedMoment()) {
          console.log('[GoogleOneTap] Prompt skipped:', notification.getSkippedReason());
        }

        if (notification.isDismissedMoment()) {
          console.log('[GoogleOneTap] Prompt dismissed:', notification.getDismissedReason());
          setIsPromptShown(false);
        }
      });
    } catch (err) {
      console.error('[GoogleOneTap] Error showing prompt:', err);
      setError(err);
    }
  }, [isLoaded]);

  // Cancel the prompt
  const cancelPrompt = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
      setIsPromptShown(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPrompt();
    };
  }, [cancelPrompt]);

  // Re-generate nonce (for retry scenarios)
  const regenerateNonce = useCallback(async () => {
    const { rawNonce, hashedNonce } = await generateNonce();
    nonceRef.current = { raw: rawNonce, hashed: hashedNonce };
    return { rawNonce, hashedNonce };
  }, []);

  return {
    isLoaded,
    isPromptShown,
    error,
    showPrompt,
    cancelPrompt,
    regenerateNonce,
    nonce: nonceRef.current,
  };
};

export default useGoogleOneTap;
