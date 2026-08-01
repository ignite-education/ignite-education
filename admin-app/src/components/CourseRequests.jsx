import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getCourseRequestAnalytics } from '../lib/api';

/**
 * Courses users have asked for from the catalogue, ranked by demand.
 *
 * Presented as the same bordered, divided list as the Courses section directly
 * above it — these are two views of the same subject (what exists vs what is
 * wanted), so they should read as one screen rather than two designs.
 *
 * Extracted from the old CoursesDashboard page, which was otherwise a weaker
 * duplicate of CourseManagement — its "Add Course" wrote no `module_structure`
 * or `structure_type`, so courses created there had no outline.
 */
const CourseRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCourseRequestAnalytics();
        if (!cancelled) setRequests(data || []);
      } catch (error) {
        console.error('Error fetching course requests:', error);
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900">Requested by learners</h3>
        {!loading && <span className="text-xs text-gray-400">{requests.length}</span>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
          <Loader2 size={14} className="animate-spin" /> Loading requests…
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {requests.map((request) => (
            <div
              key={request.courseName}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition"
            >
              <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
                {request.courseName}
              </span>

              {request.latestRequestDate && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  latest {new Date(request.latestRequestDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}

              {/* Count sits where the status pill sits on a course row, so the
                  two lists line up down the right-hand edge. */}
              <span className="text-xs px-2 py-1 rounded-md border bg-gray-50 text-gray-600 border-gray-200 whitespace-nowrap">
                {request.total} {request.total === 1 ? 'request' : 'requests'}
              </span>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No course requests yet. Learners can request courses from the catalogue.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseRequests;
