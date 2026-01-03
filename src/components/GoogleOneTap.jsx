import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { updateUserCourse } from '../lib/api';
import { addContactToAudience, RESEND_AUDIENCES } from '../lib/email';
import useGoogleOneTap from '../hooks/useGoogleOneTap';

/**
 * Google One-Tap Sign-In component for course pages
 * Displays in the sticky right column on desktop, replacing the curriculum image
 * After successful auth, auto-enrolls user in the course and redirects to /progress
 */
const GoogleOneTap = ({ courseSlug, onSuccess, onError }) => {
  const navigate = useNavigate();
  const { signInWithIdToken, signInWithOAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const buttonContainerRef = useRef(null);

  // Handle successful Google credential response
  const handleCredentialSuccess = useCallback(async (credential, rawNonce) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // 1. Exchange Google ID token with Supabase
      const { user } = await signInWithIdToken(credential, rawNonce);

      if (!user) {
        throw new Error('No user returned from authentication');
      }

      // 2. Check if user exists in public.users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, onboarding_completed')
        .eq('id', user.id)
        .single();

      // 3. Create user record if it doesn't exist
      if (fetchError?.code === 'PGRST116' || !existingUser) {
        const firstName = user.user_metadata?.given_name ||
                         user.user_metadata?.full_name?.split(' ')[0] || '';
        const lastName = user.user_metadata?.family_name ||
                        user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';

        await supabase.from('users').insert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          onboarding_completed: true, // Skip onboarding since enrolling via course page
          role: 'student'
        });

        // Add to Resend General audience (will be moved to course audience by updateUserCourse)
        if (RESEND_AUDIENCES.GENERAL) {
          try {
            await addContactToAudience(
              { email: user.email, firstName, lastName },
              RESEND_AUDIENCES.GENERAL
            );
          } catch (audienceErr) {
            console.error('Failed to add to audience:', audienceErr);
          }
        }
      }

      // 4. Enroll in the course
      const firstName = user.user_metadata?.given_name ||
                       user.user_metadata?.full_name?.split(' ')[0] || '';
      const lastName = user.user_metadata?.family_name ||
                      user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';

      await updateUserCourse(user.id, courseSlug, {
        email: user.email,
        firstName,
        lastName
      });

      // 5. Mark onboarding as complete (in case it wasn't set)
      await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      // 6. Success callback and redirect
      onSuccess?.();

      // Use window.location for full page reload to ensure auth state is picked up
      window.location.href = '/progress';

    } catch (err) {
      console.error('[GoogleOneTap] Authentication error:', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [signInWithIdToken, courseSlug, onSuccess, onError]);

  // Handle One-Tap errors
  const handleOneTapError = useCallback((err) => {
    console.error('[GoogleOneTap] One-Tap error:', err);
    setAuthError(err.message);
    onError?.(err);
  }, [onError]);

  // Use the One-Tap hook
  const { isLoaded, error: hookError, renderButton } = useGoogleOneTap({
    onSuccess: handleCredentialSuccess,
    onError: handleOneTapError,
    enabled: true,
    autoPrompt: false, // Disable floating overlay, we render button in container
  });

  // Render Google button inside container when loaded
  useEffect(() => {
    if (isLoaded && buttonContainerRef.current && !isLoading) {
      renderButton(buttonContainerRef.current, {
        width: 260,
        theme: 'outline',
      });
    }
  }, [isLoaded, renderButton, isLoading]);

  // Fallback to standard OAuth
  const handleOAuthFallback = async () => {
    try {
      // Store course slug for post-auth enrollment
      sessionStorage.setItem('pendingEnrollmentCourse', courseSlug);
      await signInWithOAuth('google');
    } catch (err) {
      console.error('[GoogleOneTap] OAuth fallback error:', err);
      setAuthError(err.message);
    }
  };

  // Combined error state
  const displayError = authError || hookError?.message;

  return (
    <div
      className="w-full rounded-lg bg-gradient-to-b from-gray-50 to-white border border-gray-200 overflow-hidden"
      style={{ maxHeight: '500px' }}
    >
      {/* Header */}
      <div className="bg-[#EF0B72] px-4 py-3">
        <h3 className="text-white font-semibold text-lg">Start Learning Today</h3>
        <p className="text-white/90 text-sm">Sign in to enroll in this course</p>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        {isLoading ? (
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-[#EF0B72] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Signing you in...</p>
          </div>
        ) : displayError ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-700 mb-4">{displayError}</p>
            <button
              onClick={handleOAuthFallback}
              className="px-4 py-2 bg-[#EF0B72] text-white rounded-lg hover:bg-[#d10a66] transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !isLoaded ? (
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-gray-300 border-t-[#EF0B72] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading sign-in...</p>
          </div>
        ) : (
          <div className="text-center">
            {/* Google Sign-In button renders here */}
            <p className="text-gray-700 mb-4">Enroll for free with Google</p>
            <div ref={buttonContainerRef} className="flex justify-center mb-4" />

            {/* Fallback button if Google button doesn't render */}
            <button
              onClick={handleOAuthFallback}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-gray-700 font-medium">Continue with Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-4">
        <p className="text-xs text-gray-400 text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default GoogleOneTap;
