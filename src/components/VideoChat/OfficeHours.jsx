import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import {
  DailyProvider,
  useDaily,
  useLocalSessionId,
  useParticipantIds,
  useScreenShare,
  useDailyEvent,
} from '@daily-co/daily-react';
import { useAnimation } from '../../contexts/AnimationContext';
import CameraPreview from './CameraPreview';
import TopicForm from './TopicForm';
import QueueList from './QueueList';
import VideoTile from './VideoTile';
import ControlBar from './ControlBar';
import ChatSidebar from './ChatSidebar';
import Footer from '../Footer';
import { Video, Check, Mic, Camera, ThumbsUp, ThumbsDown, ArrowUp } from 'lucide-react';

const formatEndTime = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const hour = date.getHours();
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${period}`;
};

const API_URL = import.meta.env.VITE_API_URL || '';

const CALL_TIME_LIMIT = 5 * 60; // 5 minutes in seconds

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CoachCard = ({ coach }) => {
  const [hovered, setHovered] = useState(false);
  const linkedinUrl = coach.linkedin_url;

  const content = (
    <div
      style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: linkedinUrl ? 'pointer' : 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {coach.image_url && (
        <img
          src={coach.image_url}
          alt={coach.name}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '4px',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1,
          color: hovered && linkedinUrl ? '#EF0B72' : '#000',
          transition: 'color 0.15s',
        }}>
          {coach.name}
        </p>
        {coach.position && (
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 400, color: '#000', letterSpacing: '-0.01em' }}>
            {coach.position}
          </p>
        )}
        {coach.description && (
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 300, color: '#000', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
            {coach.description}
          </p>
        )}
      </div>
    </div>
  );

  if (linkedinUrl) {
    return (
      <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </a>
    );
  }

  return content;
};

// Read-only display of topic + question during connected state
// When sessionEnded, replaces End Session button/timer with feedback UI
const TopicSummary = ({ topic, question, onEndSession, callDuration, sessionEnded, sessionId, onDone }) => {
  const remaining = Math.max(CALL_TIME_LIMIT - callDuration, 0);
  const minsLeft = Math.ceil(remaining / 60);

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSelected, setFeedbackSelected] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const feedbackInputRef = useRef(null);

  // Auto-focus the feedback input when session ends
  useEffect(() => {
    if (sessionEnded && feedbackInputRef.current) {
      // Small delay to ensure the DOM has transitioned
      const timer = setTimeout(() => feedbackInputRef.current?.focus({ preventScroll: true }), 300);
      return () => clearTimeout(timer);
    }
  }, [sessionEnded]);

  const submitFeedback = async () => {
    if (!feedbackSelected) return;
    setFeedbackSent(true);
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch(`${API_URL}/api/office-hours/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId, rating: feedbackSelected, comment: feedbackComment.trim() || null }),
        });
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', flexShrink: 0, letterSpacing: '-0.01em', width: '80px' }}>
          Topic
        </span>
        <div style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: '0.875rem',
          borderRadius: '8px',
          backgroundColor: '#F6F6F6',
          color: '#111827',
          fontWeight: 300,
        }}>
          {topic || '\u00A0'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', flexShrink: 0, letterSpacing: '-0.01em', width: '80px', paddingTop: '8px' }}>
          Question
        </span>
        <div style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: '0.875rem',
          borderRadius: '8px',
          backgroundColor: '#F6F6F6',
          color: '#000',
          fontWeight: 300,
          lineHeight: 1.5,
          height: `calc(${5 * 1.5 * 0.875}rem + 16px)`,
          boxSizing: 'border-box',
          whiteSpace: 'pre-wrap',
          overflowY: 'auto',
        }}>
          {question || '\u00A0'}
        </div>
      </div>

      {/* Action row — End Session + timer, OR feedback prompt */}
      {sessionEnded ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginLeft: '92px', height: '40px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em', flexShrink: 0 }}>
            How did we do?
          </span>
          <button
            type="button"
            onClick={() => !feedbackSent && setFeedbackSelected('positive')}
            disabled={feedbackSent}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: feedbackSent ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!feedbackSent) e.currentTarget.querySelector('svg').style.color = '#EF0B72'; }}
            onMouseLeave={(e) => { if (!feedbackSent) e.currentTarget.querySelector('svg').style.color = feedbackSelected === 'positive' ? '#EF0B72' : '#333'; }}
          >
            <ThumbsUp size={18} strokeWidth={1.5} color={feedbackSelected === 'positive' ? '#EF0B72' : '#333'} style={{ transition: 'color 0.15s' }} />
          </button>
          <button
            type="button"
            onClick={() => !feedbackSent && setFeedbackSelected('negative')}
            disabled={feedbackSent}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: feedbackSent ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!feedbackSent) e.currentTarget.querySelector('svg').style.color = '#EF0B72'; }}
            onMouseLeave={(e) => { if (!feedbackSent) e.currentTarget.querySelector('svg').style.color = feedbackSelected === 'negative' ? '#EF0B72' : '#333'; }}
          >
            <ThumbsDown size={18} strokeWidth={1.5} color={feedbackSelected === 'negative' ? '#EF0B72' : '#333'} style={{ transition: 'color 0.15s' }} />
          </button>
          <div style={{
            flex: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 4px 4px 12px',
            borderRadius: '8px',
            backgroundColor: '#F6F6F6',
            minWidth: 0,
          }}>
            {feedbackSent ? (
              <span style={{
                flex: 1,
                padding: '4px 0',
                fontSize: '0.875rem',
                color: '#999',
                fontWeight: 300,
              }}>
                Submitted
              </span>
            ) : (
              <>
                <input
                  ref={feedbackInputRef}
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitFeedback(); } }}
                  placeholder=""
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: '0.875rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#000',
                    fontWeight: 300,
                    outline: 'none',
                    caretColor: '#EF0B72',
                    minWidth: 0,
                  }}
                />
                {feedbackComment.trim() && (
                  <button
                    type="button"
                    onClick={submitFeedback}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'black'; }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'black',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '92px' }}>
          <button
            type="button"
            onClick={onEndSession}
            style={{
              width: '200px',
              height: '40px',
              padding: 0,
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#FFAF00',
              color: 'white',
              cursor: 'pointer',
              transition: 'box-shadow 0.3s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            End Session
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333', letterSpacing: '-0.01em', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(callDuration)}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 300, color: remaining <= 60 ? '#ef4444' : '#333', letterSpacing: '-0.01em' }}>
              {remaining <= 0 ? 'End of allocated time' : `${minsLeft} min${minsLeft !== 1 ? 's' : ''} left in session`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Inner component that uses Daily hooks (must be inside DailyProvider)
const ConnectedView = ({ sessionId, queueEntryId, onLeave, isCoach, userName, topic, question, coach, endTimeFormatted, connectedAt }) => {
  const daily = useDaily();
  const localSessionId = useLocalSessionId();
  const participantIds = useParticipantIds({ filter: 'remote' });
  const { screens } = useScreenShare();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [remoteLeft, setRemoteLeft] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const sessionEndedRef = useRef(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const joinTimeRef = useRef(connectedAt ? new Date(connectedAt).getTime() : Date.now());
  const authTokenRef = useRef(null);

  const handleEndSessionRef = useRef(null);
  const chatMessagesRef = useRef([]);

  // Scroll to top when entering connected view
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Listen for coach kicking this student (queue entry → 'left')
  useEffect(() => {
    if (isCoach || !queueEntryId || sessionEnded) return;
    let channel;
    const setup = async () => {
      const { supabase } = await import('../../lib/supabase');
      channel = supabase
        .channel(`kick-${queueEntryId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'office_hours_queue',
          filter: `id=eq.${queueEntryId}`,
        }, (payload) => {
          if (payload.new.status === 'left' && !sessionEndedRef.current) {
            // Coach ended this student's session — trigger end flow
            sessionEndedRef.current = true;
            setSessionEnded(true);
            setRemoteLeft(true);
            if (daily) {
              daily.leave().catch(() => {});
            }
          }
        })
        .subscribe();
    };
    setup();
    return () => {
      if (channel) {
        import('../../lib/supabase').then(({ supabase }) => {
          supabase.removeChannel(channel);
        });
      }
    };
  }, [queueEntryId, isCoach, sessionEnded, daily]);

  // Track call duration and auto-end at limit
  useEffect(() => {
    if (sessionEnded) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - joinTimeRef.current) / 1000);
      setCallDuration(elapsed);
      if (elapsed >= CALL_TIME_LIMIT && handleEndSessionRef.current) {
        clearInterval(timer);
        handleEndSessionRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionEnded]);

  // Handle remote participant leaving
  useDailyEvent('participant-left', useCallback((event) => {
    if (event.participant && !event.participant.local) {
      setRemoteLeft(true);
    }
  }, []));

  // Handle meeting end — skip if user ended session (they stay on page for feedback)
  useDailyEvent('left-meeting', useCallback(() => {
    if (!sessionEndedRef.current) {
      onLeave();
    }
  }, [onLeave]));

  // Start local camera after session ends (for feedback screen)
  useEffect(() => {
    if (!sessionEnded) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [sessionEnded]);

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

  const handleEndSession = useCallback(async () => {
    if (!daily) return;
    // Set ref before async work so left-meeting handler sees it
    sessionEndedRef.current = true;
    setSessionEnded(true);
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
        // Persist chat log
        if (chatMessagesRef.current.length > 0) {
          const chatLog = chatMessagesRef.current.map(m => ({
            sender: m.sender,
            text: m.text,
            ts: m.timestamp?.toISOString?.() || m.timestamp,
          }));
          fetch(`${API_URL}/api/office-hours/chat-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({ sessionId, messages: chatLog }),
          }).catch(err => console.error('Error saving chat log:', err));
        }
      }
    } catch (err) {
      console.error('Error notifying backend on leave:', err);
    }
    daily.leave();
  }, [daily, sessionId, isCoach]);

  // Keep ref in sync for timer auto-end
  handleEndSessionRef.current = handleEndSession;

  // Cache auth token for use in beforeunload (which must be synchronous)
  useEffect(() => {
    import('../../lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        authTokenRef.current = session?.access_token || null;
      });
    });
  }, []);

  // Cleanup on tab close
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

  return (
    <>
      {/* Left column — 45% */}
      <div style={{ flex: '0 0 45%', minWidth: 0 }}>
        {/* Status row: Camera/Microphone indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '35px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em' }}>Camera</span>
              <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                {!isCameraOff && <Check size={16} color="#16a34a" strokeWidth={3} />}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em' }}>Microphone</span>
              <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                {!isMuted && <Check size={16} color="#16a34a" strokeWidth={3} />}
              </div>
            </div>
          </div>
        </div>

        {/* Video area */}
        <div style={{
          width: '100%',
          height: '40vh',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: sessionEnded ? '#f5f5f5' : '#1a1a2e',
          position: 'relative',
          transition: 'background-color 0.3s ease',
        }}>
          {sessionEnded ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
              }}
            />
          ) : remoteLeft ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <Video size={28} color="#7714E0" />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0, fontWeight: 300 }}>
                {isCoach ? 'The student has left' : 'The coach has disconnected'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', margin: 0 }}>
                {formatDuration(callDuration)}
              </p>
            </div>
          ) : hasScreenShare ? (
            <>
              <VideoTile
                sessionId={screens[0].session_id}
                isLocal={screens[0].local}
                userName="Screen Share"
                isLarge
                hideLabel
              />
              {localSessionId && (
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  width: '120px',
                  height: '90px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}>
                  <VideoTile sessionId={localSessionId} isLocal userName={userName} hideLabel />
                </div>
              )}
            </>
          ) : remoteId ? (
            <>
              <VideoTile sessionId={remoteId} isLocal={false} userName="" isLarge hideLabel />
              {localSessionId && (
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  width: '120px',
                  height: '90px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}>
                  <VideoTile sessionId={localSessionId} isLocal userName={userName} hideLabel />
                </div>
              )}
            </>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(119,20,224,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Video size={22} color="#7714E0" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>
                {isCoach ? 'Waiting for a student to join...' : 'Connecting...'}
              </p>
            </div>
          )}

          {/* Mute / Camera controls — hidden after session ends */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            display: sessionEnded ? 'none' : 'flex',
            gap: '8px',
            zIndex: 3,
          }}>
            <button
              onClick={toggleMute}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: 'white',
                color: isMuted ? '#EF0B72' : 'black',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Mic size={18} strokeWidth={1.5} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '28px',
                height: '2px',
                backgroundColor: '#EF0B72',
                borderRadius: '1px',
                transform: `translate(-50%, -50%) rotate(-45deg) scaleX(${isMuted ? 1 : 0})`,
                transition: 'transform 0.2s ease',
                transformOrigin: 'center',
              }} />
            </button>
            <button
              onClick={toggleCamera}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '3px',
                border: 'none',
                backgroundColor: 'white',
                color: isCameraOff ? '#EF0B72' : 'black',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Camera size={18} strokeWidth={1.5} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '28px',
                height: '2px',
                backgroundColor: '#EF0B72',
                borderRadius: '1px',
                transform: `translate(-50%, -50%) rotate(-45deg) scaleX(${isCameraOff ? 1 : 0})`,
                transition: 'transform 0.2s ease',
                transformOrigin: 'center',
              }} />
            </button>
          </div>
        </div>

        {/* Course Leader */}
        {coach && (
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
              Course Leader
            </h3>
            <CoachCard coach={coach} />
          </div>
        )}
      </div>

      {/* Right column — 55% */}
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopicSummary
          topic={topic}
          question={question}
          callDuration={callDuration}
          onEndSession={handleEndSession}
          sessionEnded={sessionEnded}
          sessionId={sessionId}
          onDone={onLeave}
        />
        <div style={{ marginTop: '28px', height: '300px', display: 'flex', flexDirection: 'column' }}>
          <ChatSidebar
            onClose={() => setIsChatOpen(false)}
            localUserName={userName}
            onMessagesChange={useCallback((msgs) => { chatMessagesRef.current = msgs; }, [])}
          />
        </div>
      </div>
    </>
  );
};

