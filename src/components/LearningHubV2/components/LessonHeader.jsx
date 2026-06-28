import React from 'react';

const LessonHeader = ({ globalLessonNumber, lessonName, isMobile }) => {
  return (
    <div style={{ marginBottom: isMobile ? 0 : '7px' }}>
      <p className={isMobile ? '' : 'mb-1'} style={{ color: '#EF0B72', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 400, letterSpacing: '-0.01em', ...(isMobile && { marginBottom: '-2px' }) }}>
        Lesson {globalLessonNumber}
      </p>
      <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.7rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-0.01em' }}>
        {lessonName}
      </h1>
    </div>
  );
};

export default LessonHeader;
