import { Video, VideoOff } from 'lucide-react';

const SessionControl = ({ activeSession, elapsed, starting, ending, onGoLive, onEndSession, formatDuration }) => {
  if (!activeSession) {
    return (
      <div className="p-6 rounded-xl border border-gray-700/50 bg-gray-800/50 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
          <Video size={28} className="text-purple-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">Start Office Hours</h3>
        <p className="text-gray-400 text-sm mb-5">
          Go live to let students join you for a 1:1 video session.
        </p>
        <button
          onClick={onGoLive}
          disabled={starting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Video size={18} />
          {starting ? 'Starting...' : 'Go Live'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-gray-700/50 bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            activeSession.status === 'occupied' ? 'bg-yellow-400' : 'bg-green-500 animate-pulse'
          }`} />
          <span className="font-medium">
            {activeSession.status === 'occupied' ? 'In Session' : 'Live — Waiting'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 font-mono text-lg">{formatDuration(elapsed)}</span>
          <button
            onClick={onEndSession}
            disabled={ending}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            <VideoOff size={14} />
            {ending ? 'Ending...' : 'End Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionControl;
