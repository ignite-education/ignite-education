import React, { useEffect, useRef } from 'react';
import useTypewriter from '../hooks/useTypewriter.js';
import useIsMobile from '../hooks/useIsMobile.js';
import { normalizeTextForNarration, splitIntoWords } from '../textNormalization.js';

const SectionHeading = ({ section, delay = 0, onComplete, narrationActive = false, wordIndexOffset = 0, revealIndex = -1, sentenceStart = -1, sentenceEnd = -1, skipAnimation = false }) => {
  const level = section.content?.level || 2;
  const text = section.content?.text || section.title;
  const HeadingTag = `h${level}`;
  const isMobile = useIsMobile(768);

  // When skipping animation (restoring progress), call onComplete immediately
  const skipCalledRef = useRef(false);
  useEffect(() => {
    if (skipAnimation && onComplete && !skipCalledRef.current) {
      skipCalledRef.current = true;
      onComplete();
    }
  }, [skipAnimation, onComplete]);

  const { revealedText, isComplete } = useTypewriter(text, {
    speed: 55,
    delay: skipAnimation ? 0 : delay,
    enabled: !skipAnimation,
    onComplete: skipAnimation ? undefined : onComplete,
  });

  // --- Narration mode: render with word-index spans ---
  if (narrationActive && text) {
    const normalized = normalizeTextForNarration(text);
    const words = splitIntoWords(normalized);
    const wordStyleFor = (idx) => {
      const inSentence = sentenceStart >= 0 && idx >= sentenceStart && idx <= sentenceEnd;
      const style = {
        padding: '2px',
        margin: '-2px',
        borderRadius: '2px',
        transition: inSentence ? 'background-color 0s' : 'background-color 0.35s ease',
        backgroundColor: inSentence ? '#fef0f8' : 'transparent',
      };
      if (idx === revealIndex) style.boxShadow = 'inset 0 0 0 100px #fbcee7';
      return style;
    };

    // Split visible text by spaces, assign word indices
    const visibleWords = text
      .replace(/__/g, '') // strip underline markers for display
      .split(/(\s+)/);

    let wordCounter = 0;
    const wordSpans = visibleWords.map((part, j) => {
      if (/^\s+$/.test(part)) return <span key={`sp-${j}`}>{part}</span>;
      if (!part) return null;
      const idx = wordIndexOffset + wordCounter;
      wordCounter++;
      return (
        <span key={`w-${idx}`} data-word-index={idx} style={wordStyleFor(idx)}>
          {part}
        </span>
      );
    });

    if (level === 2) {
      return (
        <div className="mb-3" style={{ marginTop: '10px' }}>
          <HeadingTag className={isMobile ? '' : 'text-xl'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
            {wordSpans}
          </HeadingTag>
        </div>
      );
    }

    return (
      <HeadingTag className={isMobile ? 'mt-5 mb-1.5' : 'text-lg mt-5 mb-1.5'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
        {wordSpans}
      </HeadingTag>
    );
  }

  // Skip animation: render full text immediately
  if (skipAnimation && text) {
    const renderFull = (t) => {
      const parts = t.split(/(__[^_]+__[:\.,;!?]?)/g);
      return parts.map((part, i) => {
        if (part.startsWith('__') && part.match(/__[:\.,;!?]?$/)) {
          const innerText = part.replace(/^__/, '').replace(/__[:\.,;!?]?$/, '');
          const trailingPunct = part.match(/__([:\.,;!?])$/)?.[1] || '';
          return <u key={i}>{innerText}{trailingPunct}</u>;
        }
        return <span key={i}>{part}</span>;
      });
    };
    if (level === 2) {
      return (
        <div className="mb-3" style={{ marginTop: '10px' }}>
          <HeadingTag className={isMobile ? '' : 'text-xl'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
            {renderFull(text)}
          </HeadingTag>
        </div>
      );
    }
    return (
      <HeadingTag className={isMobile ? 'mt-5 mb-1.5' : 'text-lg mt-5 mb-1.5'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
        {renderFull(text)}
      </HeadingTag>
    );
  }

  // Parse underline formatting (__text__)
  const renderFormattedText = (text) => {
    const parts = text.split(/(__[^_]+__[:\.,;!?]?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('__') && part.match(/__[:\.,;!?]?$/)) {
        const innerText = part.replace(/^__/, '').replace(/__[:\.,;!?]?$/, '');
        const trailingPunct = part.match(/__([:\.,;!?])$/)?.[1] || '';
        return <u key={i}>{innerText}{trailingPunct}</u>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Show cursor immediately during delay, before text starts
  if (!revealedText && !isComplete) {
    const cursorOnly = <span data-scroll-anchor className="inline-block" style={{ width: 8, height: 8, backgroundColor: '#8200EA', borderRadius: 1, verticalAlign: 'middle', position: 'relative', top: '-1px', animation: 'purplePulse 1.2s ease-in-out infinite' }} />;
    if (level === 2) {
      return (
        <div className="mb-3" style={{ marginTop: '10px' }}>
          <HeadingTag className={isMobile ? '' : 'text-xl'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
            {cursorOnly}
          </HeadingTag>
        </div>
      );
    }
    return (
      <HeadingTag className={isMobile ? 'mt-5 mb-1.5' : 'text-lg mt-5 mb-1.5'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
        {cursorOnly}
      </HeadingTag>
    );
  }
  if (!revealedText) return null;

  if (level === 2) {
    return (
      <div className="mb-3" style={{ marginTop: '10px' }}>
        <HeadingTag className={isMobile ? '' : 'text-xl'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
          {renderFormattedText(revealedText)}
          {!isComplete && <span data-scroll-anchor className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />}
        </HeadingTag>
      </div>
    );
  }

  return (
    <HeadingTag className={isMobile ? 'mt-5 mb-1.5' : 'text-lg mt-5 mb-1.5'} style={{ fontWeight: 500, letterSpacing: '-0.01em', ...(isMobile && { fontSize: '1.1rem' }) }}>
      {renderFormattedText(revealedText)}
      {!isComplete && <span data-scroll-anchor className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />}
    </HeadingTag>
  );
};

export default SectionHeading;
