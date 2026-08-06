import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { getUserProgressDetails, setUserProgress, resetUserProgress } from '../../lib/api';

/**
 * Move a learner to a different point in their course.
 *
 * Both actions clear lesson completions, so both buttons name the position they
 * will land on rather than saying "Save" — `Set to 3.4` is checkable against
 * the inputs above it in a way that "Set Progress" is not.
 */
const ProgressModal = ({ user, courseTitle, onClose }) => {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [targetModule, setTargetModule] = useState(1);
  const [targetLesson, setTargetLesson] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const details = await getUserProgressDetails(user.id, user.enrolled_course);
        if (cancelled) return;
        setData(details);
        setTargetModule(details.currentModule);
        setTargetLesson(details.currentLesson);
      } catch (e) {
        console.error('Error loading user progress:', e);
        if (!cancelled) setError('Could not load this learner’s progress.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id, user.enrolled_course]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setUserProgress(user.id, user.enrolled_course, targetModule, targetLesson);
      onClose();
    } catch (e) {
      console.error('Error setting user progress:', e);
      setError(e.message);
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(
      `Reset ${user.first_name} ${user.last_name} to Module 1, Lesson 1?\n\nThis clears every lesson completion on this course and cannot be undone.`
    )) return;

    setBusy(true);
    setError(null);
    try {
      await resetUserProgress(user.id, user.enrolled_course);
      onClose();
    } catch (e) {
      console.error('Error resetting user progress:', e);
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Adjust progress</h3>
          <span className="text-xs text-gray-400 truncate">
            {user.first_name} {user.last_name}
          </span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {busy && !data ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 size={14} className="animate-spin" /> Loading progress…
            </div>
          ) : (
            <>
              <div
                className="border border-gray-200 rounded-lg p-3 grid gap-3 bg-white"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}
              >
                {[
                  ['Course', courseTitle],
                  ['Module', data?.currentModule],
                  ['Lesson', data?.currentLesson],
                  ['Completed', `${data?.completedCount ?? 0} lessons`],
                ].map(([lbl, value]) => (
                  <div key={lbl}>
                    <span className="block text-xs font-medium text-gray-500 mb-1">{lbl}</span>
                    <span className="text-sm text-gray-900 tabular-nums">{value ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Move to module</label>
                  <input
                    type="number"
                    min="1"
                    value={targetModule}
                    onChange={(e) => setTargetModule(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-gray-900 focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Move to lesson</label>
                  <input
                    type="number"
                    min="1"
                    value={targetLesson}
                    onChange={(e) => setTargetLesson(parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-gray-900 focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Every lesson completion at or after the target is cleared. This cannot be undone.
              </p>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-200">
          <button
            onClick={reset}
            disabled={busy}
            className="px-2 py-1.5 border border-gray-200 bg-white rounded-md hover:bg-red-50 hover:text-red-600 text-xs text-gray-500 disabled:opacity-50"
          >
            Reset to 1.1
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={busy}
            className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50 text-xs font-medium"
          >
            {busy && data ? 'Saving…' : `Set to ${targetModule}.${targetLesson}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;
