import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { TEXT_METRICS, TEXTAREA_RESET, assertMetricsMatch } from '@shared/lesson/textMetrics';
import { applyMarker, applyLink, insertBullet, insertToken } from '@shared/lesson/markers';
import MarkupToolbar from './MarkupToolbar';

/**
 * Click-to-edit text.
 *
 * Unfocused it renders `children` — the untouched shared renderer, so the canvas
 * shows exactly what students see. Focused it swaps to a <textarea> carrying the
 * same type metrics and revealing the raw marker syntax.
 *
 * Honest limitation: revealing markers makes the text longer, so a block
 * containing **bold** or a link reflows on focus. Single-line plain paragraphs
 * and all headings do not move. The wrapper holds its pre-focus height as a
 * minimum so nothing below ever jumps upward.
 */
const EditableText = ({
  value,
  onChange,
  variant = 'paragraph',
  placeholder = 'Type here…',
  showToken = false,
  children,
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [minHeight, setMinHeight] = useState(undefined);

  const wrapperRef = useRef(null);
  const renderedRef = useRef(null);
  const textareaRef = useRef(null);
  const revertRef = useRef('');
  const pendingSelection = useRef(null);

  const metrics = TEXT_METRICS[variant] || TEXT_METRICS.paragraph;

  // Keep the draft in step when the value changes from outside (load, undo,
  // AI generation) — but never while the user is typing into it.
  useLayoutEffect(() => {
    if (!focused) setDraft(value ?? '');
  }, [value, focused]);

  const beginEdit = useCallback(
    (e) => {
      if (focused) return;
      // Let clicks on real links inside the rendered output behave normally.
      if (e.target.closest?.('a')) return;
      e.preventDefault();
      setMinHeight(wrapperRef.current?.offsetHeight);
      revertRef.current = value ?? '';
      setDraft(value ?? '');
      setFocused(true);
    },
    [focused, value]
  );

  // Auto-grow, restore any pending selection, and check metrics in dev.
  useLayoutEffect(() => {
    if (!focused) return;
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;

    if (pendingSelection.current) {
      const { start, end } = pendingSelection.current;
      el.setSelectionRange(start, end);
      pendingSelection.current = null;
    }
  }, [focused, draft]);

  useLayoutEffect(() => {
    if (!focused) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (renderedRef.current) assertMetricsMatch(renderedRef.current, el, variant);
    // Caret at the end is better than the start for short blocks and is the
    // predictable default; click-point mapping would need the segment offsets.
    const len = el.value.length;
    el.setSelectionRange(len, len);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const commit = (next) => {
    setDraft(next);
    onChange(next);
  };

  const runOnSelection = (fn) => {
    const el = textareaRef.current;
    if (!el) return;
    const result = fn(draft, el.selectionStart, el.selectionEnd);
    pendingSelection.current = { start: result.start, end: result.end };
    commit(result.text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onChange(revertRef.current);
      setDraft(revertRef.current);
      setFocused(false);
      return;
    }
    if (e.key === 'Enter') {
      // Headings are a single concept — Enter commits rather than wrapping.
      if (variant !== 'paragraph') { e.preventDefault(); setFocused(false); return; }
      if (e.metaKey || e.ctrlKey) { e.preventDefault(); setFocused(false); }
      return;
    }
    if ((e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      const marker = { b: '**', i: '*', u: '__' }[e.key.toLowerCase()];
      runOnSelection((t, s, en) => applyMarker(t, s, en, marker));
    }
  };

  if (!focused) {
    const isEmpty = !value || !String(value).trim();
    return (
      <div
        ref={wrapperRef}
        onMouseDown={beginEdit}
        style={{ cursor: 'text', position: 'relative' }}
      >
        <div ref={renderedRef}>
          {isEmpty ? (
            <p
              style={{
                ...metrics,
                fontWeight: metrics.fontWeight,
                color: '#BDBDBD',
                fontStyle: 'italic',
              }}
            >
              {placeholder}
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', minHeight }}>
      <MarkupToolbar
        showToken={showToken}
        onMarker={(m) => runOnSelection((t, s, e) => applyMarker(t, s, e, m))}
        onLink={(url) => runOnSelection((t, s, e) => applyLink(t, s, e, url))}
        onBullet={() => runOnSelection((t, s) => insertBullet(t, s))}
        onToken={() => runOnSelection((t, s, e) => insertToken(t, s, e))}
      />

      {/* Marks source mode without adding a border that would shift layout */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: -14, top: metrics.marginTop || 0, bottom: metrics.marginBottom,
          width: 2, borderRadius: 2, background: '#EF0B72', opacity: 0.35,
        }}
      />

      <textarea
        ref={textareaRef}
        value={draft}
        rows={1}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ ...metrics, ...TEXTAREA_RESET }}
      />
    </div>
  );
};

export default EditableText;
