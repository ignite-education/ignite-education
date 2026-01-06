import React from 'react';
import CourseCard from './CourseCard';

const COURSE_TYPE_CONFIG = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that\nenable you to enter a new career',
    color: 'text-[#EF0B72]'
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that\nyou can apply immediately',
    color: 'text-[#EF0B72]'
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to\nlearn anything you want',
    color: 'text-[#EF0B72]'
  }
};

const CourseTypeColumn = ({ type, courses, showDescription = true, maxCourses }) => {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill;
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses;

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-bold text-[#EF0B72] mb-[0.4rem] text-center tracking-[-0.01em]" style={{ fontFamily: 'Geist, sans-serif' }}>{config.title}</h2>
      {showDescription && (
        <p className="text-black text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line" style={{ fontFamily: 'Geist, sans-serif' }}>{config.description}</p>
      )}
      <div className="space-y-3">
        {displayCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
};

export default CourseTypeColumn;
