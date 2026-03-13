import { useState, useEffect, useCallback } from 'react';
import { DailyProvider } from '@daily-co/daily-react';
import DailyIframe from '@daily-co/daily-js';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import SessionControl from './SessionControl';
import VideoPanel from './VideoPanel';
import StudentQueue from './StudentQueue';
import ScheduleManager from './ScheduleManager';
import PastSessions from './PastSessions';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const OfficeHours = () => {
  const { user } = useAuth();

  // Session state
  const [activeSession, setActiveSession] = useState(null);
  const [pastSessions, setPastSessions] = useState([]);
  const [scheduledSlots, setScheduledSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Daily.co state
  const [callObject, setCallObject] = useState(null);
  const [callToken, setCallToken] = useState(null);
  const [roomUrl, setRoomUrl] = useState(null);

  // Queue state
  const [queue, setQueue] = useState([]);
  const [admitting, setAdmitting] = useState(null);
  const [kicking, setKicking] = useState(false);

  // Session control state
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  // Schedule form state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const authHeaders = async () => {
    const token = await getAuthToken();
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  };

  // --- Data fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = await authHeaders();
        const [historyRes, scheduleRes] = await Promise.all([
          fetch(`${API_URL}/api/office-hours/history`, { headers }),
          fetch(`${API_URL}/api/office-hours/schedule`, { headers }),
        ]);

        if (historyRes.ok) {
          const data = await historyRes.json();
          const sessions = data.sessions || [];
          const active = sessions.find(s => s.status === 'live' || s.status === 'occupied');
          setActiveSession(active || null);
          setPastSessions(sessions.filter(s => s.status === 'ended').slice(0, 20));
        }

        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          setScheduledSlots(data.slots || []);
        }
      } catch (err) {
        console.error('Error fetching office hours data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Elapsed timer ---
  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const startTime = new Date(activeSession.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // --- Realtime: session status ---
  useEffect(() => {
    if (!activeSession) return;
    const channel = supabase
      .channel('admin-office-hours')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'office_hours_sessions',
        filter: `id=eq.${activeSession.id}`,
      }, (payload) => {
        const row = payload.new;
        if (row.status === 'ended') {
          setActiveSession(null);
          setPastSessions(prev => [{ ...row, status: 'ended' }, ...prev]);
          destroyCall();
        } else {
          setActiveSession(prev => ({ ...prev, ...row }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSession?.id]);

  // --- Realtime: queue ---
  useEffect(() => {
    if (!activeSession) { setQueue([]); return; }
    fetchQueue();
    const channel = supabase
      .channel('admin-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'office_hours_queue',
        filter: `session_id=eq.${activeSession.id}`,
      }, () => {
        fetchQueue();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSession?.id]);

  const fetchQueue = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`${API_URL}/api/office-hours/queue/${activeSession.id}`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  // --- Daily.co call management ---
  const createCall = async (url, token) => {
    const newCallObject = DailyIframe.createCallObject({
      dailyConfig: { experimentalChromeVideoMuteLightOff: true },
    });
    setCallObject(newCallObject);
    setCallToken(token);
    setRoomUrl(url);
    // Join immediately with audio/video enabled
    await newCallObject.join({
      url,
      token,
      startVideoOff: false,
      startAudioOff: false,
    }).catch(err => console.error('Failed to join Daily call:', err));
  };

  const destroyCall = () => {
    if (callObject) {
      callObject.leave().catch(() => {});
      callObject.destroy().catch(() => {});
    }
    setCallObject(null);
    setCallToken(null);
    setRoomUrl(null);
  };

  // --- Handlers ---
  const handleGoLive = async () => {
    setStarting(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/office-hours/start`, { method: 'POST', headers });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start session');
        return;
      }

      const data = await res.json();
      setActiveSession(data.session);
      createCall(data.session.daily_room_url, data.token);
    } catch (err) {
      console.error('Error starting office hours:', err);
      setError('Failed to start session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setEnding(true);
    try {
      const headers = await authHeaders();
      await fetch(`${API_URL}/api/office-hours/end`, {
        method: 'POST', headers,
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
      setPastSessions(prev => [{ ...activeSession, status: 'ended', ended_at: new Date().toISOString() }, ...prev]);
      setActiveSession(null);
      setQueue([]);
      destroyCall();
    } catch (err) {
      console.error('Error ending session:', err);
    } finally {
      setEnding(false);
    }
  };

  const handleAdmit = async (queueEntryId) => {
    setAdmitting(queueEntryId);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/office-hours/queue/admit`, {
        method: 'POST', headers,
        body: JSON.stringify({ sessionId: activeSession.id, queueEntryId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to admit student');
      }
      await fetchQueue();
    } catch (err) {
      console.error('Error admitting student:', err);
      setError('Failed to admit student');
    } finally {
      setAdmitting(null);
    }
  };

  const handleKick = async (queueEntryId) => {
    setKicking(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/office-hours/queue/kick`, {
        method: 'POST', headers,
        body: JSON.stringify({ sessionId: activeSession.id, queueEntryId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to end student session');
      }
      await fetchQueue();
    } catch (err) {
      console.error('Error kicking student:', err);
      setError('Failed to end student session');
    } finally {
      setKicking(false);
    }
  };

  // --- Schedule handlers ---
  const handleAddSlot = async () => {
    if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      setError('Please fill in date, start time, and end time');
      return;
    }
    const startsAt = new Date(`${scheduleDate}T${scheduleStartTime}`).toISOString();
    const endsAt = new Date(`${scheduleDate}T${scheduleEndTime}`).toISOString();
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('End time must be after start time');
      return;
    }
    setAddingSlot(true);
    setError('');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/office-hours/schedule`, {
        method: 'POST', headers,
        body: JSON.stringify({ startsAt, endsAt }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to schedule');
        return;
      }
      const data = await res.json();
      setScheduledSlots(prev => [...prev, data.slot].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)));
      setScheduleDate('');
      setScheduleStartTime('');
      setScheduleEndTime('');
    } catch (err) {
      console.error('Error scheduling:', err);
      setError('Failed to schedule. Please try again.');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      const headers = await authHeaders();
      await fetch(`${API_URL}/api/office-hours/schedule/${slotId}`, {
        method: 'DELETE', headers,
      });
      setScheduledSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error('Error deleting slot:', err);
    }
  };

  // --- Helpers ---
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const coachName = user?.user_metadata?.first_name || 'Coach';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Office Hours</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Session Control (always visible) */}
      <div className="mb-6">
        <SessionControl
          activeSession={activeSession}
          elapsed={elapsed}
          starting={starting}
          ending={ending}
          onGoLive={handleGoLive}
          onEndSession={handleEndSession}
          formatDuration={formatDuration}
        />
      </div>

      {/* Video + Queue (only when session is active) */}
      {activeSession && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            {callObject ? (
              <DailyProvider callObject={callObject}>
                <VideoPanel
                  onLeave={handleEndSession}
                  coachName={coachName}
                />
              </DailyProvider>
            ) : (
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 flex items-center justify-center" style={{ height: '520px' }}>
                <p className="text-gray-500">Connecting to video...</p>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <StudentQueue
              queue={queue}
              activeSession={activeSession}
              admitting={admitting}
              kicking={kicking}
              onAdmit={handleAdmit}
              onKick={handleKick}
            />
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="mb-8">
        <ScheduleManager
          scheduledSlots={scheduledSlots}
          scheduleDate={scheduleDate}
          scheduleStartTime={scheduleStartTime}
          scheduleEndTime={scheduleEndTime}
          onDateChange={setScheduleDate}
          onStartTimeChange={setScheduleStartTime}
          onEndTimeChange={setScheduleEndTime}
          onAddSlot={handleAddSlot}
          onDeleteSlot={handleDeleteSlot}
          addingSlot={addingSlot}
          todayStr={todayStr}
        />
      </div>

      {/* Past Sessions */}
      <PastSessions pastSessions={pastSessions} />
    </div>
  );
};

export default OfficeHours;
