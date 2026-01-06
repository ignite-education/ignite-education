import React from 'react';
import { Link } from 'react-router-dom';

const CourseCard = ({ course }) => {
  const slug = course.name?.toLowerCase().replace(/\s+/g, '-') || course.title?.toLowerCase().replace(/\s+/g, '-');

  return (
    <Link
      to={`/courses/${slug}`}
      className="group block bg-[#F8F8F8] rounded-xl px-5 py-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-black font-semibold tracking-[-0.01em]" style={{ fontFamily: 'Geist, sans-serif' }}>{course.title}</span>
        <div className="bg-white rounded-md flex items-center justify-center" style={{ width: '35px', height: '35px' }}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#E8E8E8] group-hover:text-[#EF0B72] transition-colors">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
