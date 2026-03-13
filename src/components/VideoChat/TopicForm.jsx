import React, { useState, useRef, useEffect } from 'react';

const FIELD_BG = '#F6F6F6';

const errorOutline = (invalid) => ({
  outline: '0.5px solid',
  outlineColor: invalid ? '#EF0B72' : 'transparent',
  transition: 'outline-color 0.6s ease',
});

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const TopicForm = ({ lessons, onJoin, disabled, mediaReady, onMediaInvalid, readOnly, queuePosition }) => {
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [topicOpen, setTopicOpen] = useState(false);
  const [invalidFields, setInvalidFields] = useState(new Set());
  const [showJoining, setShowJoining] = useState(false);
  const blurTimeout = useRef(null);
  const questionRef = useRef(null);
  const joiningTimer = useRef(null);

  useEffect(() => {
    if (!readOnly) questionRef.current?.focus();
  }, [readOnly]);

  // Show "Joining..." for at least 500ms before showing queue position
  useEffect(() => {
    if (disabled && !readOnly) {
      setShowJoining(true);
      joiningTimer.current = Date.now();
    }
    if (readOnly && showJoining) {
      const elapsed = Date.now() - (joiningTimer.current || 0);
      const remaining = Math.max(500 - elapsed, 0);
      const id = setTimeout(() => setShowJoining(false), remaining);
      return () => clearTimeout(id);
    }
  }, [disabled, readOnly]);

  const clearError = (field) => {
    if (invalidFields.has(field)) {
      setInvalidFields(prev => { const next = new Set(prev); next.delete(field); return next; });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    const missing = new Set();
    if (!topic) missing.add('topic');
    if (!question.trim()) missing.add('question');
    if (!mediaReady?.camera || !mediaReady?.mic) missing.add('media');
    if (missing.size > 0) {
      setInvalidFields(missing);
      if (missing.has('media') && onMediaInvalid) onMediaInvalid();
      setTimeout(() => setInvalidFields(new Set()), 1300);
      return;
    }
    if (!disabled) {
      onJoin(topic, question.trim());
    }
  };

  const allOptions = [
    ...(lessons?.map(l => l.lesson_name) || []),
    'Other',
  ];

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Topic selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', flexShrink: 0, letterSpacing: '-0.01em', width: '80px' }}>
          Topic
        </label>
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setTopicOpen(prev => !prev); clearError('topic'); }}
            onBlur={() => { blurTimeout.current = setTimeout(() => setTopicOpen(false), 150); }}
            style={{
              width: '100%',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.875rem',
              textAlign: 'left',
              border: 'none',
              backgroundColor: FIELD_BG,
              color: topic ? '#111827' : '#9CA3AF',
              fontWeight: 300,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'inherit',
              transition: 'colors 0.15s',
              ...errorOutline(invalidFields.has('topic')),
            }}
          >
            <span>{topic || '\u00A0'}</span>
            <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: topicOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
          </button>
          <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '100%',
                marginTop: '4px',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflowY: 'auto',
                zIndex: 30,
                maxHeight: '160px',
                scrollbarWidth: 'none',
                overscrollBehavior: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                opacity: topicOpen ? 1 : 0,
                transform: topicOpen ? 'scaleY(1)' : 'scaleY(0.95)',
                transformOrigin: 'top',
                pointerEvents: topicOpen ? 'auto' : 'none',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
              }}
            >
              {allOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setTopic(name); setTopicOpen(false); clearError('topic'); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    color: '#111827',
                    backgroundColor: topic === name ? '#F6F6F6' : 'transparent',
                    fontWeight: topic === name ? 500 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F6F6F6'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = topic === name ? '#F6F6F6' : 'transparent'; }}
                >
                  {name}
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* Question input */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <label style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', flexShrink: 0, letterSpacing: '-0.01em', width: '80px', paddingTop: '8px' }}>
          Question
        </label>
        <textarea
          ref={questionRef}
          value={question}
          onChange={(e) => { setQuestion(e.target.value); clearError('question'); }}
          placeholder=""
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '0.875rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: FIELD_BG,
            color: '#000',
            fontWeight: 300,
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            boxSizing: 'border-box',
            ...errorOutline(invalidFields.has('question')),
          }}
        />
      </div>

      {/* Join button / Queue position */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '92px' }}>
        {(readOnly && !showJoining) ? (
          <>
            <button
              type="button"
              style={{
                width: '200px',
                height: '40px',
                padding: 0,
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: 'white',
                cursor: 'default',
                flexShrink: 0,
                boxShadow: 'none',
                outline: 'none',
              }}
            >
              {(queuePosition || 1) === 1 ? "You're up next" : `You're ${ordinal(queuePosition)} in the list`}
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '0.9rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em' }}>
              You'll automatically connect when it's your turn
            </span>
          </>
        ) : (
          <button
            type="submit"
            disabled={disabled}
            style={{
              width: '200px',
              height: '40px',
              padding: 0,
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#EF0B72',
              color: 'white',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'box-shadow 0.3s ease',
            }}
            onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.6)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            {(disabled || showJoining) ? (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {'Joining...'.split('').map((char, i) => (
                  <span
                    key={i}
                    style={{
                      animation: 'letterFadeIn 0.4s ease forwards',
                      animationDelay: `${i * 0.03}s`,
                      opacity: 0,
                    }}
                  >{char}</span>
                ))}
              </span>
            ) : 'Join Office Hours'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes letterFadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </form>
  );
};

export default TopicForm;
