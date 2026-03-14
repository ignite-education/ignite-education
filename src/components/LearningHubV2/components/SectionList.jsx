import React from 'react';

const SectionList = ({ section }) => {
  if (section.content_type === 'bulletlist') {
    const items = section.content?.items || [];
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

  return (
    <ListTag className={`${listClass} space-y-3 mb-6`}>
      {(listData.items || []).map((item, idx) => (
        <li key={idx} className="text-base leading-relaxed">{item}</li>
      ))}
    </ListTag>
  );
};

export default SectionList;
