import { useEffect, useState, useRef } from 'react';

const GoogleAd = ({ 
  adClient = import.meta.env.VITE_ADSENSE_CLIENT, 
  adSlot = import.meta.env.VITE_ADSENSE_SLOT, 
  adFormat = 'auto', 
  style = {}, 
  isAdFree = false 
}) => {
  const [adStatus, setAdStatus] = useState('loading');
  const adInitialized = useRef(false);
  const insRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isAdFree) {
      console.log('[GoogleAd] User is ad-free, not loading ads');
      setAdStatus('hidden');
      return;
    }

    if (!adClient || !adSlot) {
      console.warn('[GoogleAd] Missing ad credentials:', { adClient, adSlot });
      setAdStatus('error');
      return;
    }

    if (adInitialized.current) {
      return;
    }

    if (!insRef.current || !containerRef.current) {
      return;
    }

    const adStatusAttr = insRef.current.getAttribute('data-ad-status');
    const adsbyGoogleStatusAttr = insRef.current.getAttribute('data-adsbygoogle-status');
    
    if (adStatusAttr === 'filled' || adsbyGoogleStatusAttr) {
      setAdStatus('loaded');
      return;
    }

    if (typeof window.adsbygoogle === 'undefined') {
      console.warn('[GoogleAd] AdSense script not loaded. Make sure the script is in index.html head section.');
      setAdStatus('error');
      return;
    }

    const checkWidthAndInitialize = () => {
      const insWidth = insRef.current?.offsetWidth || 0;
      
      if (insWidth === 0) {
        console.log('[GoogleAd] Ins element width is 0, waiting for layout...');
        setTimeout(checkWidthAndInitialize, 100);
        return;
      }

      try {
        console.log('[GoogleAd] Initializing ad with ins width:', insWidth, { adClient, adSlot, adFormat });
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adInitialized.current = true;
        setAdStatus('loaded');
        console.log('[GoogleAd] Ad initialized successfully');
      } catch (error) {
        console.error('[GoogleAd] Error initializing ad:', error);
        setAdStatus('error');
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !adInitialized.current) {
            console.log('[GoogleAd] Ad container is visible, checking width...');
            setTimeout(checkWidthAndInitialize, 200);
          }
        });
      },
      { threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      adInitialized.current = false;
    };
  }, [adClient, adSlot, adFormat, isAdFree]);

  if (adStatus === 'hidden') {
    return null;
  }

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
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default GoogleAd;
