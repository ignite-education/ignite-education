import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * CoursePageNavbar - Navigation bar with black background for individual course pages
 * - Unsigned user: Logo + Sign In button
 * - Signed in user: Logo + Profile picture (or first initial)
 * @param {number} logoClipPercentage - Percentage (0-100) of black logo to show from top (for split-color effect)
 * @param {boolean} invertLayers - Whether to invert layer order (white on top, black on base) for WHITE→BLACK transitions
 * @param {React.RefObject} logoContainerRef - Ref to the logo container for position tracking
 */
const CoursePageNavbar = ({ logoClipPercentage = 100, invertLayers = false, logoContainerRef = null }) => {
  const { user, profilePicture, firstName } = useAuth();

  return (
    <div
      className="sticky top-0 z-50 bg-black"
    >
      <div className="px-10 py-[15px] flex items-center justify-between">
        {/* Logo - links to home */}
        <Link to="/" className="inline-block">
          <div ref={logoContainerRef} className="logo-container" style={{ position: 'relative', width: '99px', height: 'auto' }}>
            {!invertLayers ? (
              <>
                {/* Standard order for BLACK→WHITE transitions */}
                {/* Black logo - clips from top, shows bottom portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_5.png"
                  alt="Ignite Education"
                  className="logo-layer"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(${logoClipPercentage}% 0 0 0)`
                  }}
                />
                {/* White logo - clips from bottom, shows top portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png"
                  alt=""
                  aria-hidden="true"
                  className="logo-layer"
                  style={{
                    position: 'relative',
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(0 0 ${100 - logoClipPercentage}% 0)`
                  }}
                />
              </>
            ) : (
              <>
                {/* Inverted order for WHITE→BLACK transitions */}
                {/* White logo - clips from top, shows bottom portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_6%20(2).png"
                  alt="Ignite Education"
                  className="logo-layer"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(${logoClipPercentage}% 0 0 0)`
                  }}
                />
                {/* Black logo - clips from bottom, shows top portion */}
                <img
                  src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_5.png"
                  alt=""
                  aria-hidden="true"
                  className="logo-layer"
                  style={{
                    position: 'relative',
                    width: '99px',
                    height: 'auto',
                    clipPath: `inset(0 0 ${100 - logoClipPercentage}% 0)`
                  }}
                />
              </>
            )}
          </div>
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
            style={{ letterSpacing: '-0.01em', borderRadius: '0.25rem', width: '100px', display: 'inline-block', textAlign: 'center' }}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
};

export default CoursePageNavbar;
