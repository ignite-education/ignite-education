import React from 'react';

const CourseSearch = ({ value, onChange }) => {
  return (
    <div className="w-full max-w-[660px] mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
        className="w-full bg-white rounded-xl px-6 py-3 text-gray-900 caret-[#EF0B72] focus:outline-none transition-all shadow-[0_0_10px_rgba(103,103,103,0.35)] hover:shadow-[0_0_10px_rgba(103,103,103,0.5)]"
      />
    </div>
  );
};

export default CourseSearch;
