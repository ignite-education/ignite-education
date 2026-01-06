import React from 'react';

const CourseSearch = ({ value, onChange }) => {
  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-6 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all"
      />
    </div>
  );
};

export default CourseSearch;
