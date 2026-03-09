import { useState, useEffect } from 'react';
import { Video, VideoOff, Clock, Users, ExternalLink, CalendarPlus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const OfficeHours = () => {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [pastSessions, setPastSessions] = useState([]);
  const [scheduledSlots, setScheduledSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Schedule form state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Fetch current status, history, and schedule
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await getAuthToken();
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };

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

  // Elapsed timer for active session
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }
    const startTime = new Date(activeSession.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // Realtime updates for session status
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
        } else {
          setActiveSession(prev => ({ ...prev, status: row.status, student_id: row.student_id }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeSession?.id]);

  const handleGoLive = async () => {
    setStarting(true);
    setError('');
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/office-hours/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to start session');
        return;
      }

      const data = await res.json();
      setActiveSession(data.session);

      // Open video chat in a new tab (pass roomUrl so VideoChat doesn't need an extra API call)
      window.open(`https://ignite.education/office-hours/${data.session.id}?token=${data.token}&roomUrl=${encodeURIComponent(data.session.daily_room_url)}`, '_blank');
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
      const token = await getAuthToken();
      await fetch(`${API_URL}/api/office-hours/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
      setPastSessions(prev => [{ ...activeSession, status: 'ended', ended_at: new Date().toISOString() }, ...prev]);
      setActiveSession(null);
    } catch (err) {
      console.error('Error ending session:', err);
    } finally {
      setEnding(false);
    }
  };

  const handleRejoin = async () => {
    if (!activeSession) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/office-hours/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        window.open(
          `https://ignite.education/office-hours/${data.session.id}?token=${data.token}&roomUrl=${encodeURIComponent(data.session.daily_room_url)}`,
          '_blank'
        );
      } else {
        setError('Failed to rejoin session. Try ending and starting a new one.');
      }
    } catch (err) {
      console.error('Error rejoining office hours:', err);
      setError('Failed to rejoin. Please try again.');
    }
  };

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
      const token = await getAuthToken();
      const res = await fetch(`${API_URL}/api/office-hours/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await getAuthToken();
      await fetch(`${API_URL}/api/office-hours/schedule/${slotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setScheduledSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error('Error deleting slot:', err);
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatScheduleSlot = (slot) => {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    const dateStr = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const startTime = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${startTime} - ${endTime}`;
  };

  const getSessionDuration = (session) => {
    if (!session.ended_at || !session.started_at) return '-';
    const diff = Math.floor((new Date(session.ended_at) - new Date(session.started_at)) / 1000);
    return formatDuration(diff);
  };

  // Get today's date as YYYY-MM-DD for the min attribute
  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Office Hours</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Active Session Card */}
      <div className="mb-8 p-6 rounded-xl border border-gray-700/50 bg-gray-800/50">
        {activeSession ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  activeSession.status === 'occupied' ? 'bg-yellow-400' : 'bg-green-500 animate-pulse'
                }`} />
                <span className="text-lg font-medium">
                  {activeSession.status === 'occupied' ? 'In Session with Student' : 'Live \u2014 Waiting for Student'}
                </span>
              </div>
              <span className="text-gray-400 font-mono text-lg">{formatDuration(elapsed)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRejoin}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink size={16} />
                Open Video Chat
              </button>
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                <VideoOff size={16} />
                {ending ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <Video size={28} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start Office Hours</h3>
            <p className="text-gray-400 text-sm mb-5">
              Go live to let students join you for a 1:1 video session.
            </p>
            <button
              onClick={handleGoLive}
              disabled={starting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Video size={18} />
              {starting ? 'Starting...' : 'Go Live'}
            </button>
          </div>
        )}
      </div>

      {/* Upcoming Schedule */}
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <CalendarPlus size={18} className="text-gray-400" />
          Upcoming Schedule
        </h2>

        {/* Add slot form */}
        <div className="flex items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={scheduleDate}
              min={todayStr}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start</label>
            <input
              type="time"
              value={scheduleStartTime}
              onChange={(e) => setScheduleStartTime(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End</label>
            <input
              type="time"
              value={scheduleEndTime}
              onChange={(e) => setScheduleEndTime(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleAddSlot}
            disabled={addingSlot}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <CalendarPlus size={15} />
            {addingSlot ? 'Adding...' : 'Add'}
          </button>
        </div>

        {/* Scheduled slots list */}
        {scheduledSlots.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming sessions scheduled.</p>
        ) : (
          <div className="space-y-2">
            {scheduledSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-700/50 bg-gray-800/30"
              >
                <span className="text-sm text-gray-300">{formatScheduleSlot(slot)}</span>
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Remove"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Clock size={18} className="text-gray-400" />
          Past Sessions
        </h2>

        {pastSessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No past sessions yet.</p>
        ) : (
          <div className="border border-gray-700/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-gray-400">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium">Student</th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-700/30 last:border-0">
                    <td className="p-3 text-gray-300">{formatDate(session.started_at)}</td>
                    <td className="p-3 text-gray-300 font-mono">{getSessionDuration(session)}</td>
                    <td className="p-3 text-gray-400">
                      {session.student_id ? (
                        <span className="flex items-center gap-1.5">
                          <Users size={14} />
                          Student joined
                        </span>
                      ) : (
                        <span className="text-gray-500">No student joined</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficeHours;
