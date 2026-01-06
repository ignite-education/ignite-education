import React from 'react';

const CourseSearch = ({ value, onChange, placeholder = 'Search courses...' }) => {
  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 rounded-full px-6 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
        style={{ caretColor: '#ec4899' }}
      />
    </div>
  );
};

export default CourseSearch;
