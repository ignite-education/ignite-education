import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import useIsMobile from '@shared/lesson/hooks/useIsMobile';

const ChatInput = forwardRef(({ value, onChange, onSubmit, placeholder = '', disabled = false }, ref) => {
  const textareaRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [wrapperHeight, setWrapperHeight] = useState(48);
  const isMobile = useIsMobile(768);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const recalcHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 62);
    el.style.height = newHeight + 'px';
    setWrapperHeight(newHeight);
  };

  useEffect(() => {
    recalcHeight();
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(value.trim());
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: wrapperHeight,
        transition: 'height 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!isMobile) return;
          // iOS Safari scrolls the document up to reveal a focused input above the
          // keyboard and often leaves that offset behind on dismiss, showing as
          // whitespace under the input. Snap back to top (now and after the
          // keyboard's dismiss animation finishes).
          window.scrollTo(0, 0);
          setTimeout(() => window.scrollTo(0, 0), 300);
        }}
        aria-label={placeholder || undefined}
        rows={1}
        className="w-full bg-white rounded-xl px-6 py-3 pr-14 font-light text-gray-900 caret-[#EF0B72] focus:outline-none resize-none"
        style={{
          boxShadow: isHovered
            ? '0 0 10px rgba(103,103,103,0.75)'
            : '0 0 10px rgba(103,103,103,0.6)',
          transition: 'box-shadow 0.2s ease-in-out',
          // iOS Safari zooms when a focused input's font-size is < 16px — keep ≥16px on mobile
          fontSize: isMobile ? '16px' : '14px',
          minHeight: '48px',
          maxHeight: '62px',
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          letterSpacing: '-0.01em',
        }}
        onInput={recalcHeight}
      />
      {/*
        The placeholder is drawn rather than handed to the textarea's `placeholder`
        attribute, for two reasons the native one can't do: it fades out as the
        student starts typing (the browser drops a native placeholder instantly),
        and it sits 3.6px right of the text origin so it doesn't crowd the caret,
        which rests at the textarea's own 24px padding.

        Padding mirrors the textarea's `px-6 py-3 pr-14` exactly — apart from that
        left nudge — so the text lands on the same baseline as what gets typed,
        whatever the line-height resolves to. The textarea keeps an `aria-label`
        so the hint still reaches screen readers.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          padding: '12px 56px 12px 27.6px',
          fontSize: isMobile ? '16px' : '14px',
          fontWeight: 300,
          letterSpacing: '-0.01em',
          color: '#9CA3AF',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: value ? 0 : 1,
          transition: 'opacity 0.2s ease-out',
        }}
      >
        {placeholder}
      </div>
      <button
          type="submit"
          className="absolute cursor-pointer flex items-center justify-center"
          style={{
            right: 12,
            top: (wrapperHeight - 32) / 2,
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: '#F0F0F0',
            opacity: value.trim() && !disabled ? 1 : 0,
            transition: 'top 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s ease-in-out',
            pointerEvents: value.trim() && !disabled ? 'auto' : 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.querySelector('svg').style.stroke = '#EF0B72'; }}
          onMouseLeave={(e) => { e.currentTarget.querySelector('svg').style.stroke = 'black'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.15s' }}>
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
    </form>
  );
});

export default ChatInput;
