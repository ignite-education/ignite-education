import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DailyProvider,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useScreenShare,
  useDailyEvent,
  useLocalParticipant,
} from '@daily-co/daily-react';
import DailyIframe from '@daily-co/daily-js';
import { useAuth } from '../../contexts/AuthContext';
import VideoTile from './VideoTile';
import ControlBar from './ControlBar';
import ChatSidebar from './ChatSidebar';
import { Video } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

// Inner component that uses Daily hooks (must be inside DailyProvider)
const VideoRoom = ({ sessionId, onLeave, isCoach, userName }) => {
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const participantIds = useParticipantIds({ filter: 'remote' });
  const localParticipant = useLocalParticipant();
  const { screens } = useScreenShare();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [remoteLeft, setRemoteLeft] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const joinTimeRef = useRef(Date.now());
  const authTokenRef = useRef(null);

  // Track call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - joinTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Handle remote participant leaving
  useDailyEvent('participant-left', useCallback((event) => {
    if (event.participant && !event.participant.local) {
      setRemoteLeft(true);
    }
  }, []));

  // Handle meeting end
  useDailyEvent('left-meeting', useCallback(() => {
    onLeave();
  }, [onLeave]));

  const toggleMute = useCallback(() => {
    if (!daily) return;
    const newMuted = !isMuted;
    daily.setLocalAudio(!newMuted);
    setIsMuted(newMuted);
  }, [daily, isMuted]);

  const toggleCamera = useCallback(() => {
    if (!daily) return;
    const newOff = !isCameraOff;
    daily.setLocalVideo(!newOff);
    setIsCameraOff(newOff);
  }, [daily, isCameraOff]);

  const toggleScreenShare = useCallback(() => {
    if (!daily) return;
    if (isScreenSharing) {
      daily.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      daily.startScreenShare();
      setIsScreenSharing(true);
    }
  }, [daily, isScreenSharing]);

  const handleLeave = useCallback(async () => {
    if (!daily) return;
    // Notify backend
    const token = (await import('../../lib/supabase')).supabase.auth.session?.()?.access_token;
    try {
      const supabaseMod = await import('../../lib/supabase');
      const { data: { session: authSession } } = await supabaseMod.supabase.auth.getSession();
      if (authSession?.access_token) {
        if (isCoach) {
          await fetch(`${API_URL}/api/office-hours/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          });
        } else {
          await fetch(`${API_URL}/api/office-hours/leave`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          });
        }
      }
    } catch (err) {
      console.error('Error notifying backend on leave:', err);
    }
    daily.leave();
  }, [daily, sessionId, isCoach]);

  // Cache auth token for use in beforeunload (which must be synchronous)
  useEffect(() => {
    import('../../lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        authTokenRef.current = session?.access_token || null;
      });
    });
  }, []);

  // Cleanup on tab close — use fetch+keepalive instead of sendBeacon (supports auth headers)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = authTokenRef.current;
      if (!token) return;
      const endpoint = isCoach ? '/api/office-hours/end' : '/api/office-hours/leave';
      fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, isCoach]);

  const remoteId = participantIds[0];
  const hasScreenShare = screens.length > 0;

  if (remoteLeft) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d1a',
        gap: '20px',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(119,20,224,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Video size={36} color="#7714E0" />
        </div>
        <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 600 }}>
          {isCoach ? 'The student has left' : 'The coach has disconnected'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
          Session duration: {formatDuration(callDuration)}
        </p>
        <button
          onClick={() => window.close()}
          style={{
            marginTop: '8px',
            padding: '12px 32px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#7714E0',
            color: 'white',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0d0d1a',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
          }} />
          <span style={{ color: 'white', fontSize: '15px', fontWeight: 500 }}>
            Office Hours
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'monospace' }}>
          {formatDuration(callDuration)}
        </span>
      </div>

      {/* Video area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '12px',
        }}>
          {/* Main video grid */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: remoteId ? (hasScreenShare ? '1fr' : '1fr 1fr') : '1fr',
            gap: '12px',
            minHeight: 0,
          }}>
            {/* Screen share takes priority */}
            {hasScreenShare && (
              <div style={{ gridColumn: '1 / -1', height: '60%' }}>
                <VideoTile
                  sessionId={screens[0].session_id}
                  isLocal={screens[0].local}
                  userName="Screen Share"
                  isLarge
                />
              </div>
            )}

            {/* Remote participant (or waiting state) */}
            {remoteId ? (
              <VideoTile
                sessionId={remoteId}
                isLocal={false}
                userName=""
                isLarge={!hasScreenShare}
              />
            ) : (
              <div style={{
                borderRadius: '16px',
                backgroundColor: '#1a1a2e',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}>
                <div className="animate-pulse" style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(119,20,224,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Video size={28} color="#7714E0" />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
                  {isCoach ? 'Waiting for a student to join...' : 'Connecting...'}
                </p>
              </div>
            )}

            {/* Local participant (small when screen sharing) */}
            {localSessionId && (
              <div style={hasScreenShare ? {
                position: 'absolute',
                bottom: '100px',
                right: isChatOpen ? '340px' : '24px',
                width: '200px',
                height: '150px',
                zIndex: 10,
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                transition: 'right 0.2s',
              } : {}}>
                <VideoTile
                  sessionId={localSessionId}
                  isLocal
                  userName={userName}
                  isLarge={!hasScreenShare && !remoteId}
                />
              </div>
            )}
          </div>

          {/* Control bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: '8px',
          }}>
            <ControlBar
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              isChatOpen={isChatOpen}
              onToggleMute={toggleMute}
              onToggleCamera={toggleCamera}
              onToggleScreenShare={toggleScreenShare}
              onToggleChat={() => setIsChatOpen(prev => !prev)}
              onLeave={handleLeave}
              isCoach={isCoach}
            />
          </div>
        </div>

        {/* Chat sidebar */}
        {isChatOpen && (
          <ChatSidebar
            onClose={() => setIsChatOpen(false)}
            localUserName={userName}
          />
        )}
      </div>
    </div>
  );
};

// Outer component that handles joining logic and wraps with DailyProvider
const VideoChat = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, isInsider, firstName } = useAuth();

  const [state, setState] = useState('loading'); // loading | joining | joined | error | ended
  const [error, setError] = useState('');
  const [callObject, setCallObject] = useState(null);
  const [isCoach, setIsCoach] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!sessionId || !user) return;

    const joinSession = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession?.access_token) {
          setError('Authentication required');
          setState('error');
          return;
        }

        // Check for coach token in URL params (passed from admin app "Go Live")
        const urlParams = new URLSearchParams(window.location.search);
        const coachToken = urlParams.get('token');

        if (coachToken) {
          // Coach flow — use token + roomUrl from URL params (passed from admin "Go Live")
          const roomUrl = urlParams.get('roomUrl');
          if (!roomUrl) {
            setError('Missing room URL. Please go live again from the admin app.');
            setState('error');
            return;
          }

          setUserName(firstName || 'Coach');
          setIsCoach(true);

          const newCallObject = DailyIframe.createCallObject({
            url: roomUrl,
            token: coachToken,
          });
          setCallObject(newCallObject);
          setState('joining');

          await newCallObject.join();
          setState('joined');
          return;
        }

        // Student flow — call /join to claim the session
        const joinRes = await fetch(`${API_URL}/api/office-hours/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        if (joinRes.ok) {
          const data = await joinRes.json();
          setUserName(firstName || 'Student');
          setIsCoach(false);

          const newCallObject = DailyIframe.createCallObject({
            url: data.roomUrl,
            token: data.token,
          });
          setCallObject(newCallObject);
          setState('joining');

          await newCallObject.join();
          setState('joined');
          return;
        }

        const joinError = await joinRes.json();

        // If 403 (not insider) or 409 (occupied/ended), show error
        if (joinRes.status === 403) {
          setError(joinError.error || 'Ignite Insider membership required');
          setState('error');
          return;
        }

        if (joinRes.status === 409) {
          setError(joinError.error || 'This session is not available');
          setState('error');
          return;
        }

        setError(joinError.error || 'Failed to join session');
        setState('error');
      } catch (err) {
        console.error('Error joining video chat:', err);
        setError('Failed to connect. Please try again.');
        setState('error');
      }
    };

    joinSession();

    return () => {
      if (callObject) {
        callObject.leave().catch(() => {});
        callObject.destroy().catch(() => {});
      }
    };
  }, [sessionId, user]);

  const handleLeave = useCallback(() => {
    setState('ended');
    if (callObject) {
      callObject.destroy().catch(() => {});
      setCallObject(null);
    }
  }, [callObject]);

  // Loading state
  if (state === 'loading' || state === 'joining') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d1a',
        gap: '20px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(119,20,224,0.3)',
          borderTopColor: '#7714E0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
          {state === 'loading' ? 'Connecting to session...' : 'Joining video call...'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d1a',
        gap: '16px',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239,68,68,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
        }}>
          <Video size={36} color="#ef4444" />
        </div>
        <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 600 }}>{error}</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          You can close this tab and try again from Progress Hub.
        </p>
        <button
          onClick={() => window.close()}
          style={{
            marginTop: '8px',
            padding: '10px 28px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'transparent',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Close Tab
        </button>
      </div>
    );
  }

  // Ended state
  if (state === 'ended') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0d0d1a',
        gap: '16px',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(119,20,224,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Video size={36} color="#7714E0" />
        </div>
        <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 600 }}>Session ended</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Thanks for using Ignite Office Hours!
        </p>
        <button
          onClick={() => window.close()}
          style={{
            marginTop: '8px',
            padding: '10px 28px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#7714E0',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    );
  }

  // Joined — render video room
  if (state === 'joined' && callObject) {
    return (
      <DailyProvider callObject={callObject}>
        <VideoRoom
          sessionId={sessionId}
          onLeave={handleLeave}
          isCoach={isCoach}
          userName={userName}
        />
      </DailyProvider>
    );
  }

  return null;
};

export default VideoChat;
