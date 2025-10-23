import { useEffect, useState, useRef } from 'react';

const GoogleAd = ({ adClient, adSlot, adFormat = 'auto', style = {}, isAdFree = false }) => {
  const [showPlaceholder, setShowPlaceholder] = useState(true); // Start with placeholder
  const adInitialized = useRef(false); // Track if ad has been initialized

  useEffect(() => {
    // Don't load ads if user is ad-free or already initialized
    if (isAdFree || adInitialized.current) return;

    // Load AdSense script if not already loaded
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      if (adClient) {
        script.setAttribute('data-ad-client', adClient);
      }

      script.onload = () => {
        // Hide placeholder when script loads successfully
        setShowPlaceholder(false);
        // Push ad to AdSense queue only if not already initialized
        if (!adInitialized.current) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            adInitialized.current = true;
          } catch (e) {
            console.error('AdSense error:', e);
            setShowPlaceholder(true);
          }
        }
      };

      script.onerror = () => {
        console.log('AdSense script failed to load');
        setShowPlaceholder(true);
      };

      document.head.appendChild(script);
    } else {
      // Script already loaded, hide placeholder and push ad only if not already initialized
      setShowPlaceholder(false);
      if (!adInitialized.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          adInitialized.current = true;
        } catch (e) {
          console.error('AdSense error:', e);
          setShowPlaceholder(true);
        }
      }
    }
  }, [adClient, isAdFree]);

  // Don't render anything if user is ad-free
  if (isAdFree) {
    return null;
  }

  // If no ad client provided, show placeholder
  if (!adClient || !adSlot) {
    return (
      <div
        className="bg-gray-800 rounded-lg flex items-center justify-center"
        style={{ minHeight: '100px', ...style }}
      >
        <p className="text-gray-400 text-xs">Advertisement Placeholder</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '60px' }}>
      {showPlaceholder ? (
        <div
          className="bg-gray-800 rounded-lg flex items-center justify-center"
          style={{ minHeight: '60px', ...style }}
        >
          <p className="text-gray-400 text-xs">Advertisement</p>
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', ...style }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
};

export default GoogleAd;
