import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, User } from 'lucide-react';
import { getAllCoaches, createCoach, updateCoach, deleteCoach } from '../../lib/api';
import EditableField from './EditableField';

/**
 * Coaches assigned to one course.
 *
 * `coaches` rows already carry a `course_id`, so a course-scoped list is the
 * natural home for them — the separate Coaches tab made you pick a course from
 * a dropdown to do the same thing.
 *
 * This also replaces the `courses.tutor_*` columns, which held a single
 * hardcoded tutor per course and were read by nothing live. Coaches support
 * several per course and are what the public site actually renders.
 */
const CourseCoaches = ({ courseId }) => {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await getAllCoaches();
      setCoaches((all || []).filter((c) => c.course_id === courseId));
    } catch (error) {
      console.error('Error loading coaches:', error);
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createCoach({
        course_id: courseId,
        name,
        position: '',
        description: '',
        image_url: '',
        linkedin_url: '',
        display_order: coaches.length,
        is_active: true,
      });
      setNewName('');
      setAdding(false);
      await load();
    } catch (error) {
      console.error('Error creating coach:', error);
      alert(`Failed to add coach: ${error.message}`);
    }
  };

  // Each field saves on its own — coaches are separate rows, so there's no
  // draft to batch into the course's Save button.
  const patch = async (coach, field, value) => {
    setCoaches((prev) => prev.map((c) => (c.id === coach.id ? { ...c, [field]: value } : c)));
    try {
      await updateCoach(coach.id, { ...coach, [field]: value });
    } catch (error) {
      console.error('Error updating coach:', error);
      alert(`Failed to save: ${error.message}`);
      load();
    }
  };

  const remove = async (coach) => {
    if (!window.confirm(`Remove ${coach.name || 'this coach'} from this course?`)) return;
    try {
      await deleteCoach(coach.id);
      await load();
    } catch (error) {
      console.error('Error deleting coach:', error);
      alert(`Failed to remove: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
        <Loader2 size={13} className="animate-spin" /> Loading coaches…
      </div>
    );
  }

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-500">Coaches</span>
        <span className="text-xs text-gray-400">{coaches.length}</span>
        <div className="flex-1" />
        {adding ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); }
              }}
              placeholder="Coach name"
              className="px-2 py-1 border border-gray-200 rounded-md text-xs focus:border-pink-500 focus:outline-none"
            />
            <button onClick={add} className="px-2 py-1 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-black">
              Add
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); }} className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-900">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-100 text-xs text-gray-700 flex items-center gap-1"
          >
            <Plus size={12} /> Add coach
          </button>
        )}
      </div>

      {coaches.length === 0 ? (
        <div className="border border-gray-200 rounded-md px-3 py-5 text-center text-xs text-gray-500">
          No coaches on this course yet.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {coaches.map((coach) => (
            <div key={coach.id} className="p-2.5">
              <div className="flex items-start gap-2.5">
                {coach.image_url ? (
                  <img src={coach.image_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={14} className="text-gray-400" />
                  </div>
                )}

                <div
                  className="flex-1 min-w-0 grid gap-2"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}
                >
                  <EditableField label="Name" value={coach.name} onChange={(v) => patch(coach, 'name', v)} />
                  <EditableField label="Position" value={coach.position} onChange={(v) => patch(coach, 'position', v)} />
                  <EditableField label="LinkedIn" value={coach.linkedin_url} mono onChange={(v) => patch(coach, 'linkedin_url', v)} />
                  <EditableField label="Image URL" value={coach.image_url} mono onChange={(v) => patch(coach, 'image_url', v)} />
                  <EditableField span label="Bio" value={coach.description} onChange={(v) => patch(coach, 'description', v)} />
                </div>

                <button
                  onClick={() => remove(coach)}
                  title="Remove coach"
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseCoaches;
