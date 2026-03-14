import React from 'react';

const SectionImage = ({ section }) => {
  const imageData = section.content || {};
  if (!imageData.url) return null;

  return (
    <div className="mb-6">
      <img
        src={imageData.url}
        alt={imageData.alt || section.title || 'Lesson image'}
        className="w-full rounded-lg shadow-lg"
      />
      {imageData.caption && (
        <p className="text-sm text-gray-500 mt-2 italic">{imageData.caption}</p>
      )}
    </div>
  );
};

export default SectionImage;