// Static mock of connected layout for local preview (no Daily hooks)
const ConnectedPreview = ({ feedbackPreview = false }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(feedbackPreview);

  // Sync with external toggle
  useEffect(() => {
    setSessionEnded(feedbackPreview);
  }, [feedbackPreview]);

  useEffect(() => {
    if (sessionEnded) return;
    const timer = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionEnded]);

  return (
    <>
      {/* Left column — 45% */}
      <div style={{ flex: '0 0 45%', minWidth: 0 }}>
        {/* Status row: Camera/Microphone indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '35px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em' }}>Camera</span>
              <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                <Check size={16} color="#16a34a" strokeWidth={3} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em' }}>Microphone</span>
              <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                <Check size={16} color="#16a34a" strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Video area */}
        <div style={{
          width: '100%',
          height: '40vh',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: sessionEnded ? '#f5f5f5' : '#1a1a2e',
          position: 'relative',
          transition: 'background-color 0.3s ease',
        }}>
          {sessionEnded ? (
            /* Mock local camera after session ends */
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#7714E0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 600,
                color: 'white',
              }}>
                Y
              </div>
            </div>
          ) : (
            <>
              {/* Mock remote video — dark placeholder */}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#7714E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 600,
                  color: 'white',
                }}>
                  M
                </div>
              </div>

              {/* Mock local PiP */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                width: '120px',
                height: '90px',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                zIndex: 2,
                backgroundColor: '#2a2a3e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#7714E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'white',
                }}>
                  Y
                </div>
              </div>

              {/* Mute / Camera controls (static preview) */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                display: 'flex',
                gap: '8px',
                zIndex: 3,
              }}>
                <button
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: 'white',
                    color: 'black',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mic size={18} strokeWidth={1.5} />
                </button>
                <button
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: 'white',
                    color: 'black',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={18} strokeWidth={1.5} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Course Leader */}
        <div style={{ marginTop: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
            Course Leader
          </h3>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <img
              src="https://auth.ignite.education/storage/v1/object/public/assets/_I4A4206%20(1).jpg"
              alt="Max Shillam"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '4px',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#000', letterSpacing: '-0.01em', lineHeight: 1 }}>
                Max Shillam
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 400, color: '#000', letterSpacing: '-0.01em' }}>
                Sr Program Manager at Amazon
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 300, color: '#000', lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                Max is a Senior PM at Amazon currently overseeing the development of the Technical Products customer experience across Search, Detail Page and Rufus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right column — 55% */}
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopicSummary
          topic="Design Thinking"
          question="How do I apply design thinking frameworks when working with cross-functional teams on tight deadlines?"
          callDuration={callDuration}
          onEndSession={() => setSessionEnded(true)}
          sessionEnded={sessionEnded}
          sessionId="preview"
          onDone={() => alert('[Preview] Close clicked')}
        />
        <div style={{ marginTop: '28px', height: '300px', display: 'flex', flexDirection: 'column' }}>
          <ChatSidebar
            onClose={() => {}}
            localUserName="You"
          />
        </div>
      </div>
    </>
  );
};

