import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Users } from 'lucide-react';

const PastSessions = ({ pastSessions }) => {
  const [expandedId, setExpandedId] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (session) => {
    if (!session.ended_at || !session.started_at) return '-';
    const diff = Math.floor((new Date(session.ended_at) - new Date(session.started_at)) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
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
                <th className="text-left p-3 font-medium">Topic</th>
                <th className="text-left p-3 font-medium">Rating</th>
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pastSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isExpanded={expandedId === session.id}
                  onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SessionRow = ({ session, isExpanded, onToggle, formatDate, formatDuration }) => {
  const chatLog = session.chat_log || [];

  return (
    <>
      <tr
        className="border-b border-gray-700/30 last:border-0 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={onToggle}
      >
        <td className="p-3 text-gray-300">{formatDate(session.started_at)}</td>
        <td className="p-3 text-gray-300 font-mono">{formatDuration(session)}</td>
        <td className="p-3 text-gray-300">
          {session.studentName ? (
            <div className="flex items-center gap-2">
              {session.studentPicture ? (
                <img src={session.studentPicture} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <Users size={14} className="text-gray-500" />
              )}
              <span>{session.studentName}</span>
            </div>
          ) : session.student_id ? (
            <span className="flex items-center gap-1.5 text-gray-400">
              <Users size={14} />Student joined
            </span>
          ) : (
            <span className="text-gray-500">No student</span>
          )}
        </td>
        <td className="p-3 text-gray-400 max-w-[150px] truncate">{session.topic || '-'}</td>
        <td className="p-3">
          {session.rating === 'positive' ? (
            <ThumbsUp size={14} className="text-green-400" />
          ) : session.rating === 'negative' ? (
            <ThumbsDown size={14} className="text-red-400" />
          ) : (
            <span className="text-gray-600">-</span>
          )}
        </td>
        <td className="p-3">
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-500" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-4 bg-gray-800/20 border-b border-gray-700/30">
            <div className="space-y-3 max-w-2xl">
              {session.topic && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Topic</span>
                  <p className="text-sm text-gray-300 mt-0.5">{session.topic}</p>
                </div>
              )}
              {session.question && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Question</span>
                  <p className="text-sm text-gray-300 mt-0.5">{session.question}</p>
                </div>
              )}
              {session.feedback_comment && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Feedback</span>
                  <p className="text-sm text-gray-300 mt-0.5">{session.feedback_comment}</p>
                </div>
              )}
              {chatLog.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chat Log</span>
                  <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                    {chatLog.map((msg, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium text-gray-400">{msg.sender}: </span>
                        <span className="text-gray-300">{msg.text}</span>
                        {msg.ts && (
                          <span className="text-gray-600 ml-1">
                            {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!session.topic && !session.question && !session.feedback_comment && chatLog.length === 0 && (
                <p className="text-xs text-gray-600">No additional details for this session.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default PastSessions;
