import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * CoursesNavbar - Custom navbar for the /courses page
 * - Not signed in: Returns null (no navbar)
 * - Signed in: Translucent blur background with user image only (no logo)
 */
const CoursesNavbar = () => {
  const { user, profilePicture, firstName, signOut } = useAuth();

  // Popup state management
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [popupLocked, setPopupLocked] = useState(false);
  const closeTimeoutRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Date formatting helper
  const formatJoinDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${month}-${year}`;
  };

  // Hover handlers
  const handleAvatarMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowProfilePopup(true);
  };

  const handleAvatarMouseLeave = () => {
    if (!popupLocked) {
      closeTimeoutRef.current = setTimeout(() => {
        setShowProfilePopup(false);
      }, 300);
    }
  };

  const handlePopupMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setPopupLocked(true);
  };

  const handlePopupMouseLeave = () => {
    setPopupLocked(false);
    closeTimeoutRef.current = setTimeout(() => {
      setShowProfilePopup(false);
    }, 300);
  };

  // Don't render navbar if user is not signed in
  if (!user) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="px-5 py-5 flex items-center justify-end">
        <div
          className="relative"
          onMouseEnter={handleAvatarMouseEnter}
          onMouseLeave={handleAvatarMouseLeave}
        >
          {/* Avatar - stays on top of popup */}
          <div className="cursor-pointer relative z-10">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="object-cover rounded-sm"
                style={{ width: '41px', height: '41px' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="bg-[#8200EA] flex items-center justify-center text-white font-medium rounded-sm"
                style={{ width: '41px', height: '41px' }}
              >
                {firstName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>

          {/* Profile Popup - expands from behind avatar */}
          {showProfilePopup && (
            <div
              className="absolute right-0 animate-scaleUp origin-top-right"
              style={{
                top: '0',
                width: '280px',
                backgroundColor: '#F8F8F8',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                padding: '20px',
                paddingTop: '75px',
                zIndex: -1,
              }}
              onMouseEnter={handlePopupMouseEnter}
              onMouseLeave={handlePopupMouseLeave}
            >
              {/* Joined Badge - positioned at top left */}
              {user?.created_at && (
                <div
                  className="absolute"
                  style={{
                    top: '20px',
                    left: '20px',
                    backgroundColor: '#8200EA',
                    color: '#FFFFFF',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Joined {formatJoinDate(user.created_at)}
                </div>
              )}

              {/* Greeting */}
              <div className="mb-5">
                <span style={{ color: '#000000', fontSize: '24px', fontStyle: 'italic' }}>Hello, </span>
                <span style={{ color: '#8200EA', fontSize: '24px', fontWeight: '600' }}>
                  {firstName || 'User'}
                </span>
              </div>

              {/* Menu Items */}
              <div className="flex flex-col gap-2 mb-4">
                <Link
                  to="/progress"
                  className="block py-3 px-4 transition-colors hover:bg-gray-200"
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Progress Hub
                </Link>
                <Link
                  to="/courses"
                  className="block py-3 px-4 transition-colors hover:bg-gray-200"
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Courses
                </Link>
                <button
                  className="block w-full text-left py-3 px-4 transition-colors cursor-not-allowed"
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: 0.5,
                  }}
                  disabled
                >
                  Settings
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  className="flex-1 py-3 transition-colors cursor-not-allowed"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: 0.5,
                  }}
                  disabled
                >
                  Invite a Friend
                </button>
                <button
                  onClick={signOut}
                  className="flex-1 py-3 transition-colors hover:bg-gray-50"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesNavbar;
