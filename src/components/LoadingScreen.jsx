import React from 'react';
import Lottie from 'lottie-react';
import { useAnimation } from '../contexts/AnimationContext';

const LoadingScreen = ({ message = null, showTimeoutMessage = false, timeoutDuration = 15000 }) => {
  const { lottieData, isLoading: animationLoading } = useAnimation();
  const [showTimeout, setShowTimeout] = React.useState(false);

  React.useEffect(() => {
    if (showTimeoutMessage) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, timeoutDuration);

      return () => clearTimeout(timer);
    }
  }, [showTimeoutMessage, timeoutDuration]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div
        className="loading-animation-container"
        style={{
          opacity: lottieData && !animationLoading ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform, opacity'
        }}
      >
        {lottieData && Object.keys(lottieData).length > 0 ? (
          <Lottie
            animationData={lottieData}
            loop={true}
            autoplay={true}
            style={{
              width: 200,
              height: 200,
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          />
        ) : (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            {/* Placeholder to maintain layout */}
          </div>
        )}
      </div>

      {message && (
        <p
          className="mt-6 text-gray-400 text-lg animate-pulse"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        >
          {message}
        </p>
      )}

      {showTimeout && (
        <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg max-w-md text-center">
          <p className="text-white font-medium mb-2">
            This is taking longer than expected...
          </p>
          <p className="text-gray-400 text-sm">
            Please check your internet connection. If the problem persists, try refreshing the page.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;
