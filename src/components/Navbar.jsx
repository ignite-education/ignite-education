import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Navbar - Reusable navigation bar component with auth-aware rendering
 * - Unsigned user: Logo + Sign In button
 * - Signed in user: Logo + Profile picture (or first initial)
 */
const Navbar = ({ backgroundColor = 'black' }) => {
  const { user, profilePicture, firstName } = useAuth();

  return (
    <div
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="px-10 py-[15px] flex items-center justify-between">
        {/* Logo - links to home */}
        <Link to="/" className="inline-block">
          <img
            src="https://auth.ignite.education/storage/v1/object/public/assets/ignitelogowhite.png"
            alt="Ignite Education"
            style={{
              height: 'auto',
              width: '99px'
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
        ) : (
          <Link
            to="/sign-in"
            className="px-5 py-2 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors"
            style={{ letterSpacing: '-0.01em', borderRadius: '0.25rem' }}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;
