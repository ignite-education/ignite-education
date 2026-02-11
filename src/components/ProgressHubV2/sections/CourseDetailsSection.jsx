import React from 'react';

const CourseDetailsSection = ({ courseTitle, children }) => {
  return (
    <section className="bg-black px-12 pb-8">
      <h2 className="font-bold text-white" style={{ fontSize: '28px', marginBottom: '4px' }}>{courseTitle}</h2>
      <div className="flex flex-col" style={{ gap: '20px' }}>
        {children}
      </div>
    </section>
  );
};

export default CourseDetailsSection;
