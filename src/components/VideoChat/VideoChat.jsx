import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import DailyIframe from '@daily-co/daily-js';
import { useAuth } from '../../contexts/AuthContext';
import OfficeHours from './OfficeHours';
import CameraPreview from './CameraPreview';
import { getLessonsMetadata, getCoachesForCourse } from '../../lib/api';
import { Video } from 'lucide-react';
import LoadingScreen from '../LoadingScreen';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const VideoChat = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, isInsider, firstName } = useAuth();

  useEffect(() => { document.title = 'Office Hours | Ignite'; }, []);

  const [state, setState] = useState('loading'); // loading | lobby | queued | joining | joined | error | ended
  const [error, setError] = useState('');
  const [callObject, setCallObject] = useState(null);
  const callObjectRef = useRef(null);
  const [isCoach, setIsCoach] = useState(false);
  const [userName, setUserName] = useState('');

  // Lobby data
  const [coaches, setCoaches] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [sessionEndTime, setSessionEndTime] = useState(null);

  // Queue data
  const [queueEntryId, setQueueEntryId] = useState(null);
  const queueEntryIdRef = useRef(null);

  // Initial setup: coach flow goes straight to call, student flow loads lobby data
  // Use user.id as dependency (not user object) to avoid re-running when Supabase refreshes the session on tab focus
  const userId = user?.id;
  useEffect(() => {
    if (!sessionId || !userId) return;

    // Destroy any previous Daily instance before creating a new one
    if (callObjectRef.current) {
      callObjectRef.current.leave().catch(() => {});
      callObjectRef.current.destroy().catch(() => {});
      callObjectRef.current = null;
      setCallObject(null);
    }

    let cancelled = false;

    const init = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!authSession?.access_token) {
          setError('Authentication required');
          setState('error');
          return;
        }

        // Check for coach token in URL params (passed from admin app "Go Live")
        const coachToken = searchParams.get('token');

        if (coachToken) {
          // Coach flow — bypass lobby, join directly
          const roomUrl = searchParams.get('roomUrl');
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
          callObjectRef.current = newCallObject;
          setCallObject(newCallObject);
          setState('joining');

          if (cancelled) { newCallObject.destroy().catch(() => {}); return; }
          await newCallObject.join();
          if (cancelled) return;
          setState('joined');
          return;
        }

        // Student flow — load lobby data
        let courseId = searchParams.get('courseId');

        // If no courseId in URL, fetch from session endpoint
        if (!courseId) {
          const sessionRes = await fetch(`${API_URL}/api/office-hours/session/${sessionId}`);
          if (cancelled) return;
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            courseId = sessionData.session?.course_id;
            if (sessionData.endTime) setSessionEndTime(sessionData.endTime);
            if (sessionData.session?.coach) setCoaches([sessionData.session.coach]);
          }
        }

        if (cancelled) return;

        if (courseId) {
          // Fetch lobby data in parallel
          const [lessonsData, coachesData, statusData] = await Promise.all([
            getLessonsMetadata(courseId).catch(() => []),
            getCoachesForCourse(courseId).catch(() => []),
            fetch(`${API_URL}/api/office-hours/status/${encodeURIComponent(courseId)}`)
              .then(r => r.json())
              .catch(() => ({})),
          ]);

          if (cancelled) return;

          if (lessonsData?.length) setLessons(lessonsData);
          if (coachesData?.length) setCoaches(coachesData);

          // Get end time from the schedule entry that covers now
          if (statusData.upcoming?.length > 0) {
            const now = new Date();
            const activeSlot = statusData.upcoming.find(s =>
              new Date(s.starts_at) <= now && new Date(s.ends_at) >= now
            );
            if (activeSlot) {
              setSessionEndTime(activeSlot.ends_at);
            } else if (!sessionEndTime) {
              // Use the next upcoming slot's ends_at as fallback
              setSessionEndTime(statusData.upcoming[0].ends_at);
            }
          }
        }

        if (cancelled) return;

        // Check for existing queue entry (recovery after refresh/tab close)
        try {
          const recoveryRes = await fetch(`${API_URL}/api/office-hours/queue/my-entry/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${authSession.access_token}` },
          });
          if (cancelled) return;
          if (recoveryRes.ok) {
            const { entry } = await recoveryRes.json();
            if (entry) {
              setQueueEntryId(entry.id);
              queueEntryIdRef.current = entry.id;

              if (entry.status === 'connected' || entry.status === 'connecting') {
                // Reconnect to the active call
                setState('joining');
                try {
                  if (CameraPreview.stopStream) CameraPreview.stopStream();
                  const connectRes = await fetch(`${API_URL}/api/office-hours/queue/connect`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${authSession.access_token}`,
                    },
                    body: JSON.stringify({ sessionId, queueEntryId: entry.id }),
                  });
                  if (cancelled) return;
                  if (connectRes.ok) {
                    const data = await connectRes.json();
                    setUserName(firstName || 'Student');
                    setIsCoach(false);
                    const newCallObject = DailyIframe.createCallObject({
                      url: data.roomUrl,
                      token: data.token,
                    });
                    callObjectRef.current = newCallObject;
                    setCallObject(newCallObject);
                    if (cancelled) { newCallObject.destroy().catch(() => {}); return; }
                    await newCallObject.join();
                    if (cancelled) return;
                    setState('joined');
                    return;
                  }
                  // If connect returns 409, entry may no longer be valid — fall to queued
                  console.warn('Reconnection connect failed, entering queue');
                  setState('queued');
                  return;
                } catch (e) {
                  if (cancelled) return;
                  console.warn('Reconnection failed, entering queue:', e);
                  setState('queued');
                  return;
                }
              }

              if (entry.status === 'waiting') {
                setState('queued');
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Recovery check failed:', e);
        }

        if (cancelled) return;
        setState('lobby');
      } catch (err) {
        if (cancelled) return;
        console.error('Error initializing office hours:', err);
        setError('Failed to connect. Please try again.');
        setState('error');
      }
    };

    init();

    return () => {
      cancelled = true;
      if (callObjectRef.current) {
        callObjectRef.current.leave().catch(() => {});
        callObjectRef.current.destroy().catch(() => {});
        callObjectRef.current = null;
      }
    };
  }, [sessionId, userId]);

  // Connect to Daily.co call (used by both direct auto-connect and queue auto-connect)
  const connectToCall = useCallback(async (entryId) => {
    try {
      if (CameraPreview.stopStream) CameraPreview.stopStream();

      const { supabase } = await import('../../lib/supabase');
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        setError('Authentication required');
        setState('error');
        return;
      }

      const connectRes = await fetch(`${API_URL}/api/office-hours/queue/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ sessionId, queueEntryId: entryId }),
      });

      if (connectRes.ok) {
        const data = await connectRes.json();
        setUserName(firstName || 'Student');
        setIsCoach(false);

        const newCallObject = DailyIframe.createCallObject({
          url: data.roomUrl,
          token: data.token,
        });
        callObjectRef.current = newCallObject;
        setCallObject(newCallObject);

        await newCallObject.join();
        setState('joined');
        return;
      }

      const connectError = await connectRes.json();
      if (connectRes.status === 409) {
        // Not our turn yet or session busy — stay in queue
        console.log('Connect failed (409), staying in queue:', connectError.error);
        return;
      }

      setError(connectError.error || 'Failed to connect');
      setState('error');
    } catch (err) {
      console.error('Error connecting to call:', err);
      setError('Failed to connect. Please try again.');
      setState('error');
    }
  }, [sessionId, firstName]);

  // Handle join from lobby — enters the queue
  const handleJoinFromLobby = useCallback(async (topic, question) => {
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        setError('Authentication required');
        setState('error');
        return;
      }

      const joinRes = await fetch(`${API_URL}/api/office-hours/queue/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ sessionId, topic, question }),
      });

      if (joinRes.ok) {
        const data = await joinRes.json();
        setQueueEntryId(data.queueEntryId);
        queueEntryIdRef.current = data.queueEntryId;

        if (data.autoConnect) {
          // First in line and coach is free — connect immediately
          await connectToCall(data.queueEntryId);
        } else {
          // Enter queue view
          setState('queued');
        }
        return;
      }

      const joinError = await joinRes.json();

      if (joinRes.status === 403) {
        setError(joinError.error || 'Ignite Insider membership required');
        setState('error');
        return;
      }

      if (joinRes.status === 409) {
        setError(joinError.error || 'This session is no longer available.');
        setState('error');
        return;
      }

      setError(joinError.error || 'Failed to join queue');
      setState('error');
    } catch (err) {
      console.error('Error joining queue:', err);
      setError('Failed to connect. Please try again.');
      setState('error');
      throw err; // Re-throw so Lobby can reset its joining state
    }
  }, [sessionId, connectToCall]);

  // Auto-connect callback — called by Lobby when realtime signals it's this student's turn
  const handleAutoConnect = useCallback(() => {
    const entryId = queueEntryIdRef.current;
    if (entryId) {
      connectToCall(entryId);
    }
  }, [connectToCall]);

  const handleLeave = useCallback(async () => {
    // Explicitly leave the queue/session — only called when user clicks "end session"
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.access_token && queueEntryIdRef.current && sessionId) {
        await fetch(`${API_URL}/api/office-hours/queue/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }
    } catch (e) { /* best effort */ }
    setState('ended');
    if (callObjectRef.current) {
      callObjectRef.current.destroy().catch(() => {});
      callObjectRef.current = null;
      setCallObject(null);
    }
  }, [sessionId]);

  // Loading state
  if (state === 'loading' || state === 'joining') {
    return <LoadingScreen />;
  }

  // Office Hours page — lobby, queued, and connected states
  if (state === 'lobby' || state === 'queued' || (state === 'joined' && callObject)) {
    return (
      <OfficeHours
        coaches={coaches}
        lessons={lessons}
        sessionEndTime={sessionEndTime}
        onJoin={handleJoinFromLobby}
        queued={state === 'queued'}
        queueEntryId={queueEntryId}
        sessionId={sessionId}
        currentUserId={user?.id}
        onAutoConnect={handleAutoConnect}
        connected={state === 'joined'}
        callObject={callObject}
        onLeave={handleLeave}
        isCoach={isCoach}
        userName={userName}
      />
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

  // Offline / fallback state
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      gap: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <a href="/progress" style={{ display: 'block' }}>
        <img
          src="https://auth.ignite.education/storage/v1/object/public/assets/Ignite%20Logo%20V2%20-%20Black.png"
          alt="Ignite"
          style={{ width: '80px', height: '80px', objectFit: 'contain' }}
        />
      </a>
      <p style={{
        color: '#666',
        fontSize: '15px',
        fontWeight: 400,
        textAlign: 'center',
        maxWidth: '360px',
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      }}>
        We're offline. Head back to the{' '}
        <a href="/progress" style={{ color: '#EF0B72', textDecoration: 'none', fontWeight: 500 }}>Progress Hub</a>
        {' '}to see upcoming Office Hours availability.
      </p>
    </div>
  );
};

export default VideoChat;
