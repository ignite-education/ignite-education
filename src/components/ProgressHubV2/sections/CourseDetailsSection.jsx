import React, { useRef, useState, useEffect } from 'react';

const CourseDetailsSection = ({ courseTitle, graph, left, right }) => {
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
    <section className="bg-black px-12" style={{ paddingTop: '45px', paddingBottom: '45px' }}>
      <h2 className="font-bold text-white" style={{ fontSize: '2rem', lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>{courseTitle}</h2>
      {graph && <div style={{ marginBottom: '20px' }}>{graph}</div>}
      <div className="flex w-full gap-16" style={{ overflow: 'hidden', alignItems: 'flex-start' }}>
        <div ref={leftColRef} className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: '20px' }}>
          {left}
        </div>
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: '20px', height: leftColHeight > 0 ? `${leftColHeight}px` : 'auto' }}>
          {right}
        </div>
      </div>
    </section>
  );
};

export default CourseDetailsSection;
