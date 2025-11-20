import { useEffect, useState, useRef } from 'react';

const GoogleAd = ({ 
  adClient = import.meta.env.VITE_ADSENSE_CLIENT, 
  adSlot = import.meta.env.VITE_ADSENSE_SLOT, 
  adFormat = 'auto', 
  style = {}, 
  isAdFree = false 
}) => {
  const [adStatus, setAdStatus] = useState('loading'); // 'loading', 'loaded', 'error', 'hidden'
  const adInitialized = useRef(false);
  const insRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Don't load ads if user is ad-free
    if (isAdFree) {
      console.log('[GoogleAd] User is ad-free, not loading ads');
      setAdStatus('hidden');
      return;
    }

    // Validate ad credentials
    if (!adClient || !adSlot) {
      console.warn('[GoogleAd] Missing ad credentials:', { adClient, adSlot });
      console.warn('[GoogleAd] Make sure VITE_ADSENSE_CLIENT and VITE_ADSENSE_SLOT are set in .env');
      setAdStatus('error');
      return;
    }

    // Don't initialize if already done
    if (adInitialized.current) {
      console.log('[GoogleAd] Already initialized');
      return;
    }

    // Wait for ins element to be in the DOM
    if (!insRef.current || !containerRef.current) {
      console.log('[GoogleAd] Waiting for elements to mount');
      return;
    }

    // Check if this specific ins element already has an ad
    const adStatusAttr = insRef.current.getAttribute('data-ad-status');
    const adsbyGoogleStatusAttr = insRef.current.getAttribute('data-adsbygoogle-status');
    
    if (adStatusAttr === 'filled' || adsbyGoogleStatusAttr) {
      console.log('[GoogleAd] Ad already filled:', { adStatusAttr, adsbyGoogleStatusAttr });
      setAdStatus('loaded');
      return;
    }

    // Check if AdSense script is loaded (should be in index.html)
    if (typeof window.adsbygoogle === 'undefined') {
      console.warn('[GoogleAd] AdSense script not loaded. Make sure the script is in index.html head section.');
      setAdStatus('error');
      return;
    }

    // Wait for container to have width before initializing ad
    const checkWidthAndInitialize = () => {
      const containerWidth = containerRef.current?.offsetWidth || 0;
      
      if (containerWidth === 0) {
        console.log('[GoogleAd] Container width is 0, waiting for layout...');
        // Try again after a short delay
        setTimeout(checkWidthAndInitialize, 100);
        return;
      }

      // Container has width, safe to initialize ad
      try {
        console.log('[GoogleAd] Initializing ad with container width:', containerWidth, { adClient, adSlot, adFormat });
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adInitialized.current = true;
        setAdStatus('loaded');
        console.log('[GoogleAd] Ad initialized successfully');
      } catch (error) {
        console.error('[GoogleAd] Error initializing ad:', error);
        setAdStatus('error');
      }
    };

    // Use IntersectionObserver to detect when ad becomes visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !adInitialized.current) {
            console.log('[GoogleAd] Ad container is visible, checking width...');
            // Give the browser time to calculate layout
            setTimeout(checkWidthAndInitialize, 100);
          }
        });
      },
      { threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Cleanup function
    return () => {
      observer.disconnect();
      console.log('[GoogleAd] Component unmounting');
      adInitialized.current = false;
    };
  }, [adClient, adSlot, adFormat, isAdFree]);

  // Don't render anything if user is ad-free
  if (adStatus === 'hidden') {
    return null;
  }

  // If ad loading error or missing credentials, show placeholder
  if (adStatus === 'error') {
    return (
      <div
        className="bg-gray-800 rounded-lg flex items-center justify-center"
        style={{ minHeight: '100px', ...style }}
      >
        <p className="text-gray-400 text-xs">Advertisement Unavailable</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={style}>
      {adStatus === 'loading' && (
        <div
          className="bg-gray-800 rounded-lg flex items-center justify-center animate-pulse"
          style={style}
        >
          <p className="text-gray-400 text-xs">Loading Advertisement...</p>
        </div>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ 
          display: adStatus === 'loading' ? 'none' : 'block',
          ...style
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default GoogleAd;
