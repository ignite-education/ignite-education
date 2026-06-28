import React, { useRef, useState, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';

const CourseDetailsSection = ({ courseTitle, graph, left, right }) => {
  const isMobile = useIsMobile();
  const leftColRef = useRef(null);
  const [leftColHeight, setLeftColHeight] = useState(0);

  useEffect(() => {
    if (!leftColRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setLeftColHeight(entry.contentRect.height);
      }
    });
    observer.observe(leftColRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="course-details" className="bg-black px-5 lg:px-12" style={{ paddingTop: isMobile ? '20px' : '45px', paddingBottom: '45px' }}>
      <h2 className="text-white" style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>{courseTitle}</h2>
      {graph && <div style={{ marginBottom: '20px' }}>{graph}</div>}
      <div className="flex flex-col lg:flex-row w-full gap-8 lg:gap-16" style={{ overflow: 'hidden', alignItems: 'flex-start' }}>
        <div ref={leftColRef} className="flex flex-col w-full" style={{ flex: 1, minWidth: 0, gap: '20px' }}>
          {left}
        </div>
        <div className="flex flex-col w-full" style={{ flex: 1, minWidth: 0, gap: '20px', height: !isMobile && leftColHeight > 0 ? `${leftColHeight}px` : 'auto' }}>
          {right}
        </div>
      </div>
    </section>
  );
};

export default CourseDetailsSection;
