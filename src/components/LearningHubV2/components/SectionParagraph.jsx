import React from 'react';
import useTypewriter from '../hooks/useTypewriter';
import { normalizeTextForNarration, splitIntoWords } from '../../../utils/textNormalization';

// Render text with each word wrapped in a data-word-index span for narration highlighting.
// Preserves bold/italic/underline formatting while splitting into individual word spans.
const renderNarrationText = (text, wordIndexOffset) => {
  if (!text) return null;
  const normalized = normalizeTextForNarration(text);
  const words = splitIntoWords(normalized);

  // We render the full original text but wrap each normalized word in a span.
  // Split by formatting markers first, then split each segment into words.
  const parts = text.split(/(\*\*.+?\*\*[:\.,;!?]?|__.+?__[:\.,;!?]?|\[(?:[^\]]+)\]\((?:[^)]+)\)|(?<!\*)\*(?!\*)(?:[^*]+)\*(?!\*)[:\.,;!?]?)/g);

  let wordCounter = 0;
  const wordStyle = { padding: '2px', margin: '-2px', borderRadius: '2px' };

  const wrapWords = (str, WrapTag) => {
    // Normalize this segment the same way to get accurate word count
    const segNormalized = normalizeTextForNarration(str);
    const segWords = splitIntoWords(segNormalized);

    // Split the visible string by spaces to assign indices
    const visibleWords = str.split(/(\s+)/);
    return visibleWords.map((part, j) => {
      if (/^\s+$/.test(part)) return <span key={`sp-${j}`}>{part}</span>;
      if (!part) return null;

      // This visible word maps to a normalized word
      const idx = wordIndexOffset + wordCounter;
      wordCounter++;

      const span = (
        <span key={`w-${idx}`} data-word-index={idx} style={wordStyle}>
          {part}
        </span>
      );

      return WrapTag ? <WrapTag key={`f-${idx}`}>{span}</WrapTag> : span;
    });
  };

  const elements = parts.map((part, i) => {
    if (part === undefined) return null;

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
          {wrapWords(linkMatch[1])}
        </a>
      );
    }

    // Bold
    if (part.startsWith('**') && part.match(/\*\*[:\.,;!?]?$/)) {
      const innerText = part.replace(/^\*\*/, '').replace(/\*\*[:\.,;!?]?$/, '');
      const trailingPunct = part.match(/\*\*([:\.,;!?])$/)?.[1] || '';
      return <strong key={i} className="font-semibold">{wrapWords(innerText + trailingPunct)}</strong>;
    }

    // Underline
    if (part.startsWith('__') && part.match(/__[:\.,;!?]?$/)) {
      const innerText = part.replace(/^__/, '').replace(/__[:\.,;!?]?$/, '');
      const trailingPunct = part.match(/__([:\.,;!?])$/)?.[1] || '';
      return <u key={i}>{wrapWords(innerText + trailingPunct)}</u>;
    }

    // Italic
    if (part.match(/^(?<!\*)\*(?!\*)(.+)\*(?!\*)[:\.,;!?]?$/)) {
      const innerText = part.replace(/^\*/, '').replace(/\*[:\.,;!?]?$/, '');
      const trailingPunct = part.match(/\*([:\.,;!?])$/)?.[1] || '';
      return <em key={i}>{wrapWords(innerText + trailingPunct)}</em>;
    }

    return <span key={i}>{wrapWords(part)}</span>;
  });

  return elements;
};

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

