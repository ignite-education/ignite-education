import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
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
  const { user: authUser, isInsider, hasUsedTrial, firstName } = useAuth();
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [isClosingCalendlyModal, setIsClosingCalendlyModal] = useState(false);
  const [calendlyLoaded, setCalendlyLoaded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [upgradingToInsider, setUpgradingToInsider] = useState(false);
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
          setUpgradingToInsider(false);
        }
      }
    };
    mountCheckout();
    return () => { if (checkout) checkout.destroy(); };
  }, [clientSecret]);

  const handleOpenCalendly = async () => {
    if (!isInsider) {
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
    setUpgradingToInsider(true);
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
        setUpgradingToInsider(false);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setUpgradingToInsider(false);
    }
  };

  const handleCloseUpgradeModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowUpgradeModal(false);
      setIsClosingModal(false);
      setClientSecret(null);
      setUpgradingToInsider(false);
    }, 200);
  };

  return (
    <>
      <div style={{ marginTop: '0.875rem', minHeight: '160px' }}>
        <h2 className="font-semibold text-white leading-snug" style={{ fontSize: '1.6rem', letterSpacing: '0%', marginBottom: '0.75rem' }}>Office Hours</h2>
        <div className="rounded-lg flex items-center group" style={{ padding: '1rem', minHeight: '100px', background: '#7714E0', cursor: 'pointer' }} onClick={handleOpenCalendly}>
          {coaches || calendlyLink ? (
            <div className="flex gap-2.5 w-full items-center">
              {/* Single coach layout */}
              {coaches && coaches.length === 1 ? (
                <div className="flex-1 flex items-center cursor-pointer" style={{ gap: '1.5rem' }} onClick={handleOpenCalendly}>
                      <div className="flex flex-col items-center flex-shrink-0" style={{ marginLeft: '0' }}>
                        {coaches[0].image_url ? (
                          <img src={coaches[0].image_url} alt={coaches[0].name} style={{ width: '4.8rem', height: '4.8rem' }} className="rounded object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="rounded bg-white/10" style={{ width: '4.8rem', height: '4.8rem' }} />
                        )}
                        <p className="text-white leading-snug" style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: '5px' }}>Available</p>
                        <div className="bg-white rounded" style={{ padding: '4px 6px', marginTop: '5px', textAlign: 'center' }}>
                          <p className="text-black leading-snug" style={{ fontSize: '0.8rem', fontWeight: 400, letterSpacing: '-1%' }}>Tomorrow at 4PM</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0" style={{ maxWidth: '75%' }}>
                        {coaches[0].linkedin_url ? (
                          <a href={coaches[0].linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-white leading-snug" style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0%', marginBottom: '0px' }}>{coaches[0].name}</h3>
                          </a>
                        ) : (
                          <h3 className="text-white leading-snug" style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0%', marginBottom: '0px' }}>{coaches[0].name}</h3>
                        )}
                        {coaches[0].position && <p className="text-white leading-snug" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '0%', marginBottom: '0.5rem' }}>{coaches[0].position}</p>}
                        {coaches[0].description && <p className="text-white leading-snug" style={{ fontSize: '0.9rem', fontWeight: 300, letterSpacing: '0%' }}>{coaches[0].description}</p>}
                      </div>
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
                      <div key={coach?.id || `placeholder-${index}`} className="flex flex-col items-center text-center group cursor-pointer" onClick={handleOpenCalendly}>
                        <div className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center">
                          {coach ? (
                            <>
                              {coach.image_url ? (
                                <img src={coach.image_url} alt={coach.name} className="w-[4rem] h-[4rem] rounded object-cover mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
                              ) : (
                                <div className="w-[4rem] h-[4rem] rounded bg-white/10 mb-1" />
                              )}
                              {coach.linkedin_url ? (
                                <a href={coach.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-white block truncate w-full leading-snug" style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0%' }}>{coach.name}</span>
                                </a>
                              ) : (
                                <span className="text-white block truncate w-full leading-snug" style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0%' }}>{coach.name}</span>
                              )}
                              {coach.position && <p className="text-white truncate w-full leading-snug" style={{ fontSize: '10px', marginTop: '0.5px', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>}
                            </>
                          ) : (
                            <>
                              <div className="w-[4rem] h-[4rem] rounded bg-white/10 mb-1" />
                              <div className="h-2.5 bg-white/10 rounded mb-0.5 w-16" />
                              <div className="h-2 bg-white/10 rounded w-12" style={{ marginBottom: '-3px' }} />
                            </>
                          )}
                        </div>
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
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseUpgradeModal}
        >
          <div className="relative">
            <div
              className="bg-white relative flex"
              style={{
                width: '850px',
                height: '80vh',
                minHeight: '100px',
                padding: '0px',
                animation: isClosingModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseUpgradeModal}
                className="absolute top-6 right-6 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Left side - Features section */}
              <div style={{ width: '50%' }} className="p-8 flex flex-col justify-center">
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <img
                      src="https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_4uq8su4uq8su4uq8%20(1).png"
                      alt=""
                      style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                    />
                  </div>

                  <h3 style={{ color: '#7714E0', fontSize: '1.5rem', fontWeight: 600, lineHeight: '1.2', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
                    {hasUsedTrial ? 'Upgrade to Ignite Insider' : 'Try Ignite Insider for free'}
                  </h3>

                  <p className="text-black font-light" style={{ fontSize: '1rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                    Build real, career-ready skills with access to professional office hours, job notifications and AI-powered learning tools.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <p className="text-gray-800 font-normal m-0 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                      1:1 Office Hours with industry professionals
                    </p>
                    <p className="text-gray-800 font-normal m-0 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                      Weekly hand-pick job opportunities
                    </p>
                    <p className="text-gray-800 font-normal m-0 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                      AI Tool Prompt highlights
                    </p>

                  </div>

                  <div
                    style={{
                      backgroundColor: '#7714E0',
                      color: 'white',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '10px',
                      textAlign: 'center',
                      width: '90%',
                      margin: '0 auto',
                      boxShadow: '0 0 10px rgba(103,103,103,0.4)'
                    }}
                  >
                    {hasUsedTrial
                      ? 'Get Ignite Insider'
                      : `Two weeks free${firstName ? ` for ${firstName}` : ''}`
                    }
                  </div>

                  <p className="text-black text-center m-0 font-light" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {hasUsedTrial ? 'just 99p week' : 'then just 99p week'}
                  </p>

                  <p className="text-black text-center m-0 font-light" style={{ fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: '1.4' }}>
                    Includes all Ignite Insider features.<br />Billed four weekly. Cancel anytime.
                  </p>
                </div>
              </div>

              {/* Right side - Stripe checkout */}
              <div style={{ width: '50%', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="relative overflow-y-auto">
                <div
                  key={clientSecret}
                  ref={checkoutRef}
                  style={{
                    minHeight: '350px',
                    paddingTop: '10px',
                    paddingBottom: '10px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OfficeHoursCard;
