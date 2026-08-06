import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { getAllUsers, updateUserRole, getAllCourses, getCourseRequestsByUser } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import UserDetail from './UserDetail';

// Same recipe as the course status pill: -50 background, -700 text, -200
// border. Role is a privilege level, so colour is semantically earned here.
const ROLE_STYLE = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  teacher: 'bg-blue-50 text-blue-700 border-blue-200',
  student: 'bg-gray-50 text-gray-600 border-gray-200',
};

const ROLES = ['student', 'teacher', 'admin'];

/**
 * Everyone on the platform, as a list you click into.
 *
 * Was a nine-column table that scrolled sideways on any laptop. Identity, their
 * course and their role are what you scan for; everything else — email, joined,
 * public page, progress, delete — is what you came for once you'd found the row,
 * so it lives in the detail panel.
 */
const UserList = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [waitlistByUser, setWaitlistByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [people, allCourses, waitlist] = await Promise.all([
        getAllUsers(),
        getAllCourses(),
        getCourseRequestsByUser(),
      ]);
      setUsers(people || []);
      setCourses(allCourses || []);
      setWaitlistByUser(waitlist || {});
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courseTitle = useCallback((slug) => {
    if (!slug) return null;
    const course = courses.find((c) => c.name === slug);
    return course ? (course.title || course.name) : slug;
  }, [courses]);

  const filtered = useMemo(
    () => (filter === 'all' ? users : users.filter((u) => u.role === filter)),
    [users, filter]
  );

  const patchUser = (id, patch) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  // Optimistic, like the course status select: patch first, refetch on failure.
  const setRole = async (id, role) => {
    setBusyId(id);
    patchUser(id, { role });
    try {
      await updateUserRole(id, role);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert(`Failed to change role: ${error.message}`);
      load({ silent: true });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900">Users</h3>
        {!loading && <span className="text-xs text-gray-400">{filtered.length}</span>}
        <div className="flex-1" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-700 focus:outline-none focus:border-pink-500"
        >
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <Loader2 size={14} className="animate-spin" /> Loading users…
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {filtered.map((user) => {
            const isOpen = expanded === user.id;
            const waitlisted = !user.enrolled_course && waitlistByUser[user.id];
            return (
              <div key={user.id}>
                <div className={`flex items-center gap-3 px-3 py-2.5 transition ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : user.id)}
                    className="flex-1 min-w-0 text-left flex items-center gap-3"
                  >
                    <ChevronRight
                      size={15}
                      className="text-gray-400 flex-shrink-0"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}
                    />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </span>
                    {authUser?.id === user.id && (
                      <span className="text-xs text-pink-600 whitespace-nowrap">you</span>
                    )}
                    {user.enrolled_course ? (
                      <span className="text-xs text-gray-400 truncate">
                        {courseTitle(user.enrolled_course)}
                      </span>
                    ) : waitlisted ? (
                      <span className="text-xs text-amber-600 truncate">
                        waitlisted · {courseTitle(waitlistByUser[user.id])}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 whitespace-nowrap">no course</span>
                    )}
                  </button>

                  <select
                    value={user.role}
                    onChange={(e) => setRole(user.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={busyId === user.id}
                    className={`text-xs px-2 py-1 rounded-md border capitalize focus:outline-none disabled:opacity-50 ${ROLE_STYLE[user.role] || ROLE_STYLE.student}`}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {isOpen && (
                  <div className="px-3 pb-4 pt-1 bg-gray-50 border-t border-gray-200">
                    {/* Keyed on id so switching users remounts with fresh state. */}
                    <UserDetail
                      key={user.id}
                      user={user}
                      courses={courses}
                      courseTitle={courseTitle}
                      onChanged={(patch) => patchUser(user.id, patch)}
                      onCollapse={() => setExpanded(null)}
                      onDeleted={() => {
                        setExpanded(null);
                        setUsers((prev) => prev.filter((u) => u.id !== user.id));
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              {filter === 'all'
                ? 'No users yet.'
                : `No ${filter}s. Change the role filter to see everyone.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserList;
