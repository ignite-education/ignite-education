import React from 'react';
import useTypewriter from '../hooks/useTypewriter';

const SectionHeading = ({ section, delay = 0, onComplete }) => {
  const level = section.content?.level || 2;
  const text = section.content?.text || section.title;
  const HeadingTag = `h${level}`;

  const { revealedText, isComplete } = useTypewriter(text, {
    speed: 55,
    delay,
    enabled: true,
    onComplete,
  });

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
    const cursorOnly = <span className="inline-block" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />;
    if (level === 2) {
      return (
        <div className="mt-0 mb-3">
          <HeadingTag className="text-xl" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
            {cursorOnly}
          </HeadingTag>
        </div>
      );
    }
    return (
      <HeadingTag className="text-lg mt-5 mb-1.5" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
        {cursorOnly}
      </HeadingTag>
    );
  }
  if (!revealedText) return null;

  if (level === 2) {
    return (
      <div className="mt-0 mb-3">
        <HeadingTag className="text-xl" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
          {renderFormattedText(revealedText)}
          {!isComplete && <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />}
        </HeadingTag>
      </div>
    );
  }

  return (
    <HeadingTag className="text-lg mt-5 mb-1.5" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
      {renderFormattedText(revealedText)}
      {!isComplete && <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />}
    </HeadingTag>
  );
};

export default SectionHeading;
