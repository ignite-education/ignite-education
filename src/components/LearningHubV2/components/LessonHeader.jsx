import React from 'react';

const LessonHeader = ({ globalLessonNumber, lessonName }) => {
  return (
    <div style={{ marginBottom: '7px' }}>
      <p className="mb-1" style={{ color: '#EF0B72', fontSize: '1rem', fontWeight: 400, letterSpacing: '-0.01em' }}>
        Lesson {globalLessonNumber}
      </p>
      <h1 style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-0.01em' }}>
        {lessonName}
      </h1>
    </div>
  );
};

export default LessonHeader;
