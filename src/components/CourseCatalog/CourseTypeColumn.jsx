import React, { useRef, useEffect, useState } from 'react';
import CourseCard from './CourseCard';
import { courseMatchesQuery } from '../../lib/courseSearch';

const COURSE_TYPE_CONFIG = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that\nenable you to enter a new career',
    color: 'text-[#EF0B72]'
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that\nyou can immediately apply',
    color: 'text-[#EF0B72]'
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to\nlearn anything you want',
    color: 'text-[#EF0B72]'
  }
};

const CourseTypeColumn = ({
  type,
  courses,
  showDescription = true,
  maxCourses,
  searchQuery = '',
  cardStaggerBase = 0,
  cardStaggerIncrement = 0.1,
}) => {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill;
  const displayCourses = maxCourses ? courses.slice(0, maxCourses) : courses;

  // Disable CSS transitions during initial stagger, enable after stagger completes
  const initialRenderRef = useRef(true);
  const useStagger = initialRenderRef.current && cardStaggerBase > 0;
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  useEffect(() => {
    if (!useStagger) {
      setTransitionsEnabled(true);
      return;
    }
    const longestDelay = cardStaggerBase + (displayCourses.length - 1) * cardStaggerIncrement;
    const timer = setTimeout(() => {
      initialRenderRef.current = false;
      setTransitionsEnabled(true);
    }, (longestDelay + 0.6) * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex flex-col ${courses.length === 0 ? 'hidden md:flex' : ''}`}>
      <h2 className="text-[22px] font-bold text-[#EF0B72] mb-1 text-center tracking-[-0.01em]" style={{ fontFamily: 'Geist, sans-serif' }}>{config.title}</h2>
      {showDescription && (
        <p className="text-black text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line" style={{ fontFamily: 'Geist, sans-serif' }}>{config.description}</p>
      )}
      <div className="flex flex-col">
        {displayCourses.map((course, idx) => {
          const isVisible = courseMatchesQuery(course, searchQuery);

          return (
            <div
              key={course.id || course.name}
              style={{
                display: 'grid',
                gridTemplateRows: (useStagger || isVisible) ? '1fr' : '0fr',
                opacity: useStagger ? undefined : (isVisible ? 1 : 0),
                marginBottom: (useStagger || isVisible) ? '12px' : '0px',
                transition: transitionsEnabled
                  ? 'grid-template-rows 300ms cubic-bezier(0.33, 1, 0.68, 1), opacity 250ms ease, margin-bottom 300ms cubic-bezier(0.33, 1, 0.68, 1)'
                  : 'none',
              }}
            >
              <div style={{ overflow: useStagger ? 'visible' : 'hidden' }}>
                <div
                  style={useStagger ? {
                    animation: 'fadeInUpSmall 0.6s ease-out forwards',
                    animationDelay: `${cardStaggerBase + idx * cardStaggerIncrement}s`,
                    opacity: 0,
                  } : undefined}
                >
                  <CourseCard course={course} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourseTypeColumn;
