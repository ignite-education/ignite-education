import React from 'react';
import { normalizeTextForNarration, splitIntoWords } from '../../../utils/textNormalization';

const renderNarrationWords = (text, startOffset) => {
  if (!text) return { element: null, wordCount: 0 };
  const normalized = normalizeTextForNarration(text);
  const words = splitIntoWords(normalized);
  const wordStyle = { padding: '2px', margin: '-2px', borderRadius: '2px' };

  const visibleWords = text.split(/(\s+)/);
  let wordCounter = 0;
  const spans = visibleWords.map((part, j) => {
    if (/^\s+$/.test(part)) return <span key={`sp-${j}`}>{part}</span>;
    if (!part) return null;
    const idx = startOffset + wordCounter;
    wordCounter++;
    return (
      <span key={`w-${idx}`} data-word-index={idx} style={wordStyle}>
        {part}
      </span>
    );
  });

  return { element: spans, wordCount: words.length };
};

const SectionList = ({ section, narrationActive = false, wordIndexOffset = 0 }) => {
  if (section.content_type === 'bulletlist') {
    const items = section.content?.items || [];

    if (narrationActive) {
      let offset = wordIndexOffset;
      return (
        <ul className="list-disc list-inside space-y-2 mb-6">
          {items.map((item, idx) => {
            const { element, wordCount } = renderNarrationWords(item, offset);
            offset += wordCount;
            return <li key={idx} className="text-base leading-relaxed">{element}</li>;
          })}
        </ul>
      );
    }

    return (
      <ul className="list-disc list-inside space-y-2 mb-6">
        {items.map((item, idx) => (
          <li key={idx} className="text-base leading-relaxed">{item}</li>
        ))}
      </ul>
    );
  }

  // content_type === 'list'
  const listData = section.content || {};
  const ListTag = listData.type === 'ordered' ? 'ol' : 'ul';
  const listClass = listData.type === 'ordered' ? 'list-decimal list-inside' : 'list-disc list-inside';

  if (narrationActive) {
    let offset = wordIndexOffset;
    return (
      <ListTag className={`${listClass} space-y-3 mb-6`}>
        {(listData.items || []).map((item, idx) => {
          const { element, wordCount } = renderNarrationWords(item, offset);
          offset += wordCount;
          return <li key={idx} className="text-base leading-relaxed">{element}</li>;
        })}
      </ListTag>
    );
  }

  return (
    <ListTag className={`${listClass} space-y-3 mb-6`}>
      {(listData.items || []).map((item, idx) => (
        <li key={idx} className="text-base leading-relaxed">{item}</li>
      ))}
    </ListTag>
  );
};

export default SectionList;
