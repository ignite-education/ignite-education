import React from 'react';

const CourseSearch = ({ value, onChange }) => {
  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white rounded-xl px-6 py-3 text-gray-900 focus:outline-none transition-all shadow-[0_0_0_4px_rgba(0,0,0,0.05)]"
      />
    </div>
  );
};

export default CourseSearch;
