import React from 'react';

const CourseDetailsSection = ({ courseTitle, graph, left, right }) => {
  return (
    <section className="bg-black px-12 py-8">
      <h2 className="font-bold text-white" style={{ fontSize: '2.4rem', lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>{courseTitle}</h2>
      {graph && <div style={{ marginBottom: '20px' }}>{graph}</div>}
      <div className="flex" style={{ gap: '20px' }}>
        <div className="flex flex-col" style={{ flex: 1, gap: '20px' }}>
          {left}
        </div>
        <div className="flex flex-col" style={{ flex: 1, gap: '20px' }}>
          {right}
        </div>
      </div>
    </section>
  );
};

export default CourseDetailsSection;
