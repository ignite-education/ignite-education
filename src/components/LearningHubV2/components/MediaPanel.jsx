import React, { useMemo } from 'react';
import SectionImage from './SectionImage';
import SectionYouTube from './SectionYouTube';

const MediaPanel = ({ sections }) => {
  // Filter to only media sections (image, youtube)
  const mediaSections = useMemo(() => {
    if (!Array.isArray(sections)) return [];
    return sections.filter(
      s => s.content_type === 'image' || s.content_type === 'youtube'
    );
  }, [sections]);

  if (mediaSections.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        {/* Empty state — no media for this lesson */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mediaSections.map((section, idx) => {
        if (section.content_type === 'image') {
          return <SectionImage key={section.id || idx} section={section} />;
        }
        if (section.content_type === 'youtube') {
          return <SectionYouTube key={section.id || idx} section={section} />;
        }
        return null;
      })}
    </div>
  );
};

export default MediaPanel;
