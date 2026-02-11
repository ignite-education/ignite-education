import React, { useState, useEffect, useRef } from 'react';
import { InlineWidget } from 'react-calendly';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../../../contexts/AuthContext';
import { useAnimation } from '../../../contexts/AnimationContext';
import Lottie from 'lottie-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CalendlyLoadingSpinner = () => {
  const { lottieData } = useAnimation();
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100%', width: '100%', backgroundColor: 'white',
      position: 'absolute', top: 0, left: 0, zIndex: 10
    }}>
      {lottieData && Object.keys(lottieData).length > 0 ? (
        <Lottie animationData={lottieData} loop autoplay style={{ width: 125, height: 125 }} />
      ) : null}
    </div>
  );
};

const OfficeHoursCard = ({ coaches, calendlyLink }) => {
  const { user: authUser, isAdFree } = useAuth();
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [isClosingCalendlyModal, setIsClosingCalendlyModal] = useState(false);
  const [calendlyLoaded, setCalendlyLoaded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [upgradingToAdFree, setUpgradingToAdFree] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const checkoutRef = useRef(null);

  // Calendly event listener
  useEffect(() => {
    const handleCalendlyEvent = (e) => {
      if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        if (e.data.event === 'calendly.event_type_viewed') {
          setCalendlyLoaded(true);
        }
      }
    };
    window.addEventListener('message', handleCalendlyEvent);
    return () => window.removeEventListener('message', handleCalendlyEvent);
  }, []);

  // Mount Stripe Checkout
  useEffect(() => {
    let checkout = null;
    const mountCheckout = async () => {
      if (clientSecret && checkoutRef.current) {
        try {
          const stripe = await stripePromise;
          checkout = await stripe.initEmbeddedCheckout({ clientSecret });
          checkout.mount(checkoutRef.current);
        } catch (error) {
          console.error('Error mounting Stripe checkout:', error);
          setUpgradingToAdFree(false);
        }
      }
    };
    mountCheckout();
    return () => { if (checkout) checkout.destroy(); };
  }, [clientSecret]);

  const handleOpenCalendly = async () => {
    if (!isAdFree) {
      await handleOpenUpgradeModal();
    } else {
      setCalendlyLoaded(false);
      setShowCalendlyModal(true);
    }
  };

  const handleCloseCalendly = () => {
    setIsClosingCalendlyModal(true);
    setTimeout(() => {
      setShowCalendlyModal(false);
      setIsClosingCalendlyModal(false);
      setCalendlyLoaded(false);
    }, 200);
  };

  const handleOpenUpgradeModal = async () => {
    if (!authUser) return;
    setShowUpgradeModal(true);
    setUpgradingToAdFree(true);
    try {
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        localStorage.setItem('pendingPaymentRefresh', Date.now().toString());
        setUpgradingToAdFree(false);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      handleCloseUpgradeModal();
    }
  };

  const handleCloseUpgradeModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowUpgradeModal(false);
      setIsClosingModal(false);
      setClientSecret(null);
      setUpgradingToAdFree(false);
    }, 200);
  };

  return (
    <>
      <div style={{ marginTop: '1.5rem', minHeight: '160px' }}>
        <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '0.75rem' }}>Office Hours</h2>
        <div className="rounded-lg flex items-center" style={{ padding: '12px', minHeight: '100px', background: '#7714E0' }}>
          {coaches || calendlyLink ? (
            <div className="flex gap-2.5 w-full items-center">
              {/* Single coach layout */}
              {coaches && coaches.length === 1 ? (
                <div className="flex-1 flex gap-4 items-center">
                  {coaches[0].linkedin_url ? (
                    <a href={coaches[0].linkedin_url} target="_blank" rel="noopener noreferrer" className="flex gap-4 items-center flex-1 group">
                      {coaches[0].image_url ? (
                        <img src={coaches[0].image_url} alt={coaches[0].name} className="w-16 h-16 rounded object-cover flex-shrink-0" style={{ marginLeft: '3px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-16 h-16 rounded bg-white/10 flex-shrink-0" style={{ marginLeft: '3px' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white" style={{ fontSize: '1rem', lineHeight: '1.3', marginBottom: '0px' }}>{coaches[0].name}</h3>
                        {coaches[0].position && <p className="text-white font-medium" style={{ fontSize: '1rem', lineHeight: '1.3', opacity: 0.9, marginBottom: '2px' }}>{coaches[0].position}</p>}
                        {coaches[0].description && <p className="text-white" style={{ fontSize: '1rem', lineHeight: '1.5', opacity: 0.85 }}>{coaches[0].description}</p>}
                      </div>
                    </a>
                  ) : (
                    <div className="flex gap-4 items-center flex-1">
                      {coaches[0].image_url ? (
                        <img src={coaches[0].image_url} alt={coaches[0].name} className="w-16 h-16 rounded object-cover flex-shrink-0" style={{ marginLeft: '3px' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-16 h-16 rounded bg-white/10 flex-shrink-0" style={{ marginLeft: '3px' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white" style={{ fontSize: '1rem', lineHeight: '1.3', marginBottom: '0px' }}>{coaches[0].name}</h3>
                        {coaches[0].position && <p className="text-white font-medium" style={{ fontSize: '1rem', lineHeight: '1.3', opacity: 0.9, marginBottom: '2px' }}>{coaches[0].position}</p>}
                        {coaches[0].description && <p className="text-white" style={{ fontSize: '1rem', lineHeight: '1.5', opacity: 0.85 }}>{coaches[0].description}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Multi-coach layout */
                <div className="flex-1 grid grid-cols-4" style={{ gap: '-1px' }}>
                  {(() => {
                    const displayCoaches = [];
                    for (let i = 0; i < 4; i++) {
                      displayCoaches.push(coaches && coaches[i] ? coaches[i] : null);
                    }
                    return displayCoaches.map((coach, index) => (
                      <div key={coach?.id || `placeholder-${index}`} className="flex flex-col items-center text-center group">
                        {coach && coach.linkedin_url ? (
                          <a href={coach.linkedin_url} target="_blank" rel="noopener noreferrer" className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center cursor-pointer">
                            {coach.image_url ? (
                              <img src={coach.image_url} alt={coach.name} className="w-[50.4px] h-[50.4px] rounded object-cover mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                            )}
                            <span className="font-semibold text-white block truncate w-full" style={{ fontSize: '1rem', lineHeight: '1.2' }}>{coach.name}</span>
                            {coach.position && <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>}
                          </a>
                        ) : (
                          <div className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center">
                            {coach ? (
                              <>
                                {coach.image_url ? (
                                  <img src={coach.image_url} alt={coach.name} className="w-[50.4px] h-[50.4px] rounded object-cover mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                )}
                                <h3 className="font-semibold text-white mb-0 truncate w-full" style={{ fontSize: '1rem', lineHeight: '1.2' }}>{coach.name}</h3>
                                {coach.position && <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>}
                              </>
                            ) : (
                              <>
                                <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                <div className="h-2.5 bg-white/10 rounded mb-0.5 w-16" />
                                <div className="h-2 bg-white/10 rounded w-12" style={{ marginBottom: '-3px' }} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}
              {calendlyLink && (
                <div className="flex items-center" style={{ paddingRight: '2px' }}>
                  <button
                    onClick={handleOpenCalendly}
                    className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                    style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.3rem' }}
                    title="Book Office Hours"
                  >
                    <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={handleOpenCalendly}
                className="bg-white hover:bg-gray-100 text-black font-semibold py-3 px-6 rounded-lg transition"
              >
                Book Office Hours
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calendly Modal */}
      {showCalendlyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={handleCloseCalendly}
        >
          <div
            className={`bg-white rounded-xl relative ${isClosingCalendlyModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            style={{ width: '90vw', maxWidth: '600px', height: '700px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleCloseCalendly} className="absolute top-3 right-3 z-20 text-gray-500 hover:text-gray-700" style={{ fontSize: '24px' }}>×</button>
            {!calendlyLoaded && <CalendlyLoadingSpinner />}
            <InlineWidget url={calendlyLink} styles={{ height: '100%', borderRadius: '0.75rem', overflow: 'hidden' }} />
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={handleCloseUpgradeModal}
        >
          <div
            className={`bg-white rounded-xl relative p-6 ${isClosingModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            style={{ width: '90vw', maxWidth: '500px', minHeight: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleCloseUpgradeModal} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" style={{ fontSize: '24px' }}>×</button>
            {upgradingToAdFree ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7714E0]" />
              </div>
            ) : (
              <div ref={checkoutRef} style={{ minHeight: '350px' }} />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default OfficeHoursCard;
