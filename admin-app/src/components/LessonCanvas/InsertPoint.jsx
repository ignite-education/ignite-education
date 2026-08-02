import React, { useEffect, useRef, useState } from 'react';
import { Plus, Type, Pilcrow, List as ListIcon, Image as ImageIcon, Youtube, Pen, HelpCircle, ArrowLeftRight } from 'lucide-react';
import { CREATABLE_BLOCK_TYPES, BLOCK_LABELS } from '@shared/lesson/blockTypes';

/**
 * Insert a block at a specific point on the canvas.
 *
 * The toolbar only appends to the end of the lesson, which meant the only way to
 * put a quiz under a particular paragraph was to add it at the bottom and press
 * Move up until it arrived.
 *
 * Zero height by design. The canvas's invariant is that every edit affordance is
 * a sibling outside the text measure — nothing may be injected into the flow, or
 * the canvas stops showing where a student's text actually falls. So this
 * occupies no space: the hover target and the button are both absolutely
 * positioned over the gap that already exists between blocks.
 */

const ICONS = {
  heading: Type,
  paragraph: Pilcrow,
  bulletlist: ListIcon,
  image: ImageIcon,
  youtube: Youtube,
  svg: Pen,
  scored_question: HelpCircle,
  box_match: ArrowLeftRight,
};

// Both gates are tinted so they read as interruptions, matching the toolbar.
const GATE_TYPES = ['scored_question', 'box_match'];

const InsertPoint = ({ onInsert, label = 'Insert a block here' }) => {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = hovered || open;

  return (
    <div ref={ref} style={{ position: 'relative', height: 0 }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'absolute', left: 0, right: 0, top: -11, height: 22, zIndex: open ? 20 : 6 }}
      >
        {/* Hairline across the insertion point, so it's clear where the block lands. */}
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, top: 10,
            borderTop: '1px dashed #EF0B72',
            opacity: visible ? 0.45 : 0,
            transition: 'opacity 0.12s ease',
            pointerEvents: 'none',
          }}
        />
        <button
          onClick={() => setOpen((v) => !v)}
          title={label}
          aria-label={label}
          aria-expanded={open}
          className="flex items-center justify-center"
          style={{
            position: 'absolute', left: 0, top: 0,
            width: 20, height: 20, borderRadius: 999,
            background: '#FFFFFF',
            border: `1px solid ${open ? '#EF0B72' : '#E6E6E6'}`,
            color: open ? '#EF0B72' : '#A8A8A8',
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            transition: 'opacity 0.12s ease, border-color 0.12s, color 0.12s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Plus size={12} />
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: 'absolute', left: 0, top: 26, zIndex: 30,
              background: '#FFFFFF',
              border: '1px solid #E6E6E6',
              borderRadius: 8,
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
              padding: 4,
              minWidth: 160,
            }}
          >
            {CREATABLE_BLOCK_TYPES.map((type) => {
              const Icon = ICONS[type] || Pilcrow;
              const isGate = GATE_TYPES.includes(type);
              return (
                <button
                  key={type}
                  role="menuitem"
                  onClick={() => { setOpen(false); setHovered(false); onInsert(type); }}
                  className="w-full flex items-center gap-2 rounded transition"
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.78rem',
                    letterSpacing: '-0.01em',
                    color: isGate ? '#EF0B72' : '#000000',
                    textAlign: 'left',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = isGate ? '#FFF7FB' : '#F5F5F5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={13} style={{ color: isGate ? '#EF0B72' : '#A8A8A8', flexShrink: 0 }} />
                  {BLOCK_LABELS[type] || type}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InsertPoint;
