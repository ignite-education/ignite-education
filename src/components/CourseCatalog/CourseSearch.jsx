import React from 'react';

const CourseSearch = ({ value, onChange }) => {
  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white rounded-xl px-6 py-3 text-gray-900 focus:outline-none transition-all shadow-[0_2px_3.8px_rgba(103,103,103,0.25)]"
      />
    </div>
  );
};

export default CourseSearch;
