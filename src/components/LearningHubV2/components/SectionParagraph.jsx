import React from 'react';
import useTypewriter from '../hooks/useTypewriter';

// Parse bold (**), underline (__), italic (*), and link [text](url) formatting
const renderFormattedText = (text) => {
  const parts = text.split(/(\*\*.+?\*\*[:\.,;!?]?|__.+?__[:\.,;!?]?|\[(?:[^\]]+)\]\((?:[^)]+)\)|(?<!\*)\*(?!\*)(?:[^*]+)\*(?!\*)[:\.,;!?]?)/g);

  return parts.map((part, i) => {
    if (part === undefined) return null;

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.match(/\*\*[:\.,;!?]?$/)) {
      const innerText = part.replace(/^\*\*/, '').replace(/\*\*[:\.,;!?]?$/, '');
      const trailingPunct = part.match(/\*\*([:\.,;!?])$/)?.[1] || '';
      return <strong key={i} className="font-semibold">{innerText}{trailingPunct}</strong>;
    }

    // Underline: __text__
    if (part.startsWith('__') && part.match(/__[:\.,;!?]?$/)) {
      const innerText = part.replace(/^__/, '').replace(/__[:\.,;!?]?$/, '');
      const trailingPunct = part.match(/__([:\.,;!?])$/)?.[1] || '';
      return <u key={i}>{innerText}{trailingPunct}</u>;
    }

    // Italic: *text*
    if (part.match(/^(?<!\*)\*(?!\*)(.+)\*(?!\*)[:\.,;!?]?$/)) {
      const innerText = part.replace(/^\*/, '').replace(/\*[:\.,;!?]?$/, '');
      const trailingPunct = part.match(/\*([:\.,;!?])$/)?.[1] || '';
      return <em key={i}>{innerText}{trailingPunct}</em>;
    }

    return <span key={i}>{part}</span>;
  });
};

const SectionParagraph = ({ section, animate = true, delay = 0, onComplete }) => {
  const text = typeof section.content === 'string'
    ? section.content
    : section.content?.text || section.content_text;

  const { revealedText, isComplete, lookaheadWord } = useTypewriter(text, {
    speed: 33,
    delay,
    enabled: animate,
    onComplete,
  });

  const cursorDot = <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />;
  // Invisible rest-of-word keeps the word together for line-break calculation
  const cursor = !isComplete ? (
    <>
      {cursorDot}
      {lookaheadWord && <span style={{ color: 'transparent', pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">{lookaheadWord}</span>}
    </>
  ) : null;

  // Show cursor immediately during delay, before text starts
  if (!revealedText && !isComplete) {
    return (
      <p className="text-base font-light leading-relaxed mb-6 text-black" style={{ letterSpacing: '-0.01em' }}>
        {cursor}
      </p>
    );
  }
  if (!revealedText) return null;

  const lines = revealedText.split('\n');
  const fullLines = text ? text.split('\n') : [];
  const hasBullets = fullLines.some(line => /^[•\-]\s/.test(line.trim()));
  const hasMultipleLines = fullLines.filter(line => line.trim()).length > 1;

  if (hasBullets || hasMultipleLines) {
    const lastLineIdx = lines.length - 1;
    return (
      <div className="mb-6">
        {lines.map((line, idx) => {
          const trimmedLine = line.trim();
          const isLast = idx === lastLineIdx;
          if (/^[•\-]\s/.test(trimmedLine)) {
            const bulletText = trimmedLine.replace(/^[•\-]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 mb-1" style={{ paddingLeft: 10 }}>
                <span className="text-black leading-relaxed">•</span>
                <span className="text-base font-light leading-relaxed flex-1 text-black" style={{ letterSpacing: '-0.01em' }}>
                  {renderFormattedText(bulletText)}{isLast && cursor}
                </span>
              </div>
            );
          } else if (trimmedLine) {
            return (
              <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em' }}>
                {renderFormattedText(line)}{isLast && cursor}
              </p>
            );
          } else if (isLast && !isComplete) {
            // Empty last line during newline pause — show cursor at start of new line
            return (
              <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em' }}>
                <span className="inline-block" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />
              </p>
            );
          } else if (hasMultipleLines) {
            return <div key={idx} className="h-2" />;
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <p className="text-base font-light leading-relaxed mb-6 text-black" style={{ letterSpacing: '-0.01em' }}>
      {renderFormattedText(revealedText)}{cursor}
    </p>
  );
};

export default SectionParagraph;
