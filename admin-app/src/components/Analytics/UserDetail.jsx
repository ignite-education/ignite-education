import React, { useState } from 'react';
import { Trash2, ExternalLink, EyeOff, SlidersHorizontal } from 'lucide-react';
import { updateUserCourse, deleteUser } from '../../lib/api';
// A shared read-only-until-pencil primitive that happens to live under Courses/.
// Promote it to components/ if a third non-Courses consumer appears.
import EditableField from '../Courses/EditableField';
import ProgressModal from './ProgressModal';

/**
 * Everything about one user that doesn't fit on their row.
 *
 * Enrolled course is an EditableField rather than a live <select> because
 * changing it re-points which course a learner's progress is measured against —
 * too consequential to sit one stray scroll-wheel away.
 *
 * Unlike CourseDetail there is no Save button: each field persists on change,
 * so there is no draft state to lose.
 */
const UserDetail = ({ user, courses, courseTitle, onChanged, onCollapse, onDeleted }) => {
  const [progressOpen, setProgressOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const setCourse = async (name) => {
    setBusy(true);
    try {
      await updateUserCourse(user.id, name || null);
      onChanged({ enrolled_course: name || null });
    } catch (error) {
      console.error('Error updating user course:', error);
      alert(`Failed to change course: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(
      `Delete ${user.first_name} ${user.last_name}?\n\nThis removes them from both the authentication system and the database, including all their progress. This cannot be undone.`
    )) return;

    setBusy(true);
    try {
      await deleteUser(user.id);
      onDeleted();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-400 font-mono">{user.id}</span>
        <div className="flex-1" />
        <button
          onClick={onCollapse}
          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5"
        >
          Collapse
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="px-2 py-1.5 border border-gray-200 bg-white rounded-md hover:bg-red-50 hover:text-red-600 text-xs text-gray-500 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Trash2 size={13} /> Delete user
        </button>
      </div>

      <div
        className="border border-gray-200 rounded-lg p-3 grid gap-3 bg-white"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
      >
        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1">Email</span>
          <div className="flex items-center min-h-[30px]">
            {/* null when the API is unreachable and getAllUsers fell back to the
                direct table query — emails need the service role. */}
            <span
              className={`text-sm truncate ${user.email ? 'text-gray-900' : 'text-gray-400 italic'}`}
              title={user.email || undefined}
            >
              {user.email || 'Unavailable — API offline'}
            </span>
          </div>
        </div>

        <EditableField
          label="Enrolled course"
          value={user.enrolled_course || ''}
          options={[
            { value: '', label: 'No course' },
            ...courses.map((c) => ({ value: c.name, label: c.title || c.name })),
          ]}
          format={(v) => courseTitle(v)}
          placeholder="No course"
          onChange={setCourse}
        />

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1">Joined</span>
          <div className="flex items-center min-h-[30px]">
            <span className="text-sm text-gray-900">
              {new Date(user.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Public profile at ignite.education/{username}. The slug is generated
            by a DB trigger at signup; "Not generated" means that row predates
            the trigger — see migrations/fix_username_on_signup.sql. */}
        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1">Public page</span>
          <div className="flex items-center min-h-[30px]">
            {user.username ? (
              <a
                href={`https://ignite.education/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  user.is_public === false
                    ? 'Profile is hidden (is_public = false) — this link will 404'
                    : `https://ignite.education/${user.username}`
                }
                className={`text-sm flex items-center gap-1.5 hover:underline truncate ${
                  user.is_public === false ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {user.is_public === false ? <EyeOff size={13} /> : <ExternalLink size={13} />}
                /{user.username}
              </a>
            ) : (
              <span className="text-sm text-gray-400 italic">Not generated</span>
            )}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1">Progress</span>
          <div className="flex items-center min-h-[30px]">
            {user.enrolled_course ? (
              <button
                onClick={() => setProgressOpen(true)}
                className="px-2 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 text-xs text-gray-700 flex items-center gap-1.5"
              >
                <SlidersHorizontal size={13} /> Adjust progress
              </button>
            ) : (
              <span className="text-sm text-gray-400 italic">No course</span>
            )}
          </div>
        </div>
      </div>

      {progressOpen && (
        <ProgressModal
          user={user}
          courseTitle={courseTitle(user.enrolled_course)}
          onClose={() => setProgressOpen(false)}
        />
      )}
    </div>
  );
};

export default UserDetail;
