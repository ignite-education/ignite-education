import React from 'react';

const CourseDetailsSection = ({ courseTitle, children }) => {
  return (
    <section className="bg-black px-12 py-8">
      <h2 className="font-bold text-white" style={{ fontSize: '2.4rem', lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>{courseTitle}</h2>
      <div className="flex flex-col" style={{ gap: '20px' }}>
        {children}
      </div>
    </section>
  );
};

export default CourseDetailsSection;
