import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const formatUpcomingTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const hour = date.getHours();
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const timeStr = `${h}${period}`;

  if (targetDay.getTime() === today.getTime()) return `Today at ${timeStr}`;
  if (targetDay.getTime() === tomorrow.getTime()) return `Tomorrow at ${timeStr}`;

  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day}-${month} at ${timeStr}`;
};

const OfficeHoursCard = ({ coaches, courseId }) => {
  const { user: authUser, isInsider, hasUsedTrial, firstName } = useAuth();
  const [liveSession, setLiveSession] = useState(null); // { id, status, coach }
  const [nextUpcoming, setNextUpcoming] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [upgradingToInsider, setUpgradingToInsider] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const checkoutRef = useRef(null);

  // Preload upgrade modal image
  useEffect(() => {
    const img = new Image();
    img.src = 'https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_4uq8su4uq8su4uq8%20(1).png';
  }, []);

  // Fetch initial live status + subscribe to realtime updates
  useEffect(() => {
    if (!courseId) return;

    // Initial fetch
    fetch(`${API_URL}/api/office-hours/status/${encodeURIComponent(courseId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.live && data.sessions?.length > 0) {
          const s = data.sessions[0];
          setLiveSession({ id: s.id, status: s.status, coach: s.coach, startedAt: s.startedAt });
        }
        if (data.upcoming?.length > 0) {
          setNextUpcoming(data.upcoming[0].starts_at);
        }
      })
      .catch(err => console.error('Error fetching office hours status:', err));

    // Realtime subscription
    const channel = supabase
      .channel('office-hours-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'office_hours_sessions',
        filter: `course_id=eq.${courseId}`,
      }, (payload) => {
        const row = payload.new;
        if (!row) {
          setLiveSession(null);
          return;
        }
        if (row.status === 'live') {
          setLiveSession(prev => ({
            id: row.id,
            status: 'live',
            coach: prev?.coach || null,
            startedAt: row.started_at,
          }));
        } else if (row.status === 'occupied') {
          setLiveSession(prev => prev?.id === row.id ? { ...prev, status: 'occupied' } : prev);
        } else if (row.status === 'ended') {
          setLiveSession(prev => prev?.id === row.id ? null : prev);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [courseId]);

  // Mount Stripe Checkout
  useEffect(() => {
    let checkout = null;
    let cancelled = false;
    const mountCheckout = async () => {
      if (clientSecret && checkoutRef.current) {
        try {
          const stripe = await stripePromise;
          if (cancelled) return;
          checkout = await stripe.initEmbeddedCheckout({ clientSecret });
          if (cancelled) { checkout.destroy(); return; }
          checkout.mount(checkoutRef.current);
        } catch (error) {
          console.error('Error mounting Stripe checkout:', error);
          setUpgradingToInsider(false);
        }
      }
    };
    mountCheckout();
    return () => { cancelled = true; if (checkout) checkout.destroy(); };
  }, [clientSecret]);

  const handleJoinOfficeHours = async () => {
    if (!isInsider) {
      await handleOpenUpgradeModal();
      return;
    }

    if (liveSession && liveSession.status === 'live') {
      window.open(`/office-hours/${liveSession.id}`, '_blank');
    }
  };

  const handleOpenUpgradeModal = async () => {
    if (!authUser) return;
    setShowUpgradeModal(true);
    document.body.style.overflow = 'hidden';
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
      document.body.style.overflow = '';
      setClientSecret(null);
      setUpgradingToInsider(false);
    }, 200);
  };

  const isLive = liveSession?.status === 'live';
  const isOccupied = liveSession?.status === 'occupied';

  return (
    <>
      <div style={{ marginTop: '0.875rem', minHeight: '160px' }}>
        <h2 className="font-semibold text-white leading-snug" style={{ fontSize: '1.6rem', letterSpacing: '0%', marginBottom: '0.75rem' }}>Office Hours</h2>
        <div
          className="rounded-lg flex items-center group"
          style={{
            padding: '1rem',
            minHeight: '100px',
            background: '#7714E0',
            cursor: isLive ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={isLive ? handleJoinOfficeHours : undefined}
        >
          {coaches ? (
            <div className="flex gap-2.5 w-full items-center">
              {/* Single coach layout */}
              {coaches.length === 1 ? (
                <div className="flex-1 flex items-center" style={{ gap: '1.5rem' }}>
                      <div className="flex flex-col items-center flex-shrink-0" style={{ marginLeft: '0' }}>
                        <div style={{ position: 'relative' }}>
                          {coaches[0].image_url ? (
                            <img
                              src={coaches[0].image_url}
                              alt={coaches[0].name}
                              style={{
                                width: '4.8rem',
                                height: '4.8rem',
                                border: '2.5px solid transparent',
                              }}
                              className="rounded object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="rounded bg-white/10" style={{ width: '4.8rem', height: '4.8rem' }} />
                          )}
                        </div>
                        {/* Live/Offline status */}
                        {isLive ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'white',
                          }}>
                            <div style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#22c55e',
                              boxShadow: '0 0 6px #22c55e',
                              animation: 'pulse-green 1.5s ease-in-out infinite',
                            }} />
                            <span style={{ color: 'black', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em' }}>Live</span>
                          </div>
                        ) : isOccupied ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '6px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(251,191,36,0.15)',
                          }}>
                            <div style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#fbbf24',
                            }} />
                            <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 500 }}>In Session</span>
                          </div>
                        ) : nextUpcoming ? (
                          <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px', backgroundColor: 'white', borderRadius: '6px', padding: '4px 10px' }}>
                            <span style={{ color: 'black', fontSize: '0.65rem', fontWeight: 400 }}>{formatUpcomingTime(nextUpcoming)}</span>
                          </div>
                        ) : null}
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
                      <div key={coach?.id || `placeholder-${index}`} className="flex flex-col items-center text-center group">
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
              {/* Join / Status button */}
              <div className="flex items-center" style={{ paddingRight: '2px' }}>
                {isLive ? (
                  <button
                    onClick={handleJoinOfficeHours}
                    className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                    style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.3rem' }}
                    title="Join Office Hours"
                  >
                    <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : !isInsider ? (
                  <button
                    onClick={handleOpenUpgradeModal}
                    className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                    style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.3rem' }}
                    title="Upgrade to Insider"
                  >
                    <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <p className="text-white/60" style={{ fontSize: '0.9rem' }}>No coaches assigned yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Pulse animation for live indicator */}
      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #22c55e; }
          50% { opacity: 0.5; box-shadow: 0 0 12px #22c55e; }
        }
      `}</style>

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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
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
                    {hasUsedTrial ? '£4.99/month' : 'then £4.99/month'}
                  </p>

                  <p className="text-black text-center m-0 font-light" style={{ fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: '1.4' }}>
                    Includes all Ignite Insider features.<br />Billed monthly. Cancel anytime.
                  </p>
                </div>
              </div>

              {/* Right side - Stripe checkout */}
              <div style={{ width: '50%', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="relative overflow-y-auto flex items-center justify-center">
                <div
                  key={clientSecret}
                  ref={checkoutRef}
                  style={{
                    minHeight: '350px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    width: '100%'
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