const SectionParagraph = ({ section, animate = true, delay = 0, onComplete, narrationActive = false, wordIndexOffset = 0, skipAnimation = false }) => {
  const text = typeof section.content === 'string'
    ? section.content
    : section.content?.text || section.content_text;

  // When skipping animation (restoring progress), call onComplete immediately
  const skipCalledRef = React.useRef(false);
  React.useEffect(() => {
    if (skipAnimation && onComplete && !skipCalledRef.current) {
      skipCalledRef.current = true;
      onComplete();
    }
  }, [skipAnimation, onComplete]);

  const { revealedText, isComplete, lookaheadWord } = useTypewriter(text, {
    speed: 38,
    delay: skipAnimation ? 0 : delay,
    enabled: !skipAnimation && animate,
    onComplete: skipAnimation ? undefined : onComplete,
  });

  // --- Narration mode: render full text with word-index spans ---
  if (narrationActive) {
    if (!text) return null;
    const lines = text.split('\n');
    const fullLines = text.split('\n');
    const hasBullets = fullLines.some(line => /^[•\-]\s/.test(line.trim()));
    const hasMultipleLines = fullLines.filter(line => line.trim()).length > 1;

    // Track word offset across lines
    let lineWordOffset = wordIndexOffset;

    if (hasBullets || hasMultipleLines) {
      return (
        <div className="mb-4">
          {lines.map((line, idx) => {
            const trimmedLine = line.trim();
            if (/^[•\-]\s/.test(trimmedLine)) {
              const bulletText = trimmedLine.replace(/^[•\-]\s+/, '');
              const el = (
                <div key={idx} className="flex items-start gap-2 mb-1" style={{ paddingLeft: 10 }}>
                  <span className="text-black leading-relaxed">•</span>
                  <span className="text-base font-light leading-relaxed flex-1 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
                    {renderNarrationText(bulletText, lineWordOffset)}
                  </span>
                </div>
              );
              const normalized = normalizeTextForNarration(bulletText);
              lineWordOffset += splitIntoWords(normalized).length;
              return el;
            } else if (trimmedLine) {
              const el = (
                <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
                  {renderNarrationText(line, lineWordOffset)}
                </p>
              );
              const normalized = normalizeTextForNarration(line);
              lineWordOffset += splitIntoWords(normalized).length;
              return el;
            } else if (hasMultipleLines) {
              return <div key={idx} className="h-2" />;
            }
            return null;
          })}
        </div>
      );
    }

    return (
      <p className="text-base font-light leading-relaxed mb-4 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
        {renderNarrationText(text, wordIndexOffset)}
      </p>
    );
  }

  // --- Skip animation: render full text immediately ---
  if (skipAnimation && text) {
    const lines = text.split('\n');
    const hasBullets = lines.some(line => /^[•\-]\s/.test(line.trim()));
    const hasMultipleLines = lines.filter(line => line.trim()).length > 1;

    if (hasBullets || hasMultipleLines) {
      return (
        <div className="mb-4">
          {lines.map((line, idx) => {
            const trimmedLine = line.trim();
            if (/^[•\-]\s/.test(trimmedLine)) {
              const bulletText = trimmedLine.replace(/^[•\-]\s+/, '');
              return (
                <div key={idx} className="flex items-start gap-2 mb-1" style={{ paddingLeft: 10 }}>
                  <span className="text-black leading-relaxed">•</span>
                  <span className="text-base font-light leading-relaxed flex-1 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
                    {renderFormattedText(bulletText)}
                  </span>
                </div>
              );
            } else if (trimmedLine) {
              return (
                <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
                  {renderFormattedText(line)}
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
      <p className="text-base font-light leading-relaxed mb-4 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
        {renderFormattedText(text)}
      </p>
    );
  }

  // --- Normal mode: typewriter animation ---
  const cursorDot = <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />;
  // Invisible remaining text keeps the full layout stable — prevents mid-word line breaks
  const remainingText = !isComplete && text ? text.slice(revealedText.length) : '';
  // Extract the current line's remaining text (up to next newline) for inline lookahead
  const remainingOnLine = remainingText.split('\n')[0] || '';
  const cursor = !isComplete ? (
    <>
      {cursorDot}
      <span style={{ color: 'transparent', pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">{remainingOnLine}</span>
    </>
  ) : null;

  // Show pulsing cursor during delay, before text starts
  if (!revealedText && !isComplete) {
    return (
      <p className="text-base font-light leading-relaxed mb-4 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
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
      <div className="mb-4">
        {lines.map((line, idx) => {
          const trimmedLine = line.trim();
          const isLast = idx === lastLineIdx;
          if (/^[•\-]\s/.test(trimmedLine)) {
            const bulletText = trimmedLine.replace(/^[•\-]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 mb-1" style={{ paddingLeft: 10 }}>
                <span className="text-black leading-relaxed">•</span>
                <span className="text-base font-light leading-relaxed flex-1 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
                  {renderFormattedText(bulletText, { inProgress: isLast && !isComplete })}{isLast && cursor}
                </span>
              </div>
            );
          } else if (trimmedLine) {
            return (
              <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
                {renderFormattedText(line, { inProgress: isLast && !isComplete })}{isLast && cursor}
              </p>
            );
          } else if (isLast && !isComplete) {
            // Empty last line during newline pause — show cursor at start of new line
            return (
              <p key={idx} className="text-base font-light leading-relaxed mb-2 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
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
    <p className="text-base font-light leading-relaxed mb-4 text-black" style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}>
      {renderFormattedText(revealedText, { inProgress: !isComplete })}{cursor}
    </p>
  );
};

export default SectionParagraph;
