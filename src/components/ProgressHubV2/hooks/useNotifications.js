import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getNotifications } from '../../../lib/api';

const lastSeenKey = (userId) => `ignite:notifications:lastSeen:${userId}`;

const readLastSeen = (userId) => {
  if (!userId) return 0;
  try {
    return parseInt(localStorage.getItem(lastSeenKey(userId)) || '0', 10) || 0;
  } catch {
    return 0; // private browsing / storage disabled
  }
};

/**
 * Notification feed for the Progress Hub bell.
 *
 * Read state is a single last-seen epoch-ms timestamp in localStorage, keyed by
 * user id so two accounts on one browser don't share it. The unread count is
 * derived, never stored — which is what lets one broadcast row serve every user
 * without per-user bookkeeping in the database.
 *
 * Deliberately separate from useProgressData: that hook gates the page's
 * `loading` flag, and notifications must never delay first paint.
 */
export default function useNotifications(userId, courseId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(() => readLastSeen(userId));

  useEffect(() => {
    setLastSeen(readLastSeen(userId));
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    getNotifications(userId, courseId)
      .then((rows) => { if (!cancelled) setNotifications(rows); })
      .catch((err) => console.warn('[Notifications] fetch failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId, courseId]);

  // Realtime. Two filtered handlers on one channel: Realtime filters support
  // only eq/neq/lt/lte/gt/gte/in — there is no `is` operator — which is why
  // broadcast rows carry audience='all' rather than relying on user_id IS NULL.
  useEffect(() => {
    if (!userId) return;

    let channel;
    let cancelled = false;

    const upsert = (payload) => {
      const row = payload.new;
      if (!row) return;
      // Course-scoped broadcasts (office hours) only apply to that course.
      // Realtime filters can't express "course_id is null OR eq", so filter here.
      if (row.course_id && courseId && row.course_id !== courseId) return;
      if (row.expires_at && new Date(row.expires_at) <= new Date()) return;

      setNotifications((prev) =>
        prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, 20)
      );
    };

    const subscribe = async () => {
      // notifications is the first RLS-enabled table in the supabase_realtime
      // publication, so the socket must carry the user's JWT for the SELECT
      // policy to be evaluated per-subscriber. supabase-js normally handles
      // this, but this app uses createBrowserClient from @supabase/ssr with
      // custom cookie handlers — set it explicitly so rows aren't silently dropped.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      } catch (err) {
        console.warn('[Notifications] realtime auth failed:', err);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, upsert)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'audience=eq.all',
        }, upsert)
        .subscribe();
    };

    subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, courseId]);

  const unreadCount = notifications.filter(
    (n) => new Date(n.created_at).getTime() > lastSeen
  ).length;

  /** Commit the read cutoff. Call on popover CLOSE, not open. */
  const markAllSeen = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    try {
      localStorage.setItem(lastSeenKey(userId), String(now));
    } catch {
      // storage unavailable — badge simply won't persist across reloads
    }
    setLastSeen(now);
  }, [userId]);

  return { notifications, unreadCount, loading, markAllSeen, lastSeen };
}
