import React, { useEffect } from 'react';
import SectionHeading from './SectionHeading';
import SectionParagraph from './SectionParagraph';
import SectionList from './SectionList';

// ContentRenderer only renders text-based sections (left column).
// Image and YouTube sections are handled by MediaPanel (right column).
const ContentRenderer = ({ section, sectionIdx, isActive, prevSectionType, onComplete, narrationActive = false, wordIndexOffset = 0, skipAnimation = false }) => {
  // Add a 750ms gap after a heading before the next section starts typing
  const startDelay = skipAnimation ? 0 : (prevSectionType === 'heading' || sectionIdx === 0) ? 1200 : 0;
  // Auto-complete non-animated section types immediately
  useEffect(() => {
    if (isActive && section.content_type !== 'heading' && section.content_type !== 'paragraph') {
      onComplete?.();
    }
  }, [isActive, section.content_type, onComplete]);

  switch (section.content_type) {
    case 'heading':
      return <SectionHeading section={section} delay={startDelay} onComplete={isActive ? onComplete : undefined} narrationActive={narrationActive} wordIndexOffset={wordIndexOffset} skipAnimation={skipAnimation} />;

    case 'paragraph':
      return <SectionParagraph section={section} delay={startDelay} onComplete={isActive ? onComplete : undefined} narrationActive={narrationActive} wordIndexOffset={wordIndexOffset} skipAnimation={skipAnimation} />;

    case 'list':
    case 'bulletlist':
      return <SectionList section={section} narrationActive={narrationActive} wordIndexOffset={wordIndexOffset} />;

    // Scored questions are handled by LearningHubV2 directly (blank screen flow)
    // Auto-complete triggers handleSectionComplete to enter scored question mode
    case 'scored_question':
      return null;

    // Images, YouTube, and SVGs are rendered in the right column by MediaPanel
    case 'image':
    case 'youtube':
    case 'svg':
      return null;

    default:
      // Legacy content or fallback
      if (section.content && typeof section.content === 'object') {
        return (
          <div className="prose prose-lg max-w-none mb-6">
            {section.content.description && (
              <p className="text-base leading-relaxed mb-4">{section.content.description}</p>
            )}
            {section.content.points && Array.isArray(section.content.points) && (
              <ul className="space-y-3 mb-4">
                {section.content.points.map((point, idx) => (
                  <li key={idx} className="text-base leading-relaxed">
                    <strong className="font-bold">{point.title}</strong> {point.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }
      return (
        <p className="text-base leading-relaxed mb-6">
          {section.content || section.content_text || 'No content available.'}
        </p>
      );
  }
};

export default ContentRenderer;
