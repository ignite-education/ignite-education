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
        <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '0%', marginBottom: '0.75rem' }}>Office Hours</h2>
        <div className="rounded-lg flex items-center" style={{ padding: '1rem', minHeight: '100px', background: '#7714E0' }}>
          {coaches || calendlyLink ? (
            <div className="flex gap-2.5 w-full items-center">
              {/* Single coach layout */}
              {coaches && coaches.length === 1 ? (
                <div className="flex-1 flex items-center cursor-pointer" style={{ gap: '1.5rem' }} onClick={handleOpenCalendly}>
                      <div className="flex flex-col items-center flex-shrink-0" style={{ marginLeft: '0' }}>
                        {coaches[0].image_url ? (
                          <img src={coaches[0].image_url} alt={coaches[0].name} style={{ width: '6rem', height: '6rem' }} className="rounded object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="rounded bg-white/10" style={{ width: '6rem', height: '6rem' }} />
                        )}
                        <p className="text-white" style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '4px' }}>Available</p>
                        <div className="bg-white rounded" style={{ width: '6rem', padding: '2px 0', marginTop: '3px', textAlign: 'center' }}>
                          <p className="text-black" style={{ fontSize: '0.7rem', fontWeight: 400 }}>Tomorrow at 4PM</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0" style={{ maxWidth: '75%' }}>
                        {coaches[0].linkedin_url ? (
                          <a href={coaches[0].linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-white" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '0%', marginBottom: '0px' }}>{coaches[0].name}</h3>
                            {coaches[0].position && <p className="text-white" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '0%', marginBottom: '0.5rem' }}>{coaches[0].position}</p>}
                          </a>
                        ) : (
                          <>
                            <h3 className="text-white" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '0%', marginBottom: '0px' }}>{coaches[0].name}</h3>
                            {coaches[0].position && <p className="text-white" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '0%', marginBottom: '0.5rem' }}>{coaches[0].position}</p>}
                          </>
                        )}
                        {coaches[0].description && <p className="text-white" style={{ fontSize: '0.9rem', fontWeight: 300, letterSpacing: '0%' }}>{coaches[0].description}</p>}
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
                      <div key={coach?.id || `placeholder-${index}`} className="flex flex-col items-center text-center group">
                        {coach && coach.linkedin_url ? (
                          <a href={coach.linkedin_url} target="_blank" rel="noopener noreferrer" className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center cursor-pointer">
                            {coach.image_url ? (
                              <img src={coach.image_url} alt={coach.name} className="w-[5rem] h-[5rem] rounded object-cover mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <div className="w-[5rem] h-[5rem] rounded bg-white/10 mb-1" />
                            )}
                            <span className="text-white block truncate w-full" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '0%' }}>{coach.name}</span>
                            {coach.position && <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>}
                          </a>
                        ) : (
                          <div className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center">
                            {coach ? (
                              <>
                                {coach.image_url ? (
                                  <img src={coach.image_url} alt={coach.name} className="w-[5rem] h-[5rem] rounded object-cover mb-1" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <div className="w-[5rem] h-[5rem] rounded bg-white/10 mb-1" />
                                )}
                                <h3 className="text-white mb-0 truncate w-full" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '0%' }}>{coach.name}</h3>
                                {coach.position && <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>}
                              </>
                            ) : (
                              <>
                                <div className="w-[5rem] h-[5rem] rounded bg-white/10 mb-1" />
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
                height: '65vh',
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
              <div style={{ width: '45.6%' }} className="bg-black p-8 flex flex-col justify-center">
                <div style={{ marginTop: '-10px' }}>
                  <h3 className="text-white text-2xl font-medium" style={{ lineHeight: '1', marginBottom: '1.3rem' }}>
                    <span className="font-light text-lg">For just 99p a week,</span><br />
                    <span style={{ fontSize: '1.4rem', color: '#FFFFFF' }}>get exclusive access to</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '1.4s', opacity: 0, animationFillMode: 'forwards' }}>
                      <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-0" style={{ color: '#EF0B72' }}>Office Hours</h4>
                        <p className="text-white text-sm opacity-90 m-0" style={{ marginTop: '-3px', lineHeight: '1.3' }}>Get personalised support from<br />course leaders when you need it.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '2.1s', opacity: 0, animationFillMode: 'forwards' }}>
                      <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-0" style={{ color: '#EF0B72' }}>Completely Ad-Free</h4>
                        <p className="text-white text-sm opacity-90 m-0" style={{ marginTop: '-3px', lineHeight: '1.3' }}>Learn without distractions with<br />a completely ad-free experience.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '2.8s', opacity: 0, animationFillMode: 'forwards' }}>
                      <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-0" style={{ color: '#EF0B72' }}>Weekly Handpicked Roles</h4>
                        <p className="text-white text-sm opacity-90 m-0" style={{ marginTop: '-3px', lineHeight: '1.3' }}>We'll send you the top career<br />opportunities to you every week.</p>
                      </div>
                    </div>

                    <p className="text-white text-sm mt-6" style={{ animation: 'fadeIn 1.5s ease-out', animationDelay: '4.2s', opacity: 0, animationFillMode: 'forwards' }}>
                      Billed weekly. Cancel anytime.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Stripe checkout */}
              <div style={{ width: '54.4%', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="relative overflow-y-auto">
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
