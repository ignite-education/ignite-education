import { useState, useEffect, useRef } from 'react';
import { Users, Play, Square } from 'lucide-react';

const CALL_TIME_LIMIT = 5 * 60; // 5 minutes in seconds

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const SessionTimer = ({ connectedEntryId, connectedAt }) => {
  const getStartTime = () => connectedAt ? new Date(connectedAt).getTime() : Date.now();
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - getStartTime()) / 1000));
  const startTimeRef = useRef(getStartTime());
  const prevEntryIdRef = useRef(connectedEntryId);

  // Reset timer when a new student connects
  useEffect(() => {
    if (connectedEntryId !== prevEntryIdRef.current) {
      prevEntryIdRef.current = connectedEntryId;
      const t = connectedAt ? new Date(connectedAt).getTime() : Date.now();
      startTimeRef.current = t;
      setElapsed(Math.floor((Date.now() - t) / 1000));
    }
  }, [connectedEntryId, connectedAt]);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(CALL_TIME_LIMIT - elapsed, 0);
  const minsLeft = Math.ceil(remaining / 60);

  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-500/10">
      <span className="text-xs font-mono text-gray-400">{formatDuration(elapsed)}</span>
      <span className={`text-xs ${remaining <= 60 ? 'text-red-400' : 'text-gray-500'}`}>
        {remaining <= 0 ? 'End of allocated time' : `${minsLeft} min${minsLeft !== 1 ? 's' : ''} left`}
      </span>
    </div>
  );
};

const StudentQueue = ({ queue, activeSession, admitting, kicking, onAdmit, onKick }) => {
  const connectedEntry = queue.find(e => e.status === 'connected' || e.status === 'connecting');
  const waitingEntries = queue.filter(e => e.status === 'waiting');
  const isOccupied = activeSession?.status === 'occupied';

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 flex flex-col" style={{ height: '520px' }}>
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="font-medium flex items-center gap-2">
          <Users size={16} className="text-gray-400" />
          Student Queue
        </h3>
        {queue.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {queue.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {/* Connected student */}
        {connectedEntry && (
          <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">Connected</span>
              </div>
              <button
                onClick={() => onKick(connectedEntry.id)}
                disabled={kicking}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Square size={10} />
                {kicking ? 'Ending...' : 'End'}
              </button>
            </div>
            <StudentCard entry={connectedEntry} />
            <SessionTimer connectedEntryId={connectedEntry.id} connectedAt={connectedEntry.connectedAt} />
          </div>
        )}

        {/* Waiting students */}
        {waitingEntries.map((entry, i) => (
          <div key={entry.id} className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">#{i + 1}</span>
              <button
                onClick={() => onAdmit(entry.id)}
                disabled={isOccupied || admitting === entry.id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={isOccupied ? 'End current student session first' : 'Admit this student'}
              >
                <Play size={10} />
                {admitting === entry.id ? 'Starting...' : 'Start'}
              </button>
            </div>
            <StudentCard entry={entry} />
          </div>
        ))}

        {queue.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600">
            <Users size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No students in queue</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentCard = ({ entry }) => {
  const initials = `${(entry.firstName || '?')[0]}${(entry.lastName || '')[0] || ''}`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {entry.profilePicture ? (
          <img src={entry.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-medium text-purple-300">
            {initials}
          </div>
        )}
        <div>
          <span className="text-sm font-medium text-gray-200">
            {entry.firstName} {entry.lastName}
          </span>
          {entry.country && (
            <span className="ml-1.5 text-xs text-gray-500">{entry.country}</span>
          )}
        </div>
      </div>
      {entry.topic && (
        <div className="mb-1">
          <span className="text-xs text-gray-500">Topic: </span>
          <span className="text-xs text-gray-300">{entry.topic}</span>
        </div>
      )}
      {entry.question && (
        <div>
          <span className="text-xs text-gray-500">Question: </span>
          <span className="text-xs text-gray-400 line-clamp-2">{entry.question}</span>
        </div>
      )}
    </div>
  );
};

export default StudentQueue;
