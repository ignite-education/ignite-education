import React, { useState, useRef, useLayoutEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

const MAX = 55;

/**
 * The suggested-question chip attached to an H2.
 *
 * Students see this as a grey pill above the chat input — tapping it asks the
 * tutor that question. It is inherited: screens under an H2 that have no H2 of
 * their own show the parent's chip, which is why it belongs to the heading
 * block rather than to a screen.
 *
 * Styling mirrors LearningHubV2's chip exactly (#F0F0F0, 300 weight, text-sm).
 */
const SuggestedQuestionEditor = ({ value, onChange, onGenerate, generating }) => {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  useLayoutEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const has = !!(value && value.trim());

  // Nothing authored: stay out of the way until the block is hovered.
  if (!has && !editing) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ marginBottom: 12, height: 22 }}
      >
        <div style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s ease', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-gray-700 transition"
          >
            + suggested question
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
      style={{ marginBottom: 12 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2">
        <div
          className="text-left text-sm text-black px-4 py-2.5 rounded-lg"
          style={{ backgroundColor: '#F0F0F0', letterSpacing: '-0.01em', fontWeight: 300, maxWidth: 420, flex: '0 1 auto' }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={value || ''}
              maxLength={MAX}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
              placeholder="e.g. How does this apply in practice?"
              className="text-sm text-black w-full"
              style={{
                border: 0, outline: 'none', background: 'transparent', padding: 0,
                fontFamily: 'inherit', fontWeight: 300, letterSpacing: '-0.01em', minWidth: 260,
              }}
            />
          ) : (
            <span onClick={() => setEditing(true)} style={{ cursor: 'text' }}>{value}</span>
          )}
        </div>

        <div
          className="flex items-center gap-1"
          style={{ opacity: hovered || editing ? 1 : 0, transition: 'opacity 0.12s ease' }}
        >
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {(value || '').length}/{MAX}
          </span>
          <button
            onClick={onGenerate}
            disabled={generating}
            title="Generate from this section's content"
            className="p-1 rounded hover:bg-gray-100 text-purple-500 disabled:opacity-50"
          >
            <Sparkles size={12} />
          </button>
          <button
            onClick={() => { onChange(''); setEditing(false); }}
            title="Remove suggested question"
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400" style={{ marginTop: 4 }}>
        Tappable chip beside the chat input. Carries onto the following screens
        until the next H2 heading.
      </p>
    </div>
  );
};

export default SuggestedQuestionEditor;
