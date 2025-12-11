import { useEffect, useRef } from 'react';

const EzoicAd = ({ placeholderId = '101', style = {}, isAdFree = false }) => {
  const adRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isAdFree || initializedRef.current) return;

    // Wait for Ezoic to be ready, then display the ad
    if (window.ezstandalone) {
      window.ezstandalone.cmd.push(function() {
        if (!initializedRef.current) {
          window.ezstandalone.displayMoreAds();
          initializedRef.current = true;
        }
      });
    }
  }, [isAdFree]);

  if (isAdFree) {
    return null;
  }

  return (
    <div
      ref={adRef}
      id={`ezoic-pub-ad-placeholder-${placeholderId}`}
      style={{
        display: 'block',
        height: '60px',
        maxHeight: '60px',
        overflow: 'hidden',
        ...style
      }}
    />
  );
};

export default EzoicAd;
