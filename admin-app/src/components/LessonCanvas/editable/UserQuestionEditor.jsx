import React, { useState, useRef, useLayoutEffect } from 'react';
import { Sparkles, X, Lock } from 'lucide-react';
import { TEXT_METRICS, TEXTAREA_RESET } from '@shared/lesson/textMetrics';

const METRICS = TEXT_METRICS.userQuestion;

/**
 * The engagement question that can follow a paragraph.
 *
 * Unlike a scored question this is not graded — but it does gate progression:
 * the student cannot continue until they answer it. Students see it in
 * font-medium immediately under the paragraph, with `{{firstName}}` replaced by
 * their name.
 *
 * The token is left visible here rather than substituted, because an author
 * needs to see that it is a token and where it sits.
 */
const UserQuestionEditor = ({
  value,
  onChange,
  saveFeedback,
  onToggleSaveFeedback,
  onGenerate,
  generating,
}) => {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const taRef = useRef(null);

  useLayoutEffect(() => {
    if (!editing) return;
    const el = taRef.current;
    if (!el) return;
    el.focus();
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editing]);

  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el || !editing) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, editing]);

  const has = !!(value && value.trim());

  if (!has && !editing) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ marginTop: -8, marginBottom: 12, height: 22 }}
      >
        <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s ease', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-gray-700 transition"
          >
            + engagement question
          </button>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="text-xs text-purple-500 hover:text-purple-700 transition flex items-center gap-1 disabled:opacity-50"
          >
            <Sparkles size={11} />
            {generating ? 'generating…' : 'generate'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ marginBottom: 12 }}
    >
      {/* Marks this as a gate rather than ordinary body copy */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: -14, top: 2, bottom: 20,
          width: 2, borderRadius: 2, background: '#8200EA', opacity: 0.35,
        }}
      />

      {editing ? (
        <textarea
          ref={taRef}
          value={value || ''}
          rows={1}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur(); }}
          placeholder="Ask the student something about their own experience…"
          style={{ ...METRICS, ...TEXTAREA_RESET }}
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          style={{ ...METRICS, cursor: 'text' }}
        >
          {String(value).split(/(\{\{firstName\}\})/g).map((part, i) =>
            part === '{{firstName}}' ? (
              <span
                key={i}
                style={{
                  background: '#F3E8FF', color: '#8200EA', borderRadius: 4,
                  padding: '0 4px', fontSize: '0.9em', fontWeight: 500,
                }}
              >
                first name
              </span>
            ) : (
              <React.Fragment key={i}>{part}</React.Fragment>
            )
          )}
        </p>
      )}

      <div
        className="flex items-center gap-3 flex-wrap"
        style={{ opacity: hovered || editing ? 1 : 0.35, transition: 'opacity 0.12s ease', marginTop: -6 }}
      >
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Lock size={10} /> must be answered before continuing
        </span>

        <label className="text-xs text-gray-500 flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!saveFeedback}
            onChange={(e) => onToggleSaveFeedback(e.target.checked)}
            className="accent-pink-500"
          />
          Save answer to student memory
        </label>

        <button
          onClick={onGenerate}
          disabled={generating}
          title="Generate from the preceding content"
          className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 disabled:opacity-50"
        >
          <Sparkles size={11} />
          {generating ? 'generating…' : 'regenerate'}
        </button>

        <button
          onClick={() => { onChange(''); setEditing(false); }}
          title="Remove engagement question"
          className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"
        >
          <X size={11} /> remove
        </button>
      </div>
    </div>
  );
};

export default UserQuestionEditor;
