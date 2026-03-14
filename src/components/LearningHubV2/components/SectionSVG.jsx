import React, { useMemo } from 'react';

const SectionSVG = ({ section }) => {
  const content = section.content || {};
  const markup = content.markup || '';
  const width = content.width || '200';
  const height = content.height || '200';
  const colors = content.colors || { primary: '#8200EA', secondary: '#EF0B72' };

  const renderedMarkup = useMemo(() => {
    return markup
      .replace(/\{\{primary\}\}/g, colors.primary)
      .replace(/\{\{secondary\}\}/g, colors.secondary);
  }, [markup, colors.primary, colors.secondary]);

  if (!markup) return null;

  return (
    <div className="flex items-center justify-center py-4">
      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        dangerouslySetInnerHTML={{ __html: renderedMarkup }}
      />
    </div>
  );
};

export default SectionSVG;
