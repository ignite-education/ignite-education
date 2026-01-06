import React from 'react';
import { Link } from 'react-router-dom';
import { Square } from 'lucide-react';

const CourseCard = ({ course }) => {
  const slug = course.name?.toLowerCase().replace(/\s+/g, '-') || course.title?.toLowerCase().replace(/\s+/g, '-');

  return (
    <Link
      to={`/courses/${slug}`}
      className="group block bg-[#FFFFFF] rounded-xl px-5 py-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-black font-semibold tracking-[-0.01em]" style={{ fontFamily: 'Geist, sans-serif' }}>{course.title}</span>
        <Square size={20} className="text-gray-300 group-hover:text-pink-500 transition-colors" />
      </div>
    </Link>
  );
};

export default CourseCard;
