import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Google Sign-In component for course pages
 * Shows "Continue with Google" button using standard OAuth redirect flow
 *
 * For live courses: Stores courseSlug for enrollment in ProgressHub
 * For coming_soon courses: Stores courseSlug for waitlist signup in ProgressHub
 */
const GoogleOneTap = ({ courseSlug, courseStatus = 'live' }) => {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(null);

  const isComingSoon = courseStatus === 'coming_soon';

  const handleSignIn = async (provider) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      if (isComingSoon) {
        sessionStorage.setItem('pendingWaitlistCourse', courseSlug);
      } else {
        sessionStorage.setItem('pendingEnrollmentCourse', courseSlug);
      }
      await signInWithOAuth(provider);
    } catch (err) {
      console.error('[GoogleOneTap] OAuth error:', err);
      setError(err.message || 'Sign in failed. Please try again.');
      setLoadingProvider(null);
    }
  };

  return (
    <div
      className="w-full rounded-lg bg-gradient-to-b from-gray-50 to-white border border-gray-200 overflow-hidden"
      style={{ maxHeight: '500px' }}
    >
      {/* Header - different color/text for coming soon */}
      <div className={`px-4 py-3 ${isComingSoon ? 'bg-purple-600' : 'bg-[#EF0B72]'}`}>
        <h3 className="text-white font-semibold text-lg">
          {isComingSoon ? 'Join the Waitlist' : 'Start Learning Today'}
        </h3>
        <p className="text-white/90 text-sm">
          {isComingSoon
            ? "Be the first to know when this course launches"
            : 'Sign in to enroll in this course'}
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-[5px] flex flex-col items-center justify-center">
        {error ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => handleSignIn('google')}
              disabled={loadingProvider}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                isComingSoon
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-[#EF0B72] hover:bg-[#d10a66]'
              }`}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* Google Sign In Button */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={loadingProvider}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loadingProvider === 'google' ? (
                <div className={`w-5 h-5 border-2 border-gray-300 rounded-full animate-spin ${
                  isComingSoon ? 'border-t-purple-600' : 'border-t-[#EF0B72]'
                }`} />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span className="text-sm text-black font-medium">
                Continue with Google
              </span>
            </button>

            {/* LinkedIn Sign In Button */}
            <button
              onClick={() => handleSignIn('linkedin_oidc')}
              disabled={loadingProvider}
              className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loadingProvider === 'linkedin_oidc' ? (
                <div className={`w-5 h-5 border-2 border-gray-300 rounded-full animate-spin ${
                  isComingSoon ? 'border-t-purple-600' : 'border-t-[#EF0B72]'
                }`} />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              )}
              <span className="text-sm text-black font-medium">
                Continue with LinkedIn
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-4">
        <p className="text-xs text-gray-400 text-center">
          By signing in, you agree to Ignite's<br />
          <a href="https://ignite.education/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Terms of Service</a> and <a href="https://ignite.education/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default GoogleOneTap;
