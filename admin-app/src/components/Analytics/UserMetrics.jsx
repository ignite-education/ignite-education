import React, { useState, useEffect } from 'react';
import { getUserAnalytics, getEngagementMetrics } from '../../lib/analytics';

/**
 * Each tile carries a `hint` stating exactly what it counts.
 *
 * "Active" here means "completed a lesson in the window" — there is no session
 * tracking, so it is not time-on-site. Saying so on screen is what stops this
 * panel drifting back towards the invented numbers it replaced (avg. time spent
 * was a hardcoded 1200 seconds; forum posts was a hardcoded 0).
 */
const TILES = [
  { key: 'total', label: 'Total users', hint: 'all registered' },
  { key: 'newThisWeek', label: 'New this week', hint: 'last 7 days' },
  { key: 'newThisMonth', label: 'New this month', hint: 'last 30 days' },
  { key: 'dailyActive', label: 'Daily active', hint: 'lesson completed in 24h' },
  { key: 'monthlyActive', label: 'Monthly active', hint: 'lesson completed in 30d' },
];

const UserMetrics = () => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [users, engagement] = await Promise.all([
          getUserAnalytics(),
          getEngagementMetrics(),
        ]);
        if (!cancelled) setMetrics({ ...users, ...engagement });
      } catch (error) {
        console.error('Error loading metrics:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900">Overview</h3>
      </div>

      {/* Rendered immediately with em-dashes rather than behind a spinner — the
          fetch is two count queries, and a spinner here would only buy a
          layout shift. */}
      <div
        className="border border-gray-200 rounded-lg p-3 grid gap-3 bg-white"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
      >
        {TILES.map(({ key, label, hint }) => (
          <div key={key}>
            <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
            <div className="flex items-center min-h-[30px]">
              <span className="text-sm font-medium text-gray-900 tabular-nums">
                {metrics ? (metrics[key] ?? 0).toLocaleString() : '—'}
              </span>
            </div>
            <span className="block text-xs text-gray-400">{hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserMetrics;
