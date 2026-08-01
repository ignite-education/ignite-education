import React, { useState } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Trash2, MoveUp, MoveDown, Sparkles, Loader2,
  SquarePen,
} from 'lucide-react';
import EditableField from './EditableField';

const ghostBtn =
  'px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition flex items-center gap-1';

const emptyLesson = () => ({ name: '', description: '', bullet_points: ['', '', ''] });
const emptyModule = () => ({ name: '', lessons: [emptyLesson()] });

/**
 * Inline editor for `courses.module_structure`.
 *
 * Shape is `[{ name, lessons: [{ name, description, bullet_points }] }]`, and
 * module/lesson NUMBERS ARE ARRAY POSITIONS — the `lessons` table, user
 * progress and completions all key off them. Reordering or deleting therefore
 * re-points existing content, which is why those actions warn.
 *
 * A lessons-only course is stored as a single unnamed module, so the same
 * editor serves both `structure_type` values.
 */
const OutlineEditor = ({
  modules,
  onChange,
  lessonsOnly = false,
  courseId,
  dirty = false,
  onGenerateModuleLessons,
  onGenerateBullets,
  busyKey,
}) => {
  const [openModules, setOpenModules] = useState(() => new Set([0]));
  const [openLesson, setOpenLesson] = useState(null); // `${m}:${l}`

  const toggleModule = (idx) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const patchModules = (fn) => {
    const next = modules.map((m) => ({ ...m, lessons: (m.lessons || []).map((l) => ({ ...l })) }));
    fn(next);
    onChange(next);
  };

  const setLesson = (mi, li, patch) =>
    patchModules((next) => {
      next[mi].lessons[li] = { ...next[mi].lessons[li], ...patch };
    });

  const addLesson = (mi) =>
    patchModules((next) => {
      next[mi].lessons.push(emptyLesson());
    });

  const removeLesson = (mi, li) => {
    const name = modules[mi].lessons[li]?.name || `Lesson ${li + 1}`;
    if (!window.confirm(
      `Delete "${name}"?\n\nLesson numbers are positions, so every later lesson in this module shifts up — any lesson content already written against those numbers will point at the wrong lesson.`
    )) return;
    patchModules((next) => {
      next[mi].lessons.splice(li, 1);
      if (next[mi].lessons.length === 0) next[mi].lessons.push(emptyLesson());
    });
  };

  const moveLesson = (mi, li, dir) => {
    const target = li + dir;
    if (target < 0 || target >= modules[mi].lessons.length) return;
    if (!window.confirm(
      'Reorder lessons?\n\nLesson numbers are positions, so swapping these two re-points any lesson content already written against them.'
    )) return;
    patchModules((next) => {
      const arr = next[mi].lessons;
      [arr[li], arr[target]] = [arr[target], arr[li]];
    });
  };

  const addModule = () => {
    patchModules((next) => next.push(emptyModule()));
    setOpenModules((prev) => new Set(prev).add(modules.length));
  };

  const removeModule = (mi) => {
    if (!window.confirm(
      `Delete "${modules[mi].name || `Module ${mi + 1}`}" and its ${modules[mi].lessons?.length || 0} lessons?\n\nModule numbers are positions, so later modules shift up and their existing lesson content will point at the wrong module.`
    )) return;
    patchModules((next) => next.splice(mi, 1));
  };

  const moveModule = (mi, dir) => {
    const target = mi + dir;
    if (target < 0 || target >= modules.length) return;
    if (!window.confirm(
      'Reorder modules?\n\nModule numbers are positions, so swapping these re-points the lesson content already written against them.'
    )) return;
    patchModules((next) => {
      [next[mi], next[target]] = [next[target], next[mi]];
    });
  };

  const renderLesson = (mod, mi, lesson, li) => {
    const key = `${mi}:${li}`;
    const isOpen = openLesson === key;
    const bulletsBusy = busyKey === `bullets:${key}`;

    return (
      <div key={li} className="border border-gray-200 rounded-md bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <button
            onClick={() => setOpenLesson(isOpen ? null : key)}
            className="text-gray-400 hover:text-gray-700 flex-shrink-0"
            title={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className="text-xs text-gray-400 w-6 flex-shrink-0 tabular-nums">{li + 1}</span>
          <EditableField
            inline
            label="lesson name"
            value={lesson.name || ''}
            placeholder="Lesson name"
            onChange={(v) => setLesson(mi, li, { name: v })}
          />
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Opens the Lessons tab deep-linked to this lesson. A real <a>
                so cmd/middle-click behave, and target=_blank so the outline
                stays put — you often open several in a row. */}
            <a
              href={`/courses?tab=content&course=${encodeURIComponent(courseId || '')}&module=${mi + 1}&lesson=${li + 1}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!lesson.name) { e.preventDefault(); return; }
                if (dirty && !window.confirm('This course has unsaved changes. The content editor reads the saved outline, so a lesson you have just added or renamed will not be there yet.\n\nOpen it anyway?')) {
                  e.preventDefault();
                }
              }}
              title={lesson.name
                ? 'Edit this lesson\u2019s content in a new tab'
                : 'Name the lesson first'}
              className={`${ghostBtn} ${lesson.name ? 'hover:text-pink-600' : 'opacity-25 pointer-events-none'}`}
            >
              <SquarePen size={12} />
            </a>
            <button onClick={() => moveLesson(mi, li, -1)} disabled={li === 0} className={`${ghostBtn} disabled:opacity-25`} title="Move up">
              <MoveUp size={12} />
            </button>
            <button onClick={() => moveLesson(mi, li, 1)} disabled={li === (mod.lessons?.length || 0) - 1} className={`${ghostBtn} disabled:opacity-25`} title="Move down">
              <MoveDown size={12} />
            </button>
            <button onClick={() => removeLesson(mi, li)} className={`${ghostBtn} hover:text-red-600`} title="Delete lesson">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="px-2 pb-2 pl-10 space-y-2">
            <EditableField
              inline
              label="description"
              value={lesson.description || ''}
              placeholder="One-line description"
              onChange={(v) => setLesson(mi, li, { description: v })}
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">Card bullet points</span>
                <button
                  onClick={() => onGenerateBullets(mi, li)}
                  disabled={bulletsBusy || !lesson.name}
                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-40"
                  title={lesson.name ? 'Generate 3 bullet points for this lesson' : 'Name the lesson first'}
                >
                  {bulletsBusy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {bulletsBusy ? 'generating…' : 'generate'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((bi) => (
                  <EditableField
                    key={bi}
                    inline
                    label={`bullet ${bi + 1}`}
                    value={lesson.bullet_points?.[bi] || ''}
                    placeholder={`Bullet ${bi + 1}`}
                    onChange={(v) => {
                      const bullets = [...(lesson.bullet_points || ['', '', ''])];
                      bullets[bi] = v;
                      setLesson(mi, li, { bullet_points: bullets });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Lessons-only courses are one unnamed module — render its lessons directly.
  if (lessonsOnly) {
    const mod = modules[0] || emptyModule();
    return (
      <div className="space-y-1.5">
        {(mod.lessons || []).map((lesson, li) => renderLesson(mod, 0, lesson, li))}
        <button onClick={() => addLesson(0)} className={ghostBtn}>
          <Plus size={12} /> Add lesson
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {modules.map((mod, mi) => {
        const isOpen = openModules.has(mi);
        const lessonsBusy = busyKey === `lessons:${mi}`;
        return (
          <div key={mi} className="border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 px-2 py-2">
              <button
                onClick={() => toggleModule(mi)}
                className="text-gray-400 hover:text-gray-700 flex-shrink-0"
              >
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              <span className="text-xs font-medium text-gray-400 w-8 flex-shrink-0 tabular-nums">M{mi + 1}</span>
              <EditableField
                inline
                bold
                label="module name"
                value={mod.name || ''}
                placeholder="Module name"
                onChange={(v) => patchModules((next) => { next[mi].name = v; })}
              />
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {mod.lessons?.length || 0} lesson{(mod.lessons?.length || 0) === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => onGenerateModuleLessons(mi)}
                  disabled={lessonsBusy || !mod.name}
                  className={`${ghostBtn} text-purple-600 hover:text-purple-800 disabled:opacity-40`}
                  title={mod.name ? 'Generate lessons for this module' : 'Name the module first'}
                >
                  {lessonsBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {lessonsBusy ? '…' : 'Lessons'}
                </button>
                <button onClick={() => moveModule(mi, -1)} disabled={mi === 0} className={`${ghostBtn} disabled:opacity-25`} title="Move up">
                  <MoveUp size={12} />
                </button>
                <button onClick={() => moveModule(mi, 1)} disabled={mi === modules.length - 1} className={`${ghostBtn} disabled:opacity-25`} title="Move down">
                  <MoveDown size={12} />
                </button>
                <button onClick={() => removeModule(mi)} className={`${ghostBtn} hover:text-red-600`} title="Delete module">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {isOpen && (
              <div className="px-2 pb-2 pl-9 space-y-1.5">
                {(mod.lessons || []).map((lesson, li) => renderLesson(mod, mi, lesson, li))}
                <button onClick={() => addLesson(mi)} className={ghostBtn}>
                  <Plus size={12} /> Add lesson
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={addModule} className={`${ghostBtn} text-gray-700`}>
        <Plus size={13} /> Add module
      </button>
    </div>
  );
};

export default OutlineEditor;
