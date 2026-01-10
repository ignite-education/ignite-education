import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCoursesByType } from '../../lib/api';
import { getCachedCourses, setCachedCourses } from '../../lib/courseCatalogCache';
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
    const refreshCoursesInBackground = async () => {
      try {
        const freshData = await getCoursesByType();
        setCachedCourses(freshData);
        setCoursesByType(freshData);
      } catch (err) {
        // Silent fail for background refresh
      }
    };

    const fetchCourses = async () => {
      try {
        // Check cache first for instant load
        const cachedData = getCachedCourses();

        if (cachedData) {
          setCoursesByType(cachedData);
          setLoading(false);
          // Refresh in background (stale-while-revalidate)
          refreshCoursesInBackground();
          return;
        }

        // No cache - fetch fresh data
        const data = await getCoursesByType();
        setCoursesByType(data);
        setCachedCourses(data);
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

  const isFeatured = variant === 'featured';

  // Skeleton card component for loading state
  const SkeletonCard = () => (
    <div className="bg-[#F8F8F8] rounded-xl px-5 py-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-gray-300 rounded w-3/4"></div>
        <div className="bg-white rounded-md w-[35px] h-[35px]"></div>
      </div>
    </div>
  );

  // Skeleton column component for loading state
  const SkeletonColumn = () => (
    <div className="flex flex-col">
      <div className="h-7 bg-pink-200 rounded w-24 mx-auto mb-1 animate-pulse"></div>
      {showDescriptions && (
        <div className="mb-6 min-h-[40px] flex flex-col items-center gap-1">
          <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
        </div>
      )}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white ${isFeatured ? 'py-12' : 'min-h-screen py-12'}`}>
        <div className="max-w-[1267px] mx-auto px-6">
          {/* Header skeleton */}
          {!isFeatured && (
            <div className="text-center mb-6">
              <div className="h-14 w-14 bg-pink-100 rounded mx-auto mb-8 animate-pulse"></div>
              <div className="h-9 bg-gray-200 rounded w-80 mx-auto mb-[6px] animate-pulse"></div>
            </div>
          )}

          {/* Search skeleton */}
          {showSearch && !isFeatured && (
            <div className="mb-10">
              <div className="h-12 bg-gray-100 rounded-lg w-full max-w-md mx-auto animate-pulse"></div>
            </div>
          )}

          {/* Columns skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[35px]">
            <SkeletonColumn />
            <SkeletonColumn />
            <SkeletonColumn />
          </div>
        </div>
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

  return (
    <div className={`bg-white ${isFeatured ? 'py-12' : 'min-h-screen py-12'}`}>
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
            <h1 className="text-[42px] font-bold text-black mb-[6px] tracking-[-0.02em]" style={{ fontFamily: 'Geist, sans-serif' }}>
              What do you want to learn?
            </h1>
          </div>
        )}

        {/* Search */}
        {showSearch && !isFeatured && (
          <div className="mb-10">
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
