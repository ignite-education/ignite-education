import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCoursesByType } from '../../lib/api';
import CourseTypeColumn from './CourseTypeColumn';
import CourseSearch from './CourseSearch';

const CourseCatalog = ({
  variant = 'full',
  maxCoursesPerColumn,
  showSearch = true,
  showDescriptions = true
}) => {
  const [coursesByType, setCoursesByType] = useState({
    specialism: [],
    skill: [],
    subject: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCoursesByType();
        setCoursesByType(data);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filterCourses = (courses) => {
    if (!searchQuery.trim()) return courses;
    const query = searchQuery.toLowerCase();
    return courses.filter(
      (course) =>
        course.title?.toLowerCase().includes(query) ||
        course.name?.toLowerCase().includes(query)
    );
  };

  const filteredSpecialism = filterCourses(coursesByType.specialism);
  const filteredSkill = filterCourses(coursesByType.skill);
  const filteredSubject = filterCourses(coursesByType.subject);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-gray-500">
        {error}
      </div>
    );
  }

  const isFeatured = variant === 'featured';

  return (
    <div className={`bg-white ${isFeatured ? 'py-12' : 'min-h-screen py-16'}`}>
      <div className="max-w-[1267px] mx-auto px-6">
        {/* Header */}
        {!isFeatured && (
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-8">
              <img
                src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_S_2.png"
                alt="Ignite Education"
                className="h-14 mx-auto"
              />
            </Link>
            <h1 className="text-[36px] font-bold text-black mb-4 tracking-[-0.02em]" style={{ fontFamily: 'Geist, sans-serif' }}>
              What do you want to learn?
            </h1>
          </div>
        )}

        {/* Search */}
        {showSearch && !isFeatured && (
          <div className="mb-12">
            <CourseSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search courses..."
            />
          </div>
        )}

        {/* Course Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[35px]">
          <CourseTypeColumn
            type="specialism"
            courses={filteredSpecialism}
            showDescription={showDescriptions}
            maxCourses={isFeatured ? (maxCoursesPerColumn || 3) : undefined}
          />
          <CourseTypeColumn
            type="skill"
            courses={filteredSkill}
            showDescription={showDescriptions}
            maxCourses={isFeatured ? (maxCoursesPerColumn || 3) : undefined}
          />
          <CourseTypeColumn
            type="subject"
            courses={filteredSubject}
            showDescription={showDescriptions}
            maxCourses={isFeatured ? (maxCoursesPerColumn || 3) : undefined}
          />
        </div>

        {/* View All Link (Featured mode only) */}
        {isFeatured && (
          <div className="text-center mt-10">
            <Link
              to="/courses"
              className="text-pink-500 hover:text-pink-600 font-medium transition-colors"
            >
              View all courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCatalog;
