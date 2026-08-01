import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CourseDetail from './CourseDetail';
import CourseRequests from '../CourseRequests';

const STATUS_STYLE = {
  live: 'bg-green-50 text-green-700 border-green-200',
  coming_soon: 'bg-amber-50 text-amber-700 border-amber-200',
  requested: 'bg-gray-50 text-gray-600 border-gray-200',
};

// Live courses first, then coming soon, then requested — alphabetical within
// each. Sorted here rather than in the query so a status change re-sorts the
// list immediately, and so `display_order` (which drives the student-facing
// catalogue order) is left alone.
const STATUS_RANK = { live: 0, coming_soon: 1, requested: 2 };

const byStatusThenTitle = (a, b) => {
  const rank = (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);
  if (rank !== 0) return rank;
  return (a.title || a.name || '').localeCompare(b.title || b.name || '', 'en', { sensitivity: 'base' });
};

/** Slug used as the courses primary key. */
const toCourseId = (title) =>
  title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

/**
 * Courses: a list you click into, rather than two 500-line modals.
 *
 * The previous screen had near-identical Add and Edit modals (~1000 lines of
 * duplicated form JSX) and buried the module/lesson outline inside them. Here
 * the list is a list, and everything about one course — settings, outline, AI
 * generation — lives on its own detail view.
 *
 * Course requests are folded in at the bottom rather than living on a separate
 * tab, since they're demand signal for exactly this list.
 */
const Courses = ({ isAdmin }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Accordion: courses expand in place rather than swapping the whole view, so
  // the rest of the list stays visible while you edit one. One at a time —
  // a detail pane is tall enough that two open at once is unreadable.
  const [expanded, setExpanded] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // `silent` skips the spinner: a refetch after saving must not unmount the
  // list, or the row you just saved collapses under you.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ordered = useMemo(() => [...courses].sort(byStatusThenTitle), [courses]);

  const createCourse = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const name = toCourseId(title);
    if (courses.some((c) => c.name === name)) {
      alert(`A course with the id "${name}" already exists.`);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          name,
          title,
          status: 'coming_soon',
          course_type: 'specialism',
          structure_type: 'modules_and_lessons',
          // Seeded with an empty outline so the detail view always has something
          // to edit — the old dashboard created courses with no module_structure
          // at all, which left them broken until fixed elsewhere.
          module_structure: [{ name: '', lessons: [{ name: '', description: '', bullet_points: ['', '', ''] }] }],
          display_order: courses.length + 1,
          lessons: 0,
        })
        .select()
        .single();
      if (error) throw error;
      setNewTitle('');
      setCreating(false);
      await load();
      // Open the new course straight away — it has an empty outline to fill in.
      setExpanded(data.name);
    } catch (error) {
      console.error('Error creating course:', error);
      alert(`Failed to create course: ${error.message}`);
    }
  };

  const setStatus = async (name, status) => {
    setCourses((prev) => prev.map((c) => (c.name === name ? { ...c, status } : c)));
    const { error } = await supabase
      .from('courses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('name', name);
    if (error) {
      console.error('Error updating status:', error);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading courses…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-medium text-gray-900">Courses</h3>
          <span className="text-xs text-gray-400">{courses.length}</span>
          <div className="flex-1" />
          {creating ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createCourse();
                  if (e.key === 'Escape') { setCreating(false); setNewTitle(''); }
                }}
                placeholder="Course title"
                className="px-2 py-1.5 border border-gray-200 rounded-md text-sm focus:border-pink-500 focus:outline-none"
              />
              <button onClick={createCourse} className="px-2.5 py-1.5 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-black">
                Create
              </button>
              <button onClick={() => { setCreating(false); setNewTitle(''); }} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 text-xs text-gray-700 flex items-center gap-1.5"
            >
              <Plus size={13} /> New course
            </button>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {ordered.map((course) => {
            const moduleCount = Array.isArray(course.module_structure) ? course.module_structure.length : 0;
            const lessonCount = Array.isArray(course.module_structure)
              ? course.module_structure.reduce((n, m) => n + (m.lessons?.length || 0), 0)
              : 0;
            const lessonsOnly = course.structure_type === 'lessons_only';
            const isOpen = expanded === course.name;
            return (
              <div key={course.name}>
                <div className={`flex items-center gap-3 px-3 py-2.5 transition ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : course.name)}
                    className="flex-1 min-w-0 text-left flex items-center gap-3"
                  >
                    <ChevronRight
                      size={15}
                      className="text-gray-400 flex-shrink-0"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}
                    />
                    <span className="text-sm font-medium text-gray-900 truncate">{course.title || course.name}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {lessonsOnly ? `${lessonCount} lessons` : `${moduleCount} modules · ${lessonCount} lessons`}
                    </span>
                    {lessonCount === 0 && (
                      <span className="text-xs text-amber-600 whitespace-nowrap">no outline yet</span>
                    )}
                  </button>

                  <select
                    value={course.status}
                    onChange={(e) => setStatus(course.name, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs px-2 py-1 rounded-md border capitalize focus:outline-none ${STATUS_STYLE[course.status] || STATUS_STYLE.requested}`}
                  >
                    <option value="live">live</option>
                    <option value="coming_soon">coming soon</option>
                    <option value="requested">requested</option>
                  </select>
                </div>

                {isOpen && (
                  <div className="px-3 pb-4 pt-1 bg-gray-50 border-t border-gray-200">
                    {/* Keyed on name so switching courses remounts with fresh
                        state rather than carrying the previous course's edits. */}
                    <CourseDetail
                      key={course.name}
                      course={course}
                      onCollapse={() => setExpanded(null)}
                      onSaved={() => load({ silent: true })}
                      onDeleted={() => { setExpanded(null); load({ silent: true }); }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {courses.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No courses yet. Create one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Demand signal for the list above — previously a separate tab.
          Renders its own heading so it matches the Courses section exactly. */}
      {isAdmin && <CourseRequests />}
    </div>
  );
};

export default Courses;
