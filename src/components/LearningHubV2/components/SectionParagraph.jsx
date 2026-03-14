import React from 'react';
import useTypewriter from '../hooks/useTypewriter';

// Parse bold (**), underline (__), italic (*), and link [text](url) formatting
// When inProgress is true, unclosed markers at the end of the string are rendered
// in their intended style immediately (e.g. "*partial" renders italic while typing)
const renderFormattedText = (text, { inProgress = false } = {}) => {
  const parts = text.split(/(\*\*.+?\*\*[:\.,;!?]?|__.+?__[:\.,;!?]?|\[(?:[^\]]+)\]\((?:[^)]+)\)|(?<!\*)\*(?!\*)(?:[^*]+)\*(?!\*)[:\.,;!?]?)/g);

  const rendered = parts.map((part, i) => {
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

  // During typing, handle unclosed formatting markers at the end of the string
  if (inProgress && rendered.length > 0) {
    const lastIdx = rendered.length - 1;
    const lastPart = parts[lastIdx];
    if (lastPart) {
      // Unclosed bold: **text (no closing **) — [^*]* allows zero chars so ** alone doesn't flash
      const unclosedBold = lastPart.match(/^(.*)\*\*([^*]*)$/s);
      if (unclosedBold) {
        rendered[lastIdx] = (
          <span key={lastIdx}>
            {unclosedBold[1] && <span>{unclosedBold[1]}</span>}
            <strong className="font-semibold">{unclosedBold[2]}</strong>
          </span>
        );
        return rendered;
      }
      // Unclosed underline: __text (no closing __)
      const unclosedUnderline = lastPart.match(/^(.*)__([^_]*)$/s);
      if (unclosedUnderline) {
        rendered[lastIdx] = (
          <span key={lastIdx}>
            {unclosedUnderline[1] && <span>{unclosedUnderline[1]}</span>}
            <u>{unclosedUnderline[2]}</u>
          </span>
        );
        return rendered;
      }
      // Unclosed italic: *text (no closing *, and not **)
      const unclosedItalic = lastPart.match(/^(.*?)(?<!\*)\*(?!\*)([^*]*)$/s);
      if (unclosedItalic) {
        rendered[lastIdx] = (
          <span key={lastIdx}>
            {unclosedItalic[1] && <span>{unclosedItalic[1]}</span>}
            <em>{unclosedItalic[2]}</em>
          </span>
        );
        return rendered;
      }
    }
  }

  return rendered;
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

  // Show pulsing cursor during delay, before text starts
  if (!revealedText && !isComplete) {
    return (
      <p className="text-base font-light leading-relaxed mb-6 text-black" style={{ letterSpacing: '-0.01em' }}>
        <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px', animation: 'purplePulse 1.2s ease-in-out infinite' }} />
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
                  {renderFormattedText(bulletText, { inProgress: isLast && !isComplete })}{isLast && cursor}
                </span>
              </div>
            );
          } else if (trimmedLine) {
            return (
              <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em' }}>
                {renderFormattedText(line, { inProgress: isLast && !isComplete })}{isLast && cursor}
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
      {renderFormattedText(revealedText, { inProgress: !isComplete })}{cursor}
    </p>
  );
};

export default SectionParagraph;
