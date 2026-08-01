import React, { useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Bullet list editing, matching SectionList's output:
 * `<ul className="list-disc list-inside space-y-2 mb-6">` with
 * `<li className="text-base leading-relaxed">` per item.
 *
 * Note SectionList does NOT parse inline markdown for items — unlike paragraph
 * bullets, which do. So there is no formatting toolbar here on purpose.
 */
const EditableBulletList = ({ items = [], onChange }) => {
  const refs = useRef([]);

  const setItem = (idx, text) => {
    const next = [...items];
    next[idx] = text;
    onChange(next);
  };

  const addAfter = (idx) => {
    const next = [...items];
    next.splice(idx + 1, 0, '');
    onChange(next);
    requestAnimationFrame(() => refs.current[idx + 1]?.focus());
  };

  const removeAt = (idx) => {
    if (items.length === 1) { onChange(['']); return; }
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
    requestAnimationFrame(() => refs.current[Math.max(0, idx - 1)]?.focus());
  };

  return (
    <ul className="list-disc list-inside space-y-2 mb-6">
      {items.map((item, idx) => (
        <li key={idx} className="text-base leading-relaxed group/item">
          <span className="relative" style={{ display: 'inline-flex', width: 'calc(100% - 1.5em)', alignItems: 'center' }}>
            <input
              ref={(el) => (refs.current[idx] = el)}
              value={item}
              onChange={(e) => setItem(idx, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addAfter(idx); }
                if (e.key === 'Backspace' && item === '' && items.length > 1) {
                  e.preventDefault(); removeAt(idx);
                }
              }}
              placeholder="List item"
              className="text-base leading-relaxed"
              style={{
                flex: 1, border: 0, outline: 'none', background: 'transparent',
                padding: 0, fontFamily: 'inherit', color: '#000000',
              }}
            />
            <button
              onClick={() => removeAt(idx)}
              title="Remove item"
              className="opacity-0 group-hover/item:opacity-100 transition p-0.5 rounded hover:bg-gray-100 text-gray-400"
            >
              <X size={12} />
            </button>
          </span>
        </li>
      ))}
      <li style={{ listStyle: 'none', marginLeft: '-1em' }}>
        <button
          onClick={() => addAfter(items.length - 1)}
          className="text-xs text-gray-400 hover:text-gray-700 transition"
        >
          + add item
        </button>
      </li>
    </ul>
  );
};

export default EditableBulletList;
