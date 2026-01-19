import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * CoursesNavbar - Custom navbar for the /courses page
 * - Not signed in: Returns null (no navbar)
 * - Signed in: Translucent blur background with user image only (no logo)
 */
const CoursesNavbar = () => {
  const { user, profilePicture, firstName } = useAuth();

  // Don't render navbar if user is not signed in
  if (!user) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-end">
        {/* User profile image/initial on the right with translucent blur border */}
        <div className="p-1.5 rounded-md bg-white/30 backdrop-blur-md">
          <Link to="/progress" className="inline-block">
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
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CoursesNavbar;
