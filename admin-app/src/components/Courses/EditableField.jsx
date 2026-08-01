import React, { useState, useRef, useLayoutEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';

const inputCls =
  'w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:border-pink-500 focus:outline-none';

/**
 * A course field that is read-only until you click its pencil.
 *
 * Course settings are read far more often than they're changed, and a grid of
 * live inputs invites accidental edits that only surface after Save. Requiring
 * an explicit click makes editing deliberate without hiding the value.
 *
 * Nothing here persists — it edits the parent's draft state; "Save course"
 * still writes.
 */
const EditableField = ({
  label,
  value,
  onChange,
  options,          // present → renders a <select>
  placeholder,
  format,           // optional display formatter
  mono = false,
  span = false,     // stretch across the settings grid
  inline = false,   // no label / no min-height — for outline rows
  bold = false,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  useLayoutEffect(() => {
    if (editing) {
      ref.current?.focus();
      if (ref.current?.select) ref.current.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft !== value) onChange(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  const display = value ? (format ? format(value) : value) : null;

  const wrapperStyle = span ? { gridColumn: '1 / -1' } : undefined;

  return (
    <div
      style={wrapperStyle}
      className={inline ? 'flex-1 min-w-0' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!inline && <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>}

      {editing ? (
        <div className="flex items-center gap-1">
          {options ? (
            <select
              ref={ref}
              value={draft}
              onChange={(e) => {
                // A select is already a deliberate act — commit and close.
                setDraft(e.target.value);
                if (e.target.value !== value) onChange(e.target.value);
                setEditing(false);
              }}
              onBlur={cancel}
              className={inputCls}
            >
              {options.map((o) => (
                <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
              ))}
            </select>
          ) : (
            <>
              <input
                ref={ref}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit();
                  if (e.key === 'Escape') cancel();
                }}
                onBlur={commit}
                placeholder={placeholder}
                className={`${inputCls} ${mono ? 'font-mono text-xs' : ''}`}
              />
              {/* preventDefault keeps focus off these, so blur-commit doesn't
                  fire before the click registers. */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={commit}
                title="Apply"
                className="p-1 rounded text-gray-500 hover:text-green-600 hover:bg-gray-100 flex-shrink-0"
              >
                <Check size={13} />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={cancel}
                title="Cancel"
                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 flex-shrink-0"
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={`flex items-center gap-1 ${inline ? '' : 'min-h-[30px]'}`}>
          <span
            onDoubleClick={() => setEditing(true)}
            className={`text-sm flex-1 min-w-0 truncate ${
              display ? 'text-gray-900' : 'text-gray-400 italic'
            } ${mono ? 'font-mono text-xs' : ''} ${bold ? 'font-medium' : ''}`}
            title={display || undefined}
          >
            {display || placeholder || 'Not set'}
          </span>
          <button
            onClick={() => setEditing(true)}
            title={`Edit ${label.toLowerCase()}`}
            className="p-1 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0"
            style={{ opacity: hovered ? 1 : 0.35, transition: 'opacity 0.12s ease' }}
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default EditableField;
