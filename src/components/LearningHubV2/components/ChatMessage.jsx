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
          <strong className="font-semibold">{titleText}:</strong>
          <span> {contentText}</span>
        </p>
      );
    } else if (bulletMatchDash) {
      const titleText = bulletMatchDash[1].replace(/\*\*/g, '');
      const contentText = bulletMatchDash[2].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{bulletMatchDash[0].charAt(0)} </span>
          <strong className="font-semibold">{titleText}</strong>
          <span> - {contentText}</span>
        </p>
      );
    } else if (numberedMatchColon) {
      const titleText = numberedMatchColon[2].replace(/\*\*/g, '');
      const contentText = numberedMatchColon[3].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{numberedMatchColon[1]}. </span>
          <strong className="font-semibold">{titleText}:</strong>
          <span> {contentText}</span>
        </p>
      );
    } else if (numberedMatchDash) {
      const titleText = numberedMatchDash[2].replace(/\*\*/g, '');
      const contentText = numberedMatchDash[3].replace(/\*\*/g, '');
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          <span>{numberedMatchDash[1]}. </span>
          <strong className="font-semibold">{titleText}</strong>
          <span> - {contentText}</span>
        </p>
      );
    } else {
      // Regular text with inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className={i > 0 ? 'mt-2' : ''}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    }
  });
};

const ChatMessage = ({ message, displayedText, isCurrentlyTyping }) => {
  const isUser = message.type === 'user';

  // For assistant messages that are typing, show displayedText
  const textToShow = isCurrentlyTyping && !message.isComplete
    ? displayedText
    : (!message.isComplete ? '' : message.text);

  // Don't render empty assistant messages
  if (!isUser && !textToShow) return null;

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div
          className="inline-block px-4 py-2.5 text-sm text-black rounded-lg"
          style={{
            backgroundColor: '#F0F0F0',
            fontWeight: 300,
            fontSize: '14px',
            letterSpacing: '-0.01em',
            maxWidth: '85%',
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="mb-3">
      <div
        className="text-sm leading-relaxed text-black"
        style={{ fontWeight: 300, fontSize: '14px', letterSpacing: '-0.01em' }}
      >
        {parseText(textToShow)}
        {isCurrentlyTyping && !message.isComplete && (
          <span
            className="inline-block align-middle ml-0.5"
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#8200EA',
              borderRadius: 1,
              animation: 'pulse 1s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