const OfficeHours = ({
  coaches, lessons, sessionEndTime, onJoin,
  queued, queueEntryId, sessionId, currentUserId,
  onAutoConnect, onLeaveQueue, initialQueue,
  connected, callObject, onLeave, isCoach, userName, connectedAt,
  connectedPreview, feedbackPreview,
}) => {
  const { lottieData } = useAnimation();
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);
  const [mediaReady, setMediaReady] = useState({ camera: false, mic: false });
  const [joining, setJoining] = useState(false);
  const [highlightCamera, setHighlightCamera] = useState(false);
  const [queue, setQueue] = useState(initialQueue || []);
  const [queuePosition, setQueuePosition] = useState(null);
  const [submittedTopic, setSubmittedTopic] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const channelRef = useRef(null);

  const coach = coaches?.[0] || null;
  const endTimeFormatted = formatEndTime(sessionEndTime);

  // Start Lottie animation after 2s delay
  useEffect(() => {
    if (lottieData && lottieRef.current) {
      const timer = setTimeout(() => {
        lottieRef.current?.play();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lottieData]);
  const formDisabled = joining;

  const handleJoin = async (topic, question) => {
    setJoining(true);
    setSubmittedTopic(topic);
    setSubmittedQuestion(question);
    const minDelay = new Promise(r => setTimeout(r, 500));
    try {
      await Promise.all([onJoin(topic, question), minDelay]);
    } catch {
      await minDelay;
      setJoining(false);
    }
  };

  // Compute display position from queue state
  const computePosition = useCallback((q) => {
    if (!currentUserId) return null;
    const active = q.filter(e => e.status === 'waiting' || e.status === 'connecting');
    const idx = active.findIndex(e => e.userId === currentUserId);
    return idx >= 0 ? idx + 1 : null;
  }, [currentUserId]);

  // Compute position from initial queue
  useEffect(() => {
    if (initialQueue?.length) {
      setQueuePosition(computePosition(initialQueue));
    }
  }, []);

  // Fetch initial queue and set up realtime subscription when queued
  useEffect(() => {
    if (!queued || !sessionId) return;

    let mounted = true;

    // Fetch initial queue
    const fetchQueue = async () => {
      try {
        const res = await fetch(`${API_URL}/api/office-hours/queue/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setQueue(data.queue);
            setQueuePosition(computePosition(data.queue));
          }
        }
      } catch (err) {
        console.error('Failed to fetch queue:', err);
      }
    };

    fetchQueue();

    // Set up Supabase realtime subscription
    const setupRealtime = async () => {
      const { supabase } = await import('../../lib/supabase');

      const channel = supabase
        .channel(`queue-${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'office_hours_queue',
          filter: `session_id=eq.${sessionId}`,
        }, (payload) => {
          if (!mounted) return;

          if (payload.eventType === 'INSERT') {
            // Re-fetch to get user details
            fetchQueue();
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;

            // If this user's entry changed to 'connecting', trigger auto-connect
            if (updated.user_id === currentUserId && updated.status === 'connecting') {
              if (onAutoConnect) onAutoConnect();
              return;
            }

            // If entry changed to 'left' or 'connected', remove from display
            if (updated.status === 'left' || updated.status === 'connected') {
              setQueue(prev => {
                const next = prev.filter(e => e.id !== updated.id);
                setQueuePosition(computePosition(next));
                return next;
              });
            } else {
              // Re-fetch to get accurate state
              fetchQueue();
            }
          } else if (payload.eventType === 'DELETE') {
            setQueue(prev => {
              const next = prev.filter(e => e.id !== payload.old.id);
              setQueuePosition(computePosition(next));
              return next;
            });
          }
        })
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (channelRef.current) {
        import('../../lib/supabase').then(({ supabase }) => {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        });
      }
    };
  }, [queued, sessionId, currentUserId, computePosition, onAutoConnect]);

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '30px 40px 0', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Lottie Logo */}
        <a href="/progress" style={{ display: 'block', width: 'fit-content', marginLeft: '-9px', flexShrink: 0 }}>
          {lottieData && Object.keys(lottieData).length > 0 ? (
            <Lottie
              lottieRef={lottieRef}
              animationData={lottieData}
              loop={true}
              autoplay={false}
              onLoopComplete={() => {
                loopCountRef.current += 1;
                if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                  lottieRef.current.pause();
                  setTimeout(() => {
                    lottieRef.current?.goToAndPlay(0);
                  }, 4000);
                }
              }}
              style={{ width: 61, height: 61 }}
            />
          ) : (
            <div style={{ width: 61, height: 61 }} />
          )}
        </a>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '61px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#111', margin: 0, lineHeight: 1, letterSpacing: '-0.02em', marginTop: '6px' }}>
            Office Hours
          </h1>
          {endTimeFormatted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '6.4px',
                height: '6.4px',
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                boxShadow: '0 0 5px #16a34a',
                animation: 'pulse-green 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '0.9rem', color: '#000', fontWeight: 300, letterSpacing: '-0.01em' }}>
                Live Now
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'flex',
        padding: '32px 40px 48px',
        gap: '48px',
      }}>
        {connectedPreview ? (
          <ConnectedPreview feedbackPreview={feedbackPreview} />
        ) : connected && callObject ? (
          <DailyProvider callObject={callObject}>
            <ConnectedView
              sessionId={sessionId}
              queueEntryId={queueEntryId}
              onLeave={onLeave}
              isCoach={isCoach}
              userName={userName}
              topic={submittedTopic}
              question={submittedQuestion}
              coach={coach}
              endTimeFormatted={endTimeFormatted}
              connectedAt={connectedAt}
            />
          </DailyProvider>
        ) : (
          <>
            {/* Left column — 45% */}
            <div style={{ flex: '0 0 45%', minWidth: 0 }}>
              <CameraPreview onReadyChange={setMediaReady} highlight={highlightCamera} endTimeFormatted={endTimeFormatted} />

              {/* Course Leader */}
              {coach && (
                <div style={{ marginTop: '28px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                    Course Leader
                  </h3>
                  <CoachCard coach={coach} />
                </div>
              )}
            </div>

            {/* Right column — 55%, top-aligned with camera preview box */}
            <div style={{ flex: '1 1 0', minWidth: 0, paddingTop: '32px', display: 'flex', flexDirection: 'column' }}>
              <TopicForm
                lessons={lessons}
                onJoin={handleJoin}
                disabled={formDisabled}
                mediaReady={mediaReady}
                onMediaInvalid={() => {
                  setHighlightCamera(true);
                  setTimeout(() => setHighlightCamera(false), 1300);
                }}
                readOnly={queued}
                queuePosition={queuePosition}
              />

              {/* Queue list */}
              {queued && (
                <QueueList queue={queue} currentUserId={currentUserId} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer — pushed to bottom on short pages */}
      <div style={{ marginTop: 'auto' }}>
        <Footer />
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 25% { opacity: 1; box-shadow: 0 0 6px #16a34a; }
          37% { opacity: 0.4; box-shadow: 0 0 12px #16a34a; }
          50%, 100% { opacity: 1; box-shadow: 0 0 6px #16a34a; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default OfficeHours;
