import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveCourseForLater, removeSavedCourse, isCourseInWishlist } from '../lib/api';

/**
 * Google Sign-In component for course pages
 * Shows "Continue with Google" and "Continue with LinkedIn" buttons using OAuth redirect flow
 * For authenticated users, shows "Add to [FirstName]'s Account" button to save course to wishlist
 * Also includes share buttons for the course
 *
 * For live courses: Stores courseSlug for enrollment in ProgressHub
 * For coming_soon courses: Stores courseSlug for waitlist signup in ProgressHub
 */
const GoogleOneTap = ({ courseSlug, courseStatus = 'live', courseTitle = '', user = null, firstName = null }) => {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

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

  // Check if course is saved on mount
  useEffect(() => {
    const checkSaveStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        setCheckingStatus(true);
        const saved = await isCourseInWishlist(user.id, courseSlug);
        setIsSaved(saved);
      } catch (err) {
        console.error('Error checking save status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSaveStatus();
  }, [user, courseSlug]);

  // Toggle save/remove course from wishlist
  const handleSaveToggle = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        await removeSavedCourse(user.id, courseSlug);
        setIsSaved(false);
      } else {
        await saveCourseForLater(user.id, courseSlug);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error toggling save status:', err);
      setError('Failed to save course. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          {!user ? (
            <>
              {/* Google Sign In Button */}
              <button
                onClick={() => handleSignIn('google')}
                disabled={loadingProvider}
                className="flex items-center justify-center gap-2 w-[90%] mx-auto px-4 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 mb-3 shadow-[0_0_12px_rgba(103,103,103,0.25)]"
                style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
              >
                {loadingProvider === 'google' ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-[1rem] text-black font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                      Continue with Google
                    </span>
                    <img
                      src="https://auth.ignite.education/storage/v1/object/public/assets/Screenshot%202026-01-10%20at%2013.00.44.png"
                      alt="Google"
                      className="w-5 h-5 flex-shrink-0"
                    />
                  </>
                )}
              </button>

              {/* LinkedIn Sign In Button */}
              <button
                onClick={() => handleSignIn('linkedin_oidc')}
                disabled={loadingProvider}
                className="flex items-center justify-center gap-2 w-[90%] mx-auto px-4 bg-white rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 mb-4 shadow-[0_0_12px_rgba(103,103,103,0.25)]"
                style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
              >
                {loadingProvider === 'linkedin_oidc' ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-[1rem] text-black font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                      Continue with LinkedIn
                    </span>
                    <img
                      src="https://auth.ignite.education/storage/v1/object/public/assets/Screenshot%202026-01-10%20at%2013.01.02%20(1).png"
                      alt="LinkedIn"
                      className="w-5 h-5 flex-shrink-0"
                    />
                  </>
                )}
              </button>

              {/* Dynamic Status Text */}
              <p className="text-center text-black text-sm font-light mb-4" style={{ letterSpacing: '-0.02em' }}>
                {isComingSoon ? 'Sign in to join the course waitlist' : 'Sign in to start the course'}
              </p>
            </>
          ) : (
            <>
              {/* Save to Account Button for authenticated users */}
              <div className="w-[90%] mx-auto mb-4">
                <button
                  onClick={handleSaveToggle}
                  disabled={isSaving || checkingStatus}
                  className={`w-full px-4 rounded-lg transition-all duration-200 ${
                    isSaved
                      ? 'bg-gray-200 text-black hover:bg-gray-300'
                      : 'bg-[#EF0B72] text-white hover:bg-[#D10A64]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={{ paddingTop: '0.575rem', paddingBottom: '0.575rem', borderRadius: '8px' }}
                >
                  {checkingStatus ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>Loading...</span>
                    </span>
                  ) : isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="text-[1rem] font-medium" style={{ letterSpacing: '-0.02em' }}>
                        {isSaved ? 'Removing...' : 'Saving...'}
                      </span>
                    </span>
                  ) : isSaved ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                        Saved to {firstName || 'your'}'s account
                      </span>
                    </span>
                  ) : (
                    <span className="text-[1rem] font-medium truncate" style={{ letterSpacing: '-0.02em' }}>
                      Add to {firstName || 'your'}'s account
                    </span>
                  )}
                </button>

                <p className="text-center text-black text-sm font-light mt-3" style={{ letterSpacing: '-0.02em' }}>
                  {isSaved ? 'Course saved to your account' : 'We\'ll save this course for you to start later'}
                </p>
              </div>
            </>
          )}

          {/* Share Buttons Row */}
          <div className="flex items-center justify-center gap-2">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors w-[85px] ${
                copied
                  ? 'bg-green-50 text-black'
                  : 'bg-[#EDEDED] text-black hover:bg-[#E0E0E0]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs font-medium">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>

            {/* LinkedIn Share */}
            <button
              onClick={handleLinkedInShare}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#0A66C2] hover:bg-[#004182] transition-colors"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#25D366] hover:bg-[#1DA851] transition-colors"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>

            {/* Substack Share */}
            <button
              onClick={handleSubstackShare}
              className="w-[30px] h-[30px] flex items-center justify-center rounded-md bg-[#FF6719] hover:bg-[#E55A14] transition-colors"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
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
