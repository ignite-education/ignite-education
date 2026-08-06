import React from 'react';
import UserMetrics from '../components/Analytics/UserMetrics';
import UserList from '../components/Analytics/UserList';

/**
 * Who is on the platform, and what they can do.
 *
 * Course performance, satisfaction and retention were removed rather than
 * restyled: completion rate was hardcoded to zero, avg. time spent and forum
 * posts were literal constants in lib/analytics.js, and the ratings tables read
 * from tables with no rows. Growth was returned as a raw count but rendered
 * through a percentage formatter, so "3 new users" displayed as "+3.0%".
 *
 * Course and demand management were removed because they duplicated the Courses
 * tab — which is the only place that writes module_structure, so courses made
 * here had no outline. The one thing that lived only here, the waitlist launch
 * notification, moved to Courses/NotifyWaitlist.jsx.
 *
 * No page header: AdminLayout already supplies the brand, nav and back link.
 */
const AnalyticsDashboard = () => (
  <div
    className="bg-white text-gray-900 min-h-full"
    style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}
  >
    <div className="p-6">
      <div className="space-y-6">
        <UserMetrics />
        <UserList />
      </div>
    </div>
  </div>
);

export default AnalyticsDashboard;
