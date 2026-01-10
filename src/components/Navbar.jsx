import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Navbar - Reusable navigation bar component with auth-aware rendering
 * - Unsigned user: Logo + Sign In button
 * - Signed in user: Logo + Profile picture (or first initial)
 */
const Navbar = () => {
  const { user, profilePicture, firstName } = useAuth();

  return (
    <div className="sticky top-0 z-50 bg-black">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo - links to home */}
        <Link to="/" className="inline-block">
          <div
            className="bg-contain bg-no-repeat bg-left"
            style={{
              backgroundImage: 'url(https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_S_2.png)',
              height: '37px',
              width: '37px'
            }}
          />
        </Link>

        {/* Right side - Sign In button or Profile */}
        {user ? (
          <Link to="/progress" className="inline-block">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center text-white font-medium">
                {firstName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </Link>
        ) : (
          <Link
            to="/welcome"
            className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;
