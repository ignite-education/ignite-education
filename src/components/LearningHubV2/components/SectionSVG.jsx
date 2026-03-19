import React, { useRef, useEffect, useMemo } from 'react';

const SectionSVG = React.memo(({ section }) => {
  const content = section.content || {};
  const markup = content.markup || '';
  const width = content.width || '200';
  const height = content.height || '200';
  const colors = content.colors || { primary: '#8200EA', secondary: '#EF0B72' };
  const svgRef = useRef(null);
  const injectedRef = useRef(false);

  const renderedMarkup = useMemo(() => {
    return markup
      .replace(/\{\{primary\}\}/g, colors.primary)
      .replace(/\{\{secondary\}\}/g, colors.secondary);
  }, [markup, colors.primary, colors.secondary]);

  // Inject SVG markup only once via ref to avoid restarting animations on re-render
  useEffect(() => {
    if (svgRef.current && renderedMarkup && !injectedRef.current) {
      svgRef.current.innerHTML = renderedMarkup;
      injectedRef.current = true;
    }
  }, [renderedMarkup]);

  if (!markup) return null;

  return (
    <div className="py-4">
      <div className="flex items-center justify-center">
        <div
          ref={svgRef}
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>
      {content.description && (
        <p className="text-base font-light leading-relaxed mt-3 text-black" style={{ letterSpacing: '-0.01em' }}>{content.description}</p>
      )}
    </div>
  );
}, (prev, next) => {
  // Only re-render if the actual content changed
  const pc = prev.section.content || {};
  const nc = next.section.content || {};
  return pc.markup === nc.markup
    && pc.width === nc.width
    && pc.height === nc.height
    && pc.colors?.primary === nc.colors?.primary
    && pc.colors?.secondary === nc.colors?.secondary
    && pc.description === nc.description;
});

export default SectionSVG;
