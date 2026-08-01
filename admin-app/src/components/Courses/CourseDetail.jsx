import React, { useState } from 'react';
import { Sparkles, Loader2, Save, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  generateCourseOutline,
  generateModuleLessons,
  generateLessonBullets,
} from '../../lib/claude';
import OutlineEditor from './OutlineEditor';
import EditableField from './EditableField';
import CourseCoaches from './CourseCoaches';

const label = 'block text-xs font-medium text-gray-500 mb-1';

const STATUSES = ['live', 'coming_soon', 'requested'];
const COURSE_TYPES = ['specialism', 'skill', 'subject'];

/** Lessons-only courses are stored as one unnamed module. */
const normaliseModules = (course) => {
  const ms = Array.isArray(course.module_structure) ? course.module_structure : [];
  if (ms.length) return ms;
  return [{ name: '', lessons: [{ name: '', description: '', bullet_points: ['', '', ''] }] }];
};

const CourseDetail = ({ course, onCollapse, onSaved, onDeleted }) => {
  const [form, setForm] = useState({
    title: course.title || '',
    status: course.status || 'coming_soon',
    course_type: course.course_type || 'specialism',
    structure_type: course.structure_type || 'modules_and_lessons',
    description: course.description || '',
    reddit_channel: course.reddit_channel || '',
    reddit_url: course.reddit_url || '',
    reddit_read_url: course.reddit_read_url || '',
    reddit_post_url: course.reddit_post_url || '',
  });
  const [showExtras, setShowExtras] = useState(false);
  const [modules, setModules] = useState(() => normaliseModules(course));
  // Snapshot of what's persisted, so the outline can warn before opening a
  // lesson whose name only exists in this unsaved draft.
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(normaliseModules(course)));
  const dirty = JSON.stringify(modules) !== savedSnapshot;
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [complexity, setComplexity] = useState('intermediate');
  const [moduleCount, setModuleCount] = useState(5);
  const [lessonsPerModule, setLessonsPerModule] = useState(4);

  const lessonsOnly = form.structure_type === 'lessons_only';
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const totalLessons = modules.reduce((n, m) => n + (m.lessons?.length || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          ...form,
          module_structure: modules,
          modules: lessonsOnly ? null : String(modules.length),
          lessons: totalLessons,
          updated_at: new Date().toISOString(),
        })
        .eq('name', course.name);
      if (error) throw error;
      setSavedSnapshot(JSON.stringify(modules));
      onSaved?.();
    } catch (error) {
      console.error('Error saving course:', error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(
      `Delete "${form.title}"?\n\nThis also deletes every lesson's content, because lessons cascade on the course. This cannot be undone.`
    )) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('name', course.name);
      if (error) throw error;
      onDeleted?.();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  const generateWholeOutline = async () => {
    if (!form.title) return alert('Give the course a title first.');
    const existing = modules.some((m) => m.name || m.lessons?.some((l) => l.name));
    if (existing && !window.confirm('Replace the entire outline with a generated one? Current modules and lessons will be discarded.')) return;

    setBusyKey('outline');
    try {
      const result = await generateCourseOutline(form.title, form.course_type, {
        complexity,
        moduleCount: lessonsOnly ? 1 : moduleCount,
        lessonsPerModule: lessonsOnly ? lessonsPerModule * moduleCount : lessonsPerModule,
      });
      if (result.modules?.length) setModules(result.modules);
      if (result.description && !form.description) set({ description: result.description });
    } catch (error) {
      alert(error.message);
    } finally {
      setBusyKey(null);
    }
  };

  const generateLessonsFor = async (mi) => {
    setBusyKey(`lessons:${mi}`);
    try {
      const { lessons } = await generateModuleLessons(form.title, modules[mi].name, {
        lessonCount: Math.max(1, modules[mi].lessons?.length || lessonsPerModule),
        complexity,
        otherModules: modules.filter((_, i) => i !== mi).map((m) => m.name).filter(Boolean),
      });
      if (lessons?.length) {
        setModules((prev) => prev.map((m, i) => (i === mi ? { ...m, lessons } : m)));
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setBusyKey(null);
    }
  };

  const generateBulletsFor = async (mi, li) => {
    setBusyKey(`bullets:${mi}:${li}`);
    try {
      const lesson = modules[mi].lessons[li];
      const { bullet_points } = await generateLessonBullets({
        courseTitle: form.title,
        moduleName: lessonsOnly ? '' : modules[mi].name,
        lessonName: lesson.name,
        lessonDescription: lesson.description,
      });
      setModules((prev) =>
        prev.map((m, i) =>
          i !== mi ? m : { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, bullet_points } : l)) }
        )
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* The row above already shows the title and counts, so this is just the
          course id and the actions. */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-400 font-mono">{course.name}</span>
        <div className="flex-1" />
        <button onClick={onCollapse} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5">
          Collapse
        </button>
        <button onClick={remove} className="px-2 py-1.5 border border-gray-200 bg-white rounded-md hover:bg-red-50 hover:text-red-600 text-xs text-gray-500 flex items-center gap-1.5">
          <Trash2 size={13} /> Delete
        </button>
        <button onClick={save} disabled={saving} className="px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-black disabled:opacity-50 text-xs font-medium flex items-center gap-1.5">
          <Save size={13} /> {saving ? 'Saving…' : dirty ? 'Save course •' : 'Save course'}
        </button>
      </div>

      {/* Settings. Fields are read-only until you click their pencil — these
          are read far more than changed, and a grid of live inputs invites
          accidental edits that only show up after Save. */}
      <div className="border border-gray-200 rounded-lg p-3 grid gap-3 bg-white" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <EditableField label="Title" value={form.title} onChange={(v) => set({ title: v })} />
        <EditableField
          label="Status"
          value={form.status}
          options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
          format={(v) => v.replace('_', ' ')}
          onChange={(v) => set({ status: v })}
        />
        <EditableField
          label="Type"
          value={form.course_type}
          options={COURSE_TYPES}
          // Specialisms are always modules+lessons.
          onChange={(v) => set(v === 'specialism'
            ? { course_type: v, structure_type: 'modules_and_lessons' }
            : { course_type: v })}
        />
        {form.course_type === 'specialism' ? (
          <div>
            <span className={label}>Structure</span>
            <div className="flex items-center min-h-[30px]">
              <span className="text-sm text-gray-400" title="Specialisms always use modules and lessons">
                Modules and lessons
              </span>
            </div>
          </div>
        ) : (
          <EditableField
            label="Structure"
            value={form.structure_type}
            options={[
              { value: 'modules_and_lessons', label: 'Modules and lessons' },
              { value: 'lessons_only', label: 'Lessons only' },
            ]}
            format={(v) => (v === 'lessons_only' ? 'Lessons only' : 'Modules and lessons')}
            onChange={(v) => set({ structure_type: v })}
          />
        )}
        <EditableField
          span
          label="Description"
          value={form.description}
          placeholder="Shown on the course card"
          onChange={(v) => set({ description: v })}
        />
      </div>

      {/* Coaches and community links. Coaches replaced the old courses.tutor_*
          columns: those held one hardcoded tutor and were read by nothing live,
          while `coaches` rows are per-course, support several, and are what the
          public site renders. Collapsed by default — rarely edited. */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <button
          onClick={() => setShowExtras((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          {showExtras ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Coaches &amp; community
          <span className="text-xs text-gray-400 font-normal">
            {form.reddit_url ? 'forum set' : 'no forum'}
          </span>
        </button>
        {showExtras && (
          <div className="p-3 pt-0 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            <CourseCoaches courseId={course.name} />

            {[
              ['reddit_channel', 'Reddit channel'],
              ['reddit_url', 'Reddit URL'],
              ['reddit_read_url', 'Reddit read URL'],
              ['reddit_post_url', 'Reddit post URL'],
            ].map(([key, lbl]) => (
              <EditableField
                key={key}
                label={lbl}
                value={form[key]}
                mono={key.includes('url') || key.includes('link')}
                onChange={(v) => set({ [key]: v })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Outline + AI */}
      <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-gray-900">Outline</h3>
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Level
            <select value={complexity} onChange={(e) => setComplexity(e.target.value)} className="px-1.5 py-1 border border-gray-200 rounded text-xs">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          {!lessonsOnly && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              Modules
              <input type="number" min={1} max={12} value={moduleCount} onChange={(e) => setModuleCount(+e.target.value)} className="w-12 px-1.5 py-1 border border-gray-200 rounded text-xs" />
            </label>
          )}
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            {lessonsOnly ? 'Lessons' : 'Per module'}
            <input type="number" min={1} max={10} value={lessonsPerModule} onChange={(e) => setLessonsPerModule(+e.target.value)} className="w-12 px-1.5 py-1 border border-gray-200 rounded text-xs" />
          </label>
          <button
            onClick={generateWholeOutline}
            disabled={busyKey === 'outline' || !form.title}
            className="px-2.5 py-1.5 border border-purple-200 bg-purple-50 rounded-md hover:bg-purple-100 text-xs text-purple-700 flex items-center gap-1.5 disabled:opacity-50"
            title="Generate the whole outline with AI"
          >
            {busyKey === 'outline' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {busyKey === 'outline' ? 'Generating…' : 'Generate outline'}
          </button>
        </div>

        <OutlineEditor
          modules={modules}
          onChange={setModules}
          lessonsOnly={lessonsOnly}
          courseId={course.name}
          dirty={dirty}
          onGenerateModuleLessons={generateLessonsFor}
          onGenerateBullets={generateBulletsFor}
          busyKey={busyKey}
        />

        <p className="text-xs text-gray-400">
          Module and lesson numbers are positions in this list — reordering or deleting re-points
          lesson content that was written against the old numbers.
        </p>
      </div>
    </div>
  );
};

export default CourseDetail;
