import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const ChatInput = forwardRef(({ value, onChange, onSubmit, placeholder = '' }, ref) => {
  const textareaRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="w-full bg-white rounded-xl px-6 py-3 pr-14 font-light text-gray-900 caret-[#EF0B72] focus:outline-none transition-all resize-none"
        style={{
          boxShadow: isHovered
            ? '0 0 10px rgba(103,103,103,0.75)'
            : '0 0 10px rgba(103,103,103,0.6)',
          fontSize: '14px',
          minHeight: '48px',
          maxHeight: '160px',
          letterSpacing: '-0.01em',
        }}
        onInput={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
        }}
      />
      <button
          type="submit"
          className="absolute cursor-pointer flex items-center justify-center"
          style={{
            right: 12,
            top: 8,
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: '#F0F0F0',
            opacity: value.trim() ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: value.trim() ? 'auto' : 'none',
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
