import React, { useState, useEffect } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const authHeader = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${session.access_token}` };
};

/**
 * Email everyone waiting on a course a priority enrolment link.
 *
 * The count is of `course_requests` rows whose `notified_at` is still null, so
 * it drops to zero after a successful send — reopening this cannot email anyone
 * twice. That also makes the send irreversible from the UI: once a row is
 * stamped, that person can never be re-notified for this course. Hence the
 * button naming its own consequence, and no dismiss-on-backdrop-click.
 *
 * Lifted out of the old Analytics dashboard, which was the only place this
 * lived despite being a property of one course.
 */
const NotifyWaitlist = ({ course, onClose }) => {
  // course_requests stores the display title, which is what the count endpoint
  // matches on — not the slug.
  const courseName = course.title || course.name;

  const [count, setCount] = useState(null); // null while loading
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/waitlist-count/${encodeURIComponent(courseName)}`,
          { headers: await authHeader() }
        );
        if (!res.ok) throw new Error('Could not read the waitlist count.');
        const data = await res.json();
        if (!cancelled) setCount(data.count || 0);
      } catch (e) {
        if (!cancelled) { setCount(0); setError(e.message); }
      }
    })();
    return () => { cancelled = true; };
  }, [courseName]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/send-launch-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ courseName, courseSlug: course.name, expiryHours: 72 }),
      });
      if (!res.ok) throw new Error('Failed to send notifications.');
      const data = await res.json();
      setSummary(data.summary || { totalWaitlisted: 0, notificationsSent: 0, failed: 0 });
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Notify waitlist</h3>
          <span className="text-xs text-gray-400 truncate">{courseName}</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {summary ? (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {[
                ['On the waitlist', summary.totalWaitlisted ?? 0, 'text-gray-900'],
                ['Emails sent', summary.notificationsSent ?? 0, 'text-green-700'],
                ['Failed', summary.failed ?? 0, summary.failed > 0 ? 'text-red-600' : 'text-gray-400'],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2">
                  <span className="text-sm text-gray-500 flex-1">{label}</span>
                  <span className={`text-sm font-medium tabular-nums ${tone}`}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                Each person gets one email with a priority enrolment link that expires after
                72 hours. Anyone already notified is skipped.
              </p>
              <div className="border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 flex-1">
                  Waiting, not yet notified
                </span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">
                  {count === null ? '—' : count}
                </span>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-200">
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={sending}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            {summary ? 'Close' : 'Cancel'}
          </button>
          {!summary && (
            <button
              onClick={send}
              disabled={sending || !count}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50 text-xs font-medium flex items-center gap-1.5"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {sending ? 'Sending…' : `Send ${count ?? 0} email${count === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotifyWaitlist;
