import React from 'react';
import Lottie from 'lottie-react';
import { useAnimation } from '../contexts/AnimationContext';

const LoadingScreen = ({ message = null, autoRefresh = false, autoRefreshDelay = 30000 }) => {
  const { lottieData, isLoading: animationLoading } = useAnimation();

  // Auto-refresh effect - if loading takes too long, refresh the page
  React.useEffect(() => {
    if (autoRefresh) {
      const timer = setTimeout(() => {
        console.log('⏱️ LoadingScreen timeout - auto-refreshing page');
        window.location.reload();
      }, autoRefreshDelay);

      return () => clearTimeout(timer);
    }
  }, [autoRefresh, autoRefreshDelay]);

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

    </div>
  );
};

export default LoadingScreen;
