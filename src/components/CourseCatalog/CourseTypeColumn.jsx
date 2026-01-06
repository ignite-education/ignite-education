import React from 'react';
import CourseCard from './CourseCard';

const COURSE_TYPE_CONFIG = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that enable you to enter a new career',
    color: 'text-[#EF0B72]'
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that you can apply immediately',
    color: 'text-[#EF0B72]'
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to learn anything you want',
    color: 'text-[#EF0B72]'
  }
};

const CourseTypeColumn = ({ type, courses, showDescription = true, maxCourses }) => {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill;
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses;

  return (
    <div className="flex flex-col">
      <h2 className={`text-xl font-bold ${config.color} mb-2 text-center`}>{config.title}</h2>
      {showDescription && (
        <p className="text-black text-sm mb-6 min-h-[40px] text-center">{config.description}</p>
      )}
      <div className="space-y-3">
        {displayCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
        {courses.length === 0 && (
          <div className="bg-[#F0F0F2] rounded-xl px-5 py-4 text-gray-400 text-center">
            No courses yet
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseTypeColumn;
