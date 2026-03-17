import React from 'react';

// Parse inline formatting: **bold**, *italic*, bullet points
const parseText = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bullet point with colon — "• Term: description"
    const bulletMatchColon = line.match(/^[•\-*]\s+(.+?):\s*(.*)$/);
    const bulletMatchDash = line.match(/^[•\-*]\s+(.+?)\s+-\s+(.*)$/);
    const numberedMatchColon = line.match(/^(\d+)\.\s+(.+?):\s*(.*)$/);
    const numberedMatchDash = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.*)$/);

    if (bulletMatchColon) {
      const titleText = bulletMatchColon[1].replace(/\*\*/g, '');
      const contentText = bulletMatchColon[2].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{bulletMatchColon[0].charAt(0)} </span>
          <strong className="font-medium">{titleText}:</strong>
          <span> {contentText}</span>
        </p>
      );
    } else if (bulletMatchDash) {
      const titleText = bulletMatchDash[1].replace(/\*\*/g, '');
      const contentText = bulletMatchDash[2].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{bulletMatchDash[0].charAt(0)} </span>
          <strong className="font-medium">{titleText}</strong>
          <span> - {contentText}</span>
        </p>
      );
    } else if (numberedMatchColon) {
      const titleText = numberedMatchColon[2].replace(/\*\*/g, '');
      const contentText = numberedMatchColon[3].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{numberedMatchColon[1]}. </span>
          <strong className="font-medium">{titleText}:</strong>
          <span> {contentText}</span>
        </p>
      );
    } else if (numberedMatchDash) {
      const titleText = numberedMatchDash[2].replace(/\*\*/g, '');
      const contentText = numberedMatchDash[3].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{numberedMatchDash[1]}. </span>
          <strong className="font-medium">{titleText}</strong>
          <span> - {contentText}</span>
        </p>
      );
    } else {
      // Regular text with inline bold
      const parts = line.split(/(\*\*.*?\*\*|\*\*[^*]*$|(?<!\*)\*(?!\*).*?(?<!\*)\*(?!\*)|(?<!\*)\*(?!\*)[^*]*$)/g);
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          {parts.map((part, j) => {
            if (!part) return null;
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return <strong key={j} className="font-medium">{part.slice(2, -2)}</strong>;
            }
            // Unclosed bold — still typing, render as bold without the leading **
            if (part.startsWith('**') && part.length > 2) {
              return <strong key={j} className="font-medium">{part.slice(2)}</strong>;
            }
            // Italic: *text* (single asterisks, not double)
            if (/^(?<!\*)\*(?!\*)(.+)\*(?!\*)$/.test(part)) {
              return <em key={j}>{part.slice(1, -1)}</em>;
            }
            // Unclosed italic — still typing
            if (/^(?<!\*)\*(?!\*)/.test(part) && !part.startsWith('**') && part.length > 1) {
              return <em key={j}>{part.slice(1)}</em>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    }
  });
};

const ChatMessage = ({ message, displayedText, isCurrentlyTyping, remainingLine = '' }) => {
  const isUser = message.type === 'user';

  // For assistant messages that are typing, show displayedText
  const textToShow = isCurrentlyTyping && !message.isComplete
    ? displayedText
    : (!message.isComplete ? '' : message.text);

  // Don't render empty assistant messages
  if (!isUser && !textToShow) return null;

  if (isUser) {
    return (
      <div className="flex justify-end mt-2 mb-6" style={{ marginRight: -30 }}>
        <div
          className="inline-block px-4 py-2.5 text-base font-light text-black rounded-lg"
          style={{
            backgroundColor: '#F0F0F0',
            letterSpacing: '-0.01em',
            maxWidth: '80%',
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  // Assistant message — overlay approach: hidden full text for stable layout, typed portion on top
  const showCursor = isCurrentlyTyping && !message.isComplete;
  const cursorEl = showCursor ? (
    <span style={{ position: 'relative', display: 'inline', whiteSpace: 'pre-wrap' }}>
      <span style={{ color: 'transparent', pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">{remainingLine}</span>
      <span data-scroll-anchor className="inline-block" style={{ position: 'absolute', left: 0, top: '0.65em', transform: 'translateY(-50%)', width: 8, height: 8, backgroundColor: '#8200EA', marginLeft: 6 }} />
    </span>
  ) : null;

  const parsed = parseText(textToShow);

  // Inject cursor into the last <p> element so it sits inline with text
  const withCursor = cursorEl && parsed.length > 0
    ? parsed.map((el, i) =>
        i === parsed.length - 1
          ? React.cloneElement(el, {}, ...React.Children.toArray(el.props.children), cursorEl)
          : el
      )
    : parsed;

  // During typing, use overlay to prevent layout flicker
  if (showCursor) {
    const fullParsed = parseText(message.text);
    return (
      <div className="mb-3">
        <div
          className="text-base font-light leading-relaxed text-black"
          style={{ letterSpacing: '-0.01em', position: 'relative' }}
        >
          {/* Hidden full text for stable layout */}
          <div style={{ visibility: 'hidden' }} aria-hidden="true">
            {fullParsed}
          </div>
          {/* Visible typed portion overlaid */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            {withCursor}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div
        className="text-base font-light leading-relaxed text-black"
        style={{ letterSpacing: '-0.01em' }}
      >
        {withCursor}
      </div>
    </div>
  );
};

export default ChatMessage;
