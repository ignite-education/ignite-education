import React, { useRef, useState, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';

const CourseDetailsSection = ({ courseTitle, graph, lessonSlider, left, right }) => {
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
    <section id="course-details" className="bg-black px-5 lg:px-12" style={{ paddingTop: isMobile ? '32px' : '45px', paddingBottom: '45px' }}>
      <h2 className="text-white" style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-1%', marginBottom: isMobile ? '0.5rem' : '1rem' }}>{courseTitle}</h2>
      {/* Desktop: progress graph spans full width above the columns. On mobile it moves below the lesson slider (the two are swapped). */}
      {!isMobile && graph && <div style={{ marginBottom: '20px' }}>{graph}</div>}
      <div className="flex flex-col lg:flex-row w-full gap-8 lg:gap-16" style={{ overflow: 'hidden', alignItems: 'flex-start' }}>
        <div ref={leftColRef} className="flex flex-col w-full" style={{ flex: 1, minWidth: 0, gap: '20px' }}>
          {lessonSlider}
          {isMobile && graph}
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
