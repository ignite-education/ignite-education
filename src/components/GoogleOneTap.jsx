import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Google Sign-In component for course pages
 * Shows "Continue with Google" and "Continue with LinkedIn" buttons using OAuth redirect flow
 * Also includes share buttons for the course
 *
 * For live courses: Stores courseSlug for enrollment in ProgressHub
 * For coming_soon courses: Stores courseSlug for waitlist signup in ProgressHub
 */
const GoogleOneTap = ({ courseSlug, courseStatus = 'live', courseTitle = '' }) => {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const isComingSoon = courseStatus === 'coming_soon';
  const shareUrl = `https://ignite.education/courses/${courseSlug}`;

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this course: ${courseTitle || 'Course'} on Ignite Education`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
  };

  const handleSubstackShare = () => {
    window.open(`https://substack.com/note?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div className="w-full">
      {error ? (
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="w-full">
          {/* Google Sign In Button */}
          <button
            onClick={() => handleSignIn('google')}
            disabled={loadingProvider}
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 mb-3"
          >
            {loadingProvider === 'google' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span className="text-base text-black font-medium">
              Continue with Google
            </span>
          </button>

          {/* LinkedIn Sign In Button */}
          <button
            onClick={() => handleSignIn('linkedin_oidc')}
            disabled={loadingProvider}
            className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 mb-4"
          >
            {loadingProvider === 'linkedin_oidc' ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            )}
            <span className="text-base text-black font-medium">
              Continue with LinkedIn
            </span>
          </button>

          {/* Dynamic Status Text */}
          <p className="text-center text-gray-600 text-sm mb-6">
            {isComingSoon ? 'Sign in to join the course waitlist' : 'Sign in to start the course'}
          </p>

          {/* Share Buttons Row */}
          <div className="flex items-center justify-center gap-2">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-50 border-green-200 text-green-600'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>

            {/* LinkedIn Share */}
            <button
              onClick={handleLinkedInShare}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0A66C2] hover:bg-[#004182] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#25D366] hover:bg-[#1DA851] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>

            {/* Substack Share */}
            <button
              onClick={handleSubstackShare}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#FF6719] hover:bg-[#E55A14] transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleOneTap;
