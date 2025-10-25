import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Onboarding = ({ firstName, userId }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseStatus, setCourseStatus] = useState(''); // 'available', 'upcoming', 'requested', or 'unrecognized'
  const [displayedName, setDisplayedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showCourseSelection, setShowCourseSelection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Typing animation effect for the name
  useEffect(() => {
    if (firstName) {
      let currentIndex = 0;
      const typingSpeed = 120; // milliseconds per character

      // Start typing after a short delay
      const startDelay = setTimeout(() => {
        const typingInterval = setInterval(() => {
          if (currentIndex <= firstName.length) {
            setDisplayedName(firstName.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(typingInterval);
            // Stop cursor blinking after typing is done
            setTimeout(() => {
              setShowCursor(false);
              // After 2 seconds, show course selection
              setTimeout(() => {
                setShowCourseSelection(true);
              }, 2000);
            }, 500);
          }
        }, typingSpeed);

        return () => clearInterval(typingInterval);
      }, 800); // Wait 800ms before starting to type

      return () => clearTimeout(startDelay);
    }
  }, [firstName]);

  const courseCategories = {
    available: ['Product Manager'],
    upcoming: ['Cyber Security Analyst'],
    requested: [
      'Accountant', 'Architect', 'Auditor', 'Backend Developer', 'Brand Manager',
      'Business Analyst', 'Business Intelligence Analyst', 'Cloud Architect',
      'Compliance Officer', 'Content Marketer', 'Corporate Lawyer', 'Data Engineer',
      'Data Scientist', 'Database Administrator', 'DevOps Engineer', 'Digital Marketer',
      'Financial Analyst', 'Frontend Developer', 'Full Stack Developer', 'Game Developer',
      'Graphic Designer', 'Growth Marketer', 'Human Resources Manager',
      'Incident Response Analyst', 'Information Security Analyst', 'Intellectual Property Lawyer',
      'Interior Designer', 'Investment Banker', 'Legal Counsel', 'Machine Learning Engineer',
      'Management Consultant', 'Mobile Developer', 'Motion Graphics Designer',
      'Network Engineer', 'Operations Manager', 'Penetration Tester',
      'Public Relations Manager', 'Quality Assurance Engineer', 'Risk Manager',
      'Sales Engineer', 'Site Reliability Engineer', 'Software Engineer',
      'Strategy Consultant', 'Supply Chain Manager', 'Systems Administrator',
      'Talent Acquisition Specialist', 'Tax Advisor', 'Technical Writer',
      'Test Automation Engineer', 'UX Designer'
    ]
  };

  // Click outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter courses based on search query
  const getFilteredCourses = () => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      return courseCategories;
    }

    return {
      available: courseCategories.available.filter(c => c.toLowerCase().includes(query)),
      upcoming: courseCategories.upcoming.filter(c => c.toLowerCase().includes(query)),
      requested: courseCategories.requested.filter(c => c.toLowerCase().includes(query))
    };
  };

  const handleCourseSelect = (course, status) => {
    setSelectedCourse(course);
    setCourseStatus(status);
    setSearchQuery(course);
    setIsDropdownOpen(false);
  };

  const handleComplete = async () => {
    if (!selectedCourse) return;

    console.log('handleComplete called', { selectedCourse, courseStatus });

    // Check if user is still authenticated
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('Your session has expired. Please sign in again.');
      window.location.href = '/auth';
      return;
    }

    // Determine if course is recognized
    let status = courseStatus;
    if (!status) {
      // Check if it's an unrecognized course (typed in but not in dropdown)
      const allCourses = [
        ...courseCategories.available,
        ...courseCategories.upcoming,
        ...courseCategories.requested
      ];
      status = allCourses.includes(selectedCourse) ? 'requested' : 'unrecognized';
    }

    console.log('Course status determined:', status);

    // If available course, enroll and proceed to progress hub
    if (status === 'available') {
      console.log('Enrolling in available course:', selectedCourse);
      try {
        // Update user profile with course
        const { data, error } = await supabase
          .from('users')
          .update({
            enrolled_course: selectedCourse,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select();

        console.log('Database update result:', { data, error });

        if (error) throw error;

        console.log('Update successful, data:', data);

        // Wait a moment for the database to fully commit the transaction
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Redirecting to progress hub');
        // Force a full page reload to ensure ProtectedRoute re-checks
        window.location.href = '/';
      } catch (error) {
        console.error('Error updating user:', error);
        alert(`There was an error saving your preferences: ${error.message}`);
      }
    } else {
      // For upcoming, requested, or unrecognized courses, save request and show notification
      console.log('Showing notification for unavailable course');

      try {
        // Save the course request to track interest
        const { error: requestError } = await supabase
          .from('course_requests')
          .insert({
            user_id: userId,
            course_name: selectedCourse,
            status: status === 'unrecognized' ? 'requested' : status
          });

        if (requestError) {
          // Log error but don't block the notification
          console.error('Error saving course request:', requestError);
        } else {
          console.log('Course request saved successfully');
        }
      } catch (err) {
        console.error('Exception saving course request:', err);
      }

      setCourseStatus(status);
      setShowNotification(true);
    }
  };

  return (
    <>
      <style>
        {`
          .overflow-y-auto::-webkit-scrollbar {
            display: none;
          }

          @keyframes slideUpFadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      {/* Blurred Background */}
      <div className="fixed inset-0 bg-black" style={{ opacity: 0.95 }} />

      {/* Onboarding Content */}
      <div className="fixed inset-0 z-50 px-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-full max-w-3xl text-white px-4 relative">
          {/* Welcome message - absolutely positioned */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '40px',
            right: '40px'
          }}>
            <h1 className="text-5xl font-bold inline-flex items-start animate-fadeIn">
              <span style={{ animation: 'fadeIn 0.3s ease-in' }}>Welcome</span>
              <span style={{ animation: 'fadeIn 0.3s ease-in' }}>,</span>
              <span className="text-pink-500 ml-3 relative" style={{ minWidth: displayedName ? 'auto' : '0' }}>
                {displayedName}
                {showCursor && displayedName && (
                  <span
                    className="absolute h-12 bg-pink-500 ml-1"
                    style={{
                      animation: 'blink 1s step-end infinite',
                      width: '4px',
                      transition: 'opacity 0.3s'
                    }}
                  />
                )}
              </span>
            </h1>
          </div>

          {/* Course selection appears after typing - absolutely positioned below Welcome */}
          {showCourseSelection && (
            <div style={{
              position: 'absolute',
              top: '-30px',
              left: '40px',
              right: '40px',
              animation: 'slideUpFadeIn 0.8s ease-out forwards',
              opacity: 0
            }}>
              <h2 className="text-2xl font-light mb-2">
                See yourself as a
              </h2>

              {!showNotification ? (
                <div className="mb-12 flex items-start gap-4">
                  <div className="flex-1 relative" ref={dropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onClick={() => setIsDropdownOpen(true)}
                        placeholder=""
                        autoFocus
                        className="w-full bg-white text-black text-xl px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                        style={{
                          caretColor: '#ec4899'
                        }}
                      />
                      {!searchQuery && (
                        <span
                          className="absolute left-6 top-1/2 h-6 bg-pink-500 pointer-events-none"
                          style={{
                            width: '2px',
                            transform: 'translateY(-50%)',
                            animation: 'blink 1s step-end infinite'
                          }}
                        />
                      )}
                    </div>

                    {isDropdownOpen && (
                      <div
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-y-auto z-50 text-left"
                        style={{
                          maxHeight: '240px',
                          scrollbarWidth: 'none', /* Firefox */
                          msOverflowStyle: 'none' /* IE and Edge */
                        }}
                      >
                        {(() => {
                          const filtered = getFilteredCourses();
                          const allCourses = [
                            ...filtered.available.map(c => ({ name: c, tag: 'Available', tagColor: 'bg-green-100 text-green-700', status: 'available' })),
                            ...filtered.upcoming.map(c => ({ name: c, tag: 'Coming Soon', tagColor: 'bg-blue-100 text-blue-700', status: 'upcoming' })),
                            ...filtered.requested.map(c => ({ name: c, tag: 'Requested', tagColor: 'bg-gray-100 text-gray-600', status: 'requested' }))
                          ];

                          return (
                            <>
                              {allCourses.length > 0 && (
                                allCourses.map((course) => (
                                  <div
                                    key={course.name}
                                    onClick={() => handleCourseSelect(course.name, course.status)}
                                    className="px-6 py-2 text-black hover:bg-pink-50 cursor-pointer transition flex items-center justify-between"
                                  >
                                    <span>{course.name}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${course.tagColor}`}>
                                      {course.tag}
                                    </span>
                                  </div>
                                ))
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleComplete}
                    disabled={!selectedCourse}
                    className="bg-white hover:bg-white rounded-xl transition disabled:cursor-not-allowed flex-shrink-0 group flex items-center justify-center px-4 shadow-sm"
                    style={{ border: 'none', paddingTop: '13.5px', paddingBottom: '13.5px' }}
                  >
                    <ArrowRight size={24} className="text-gray-800 group-hover:text-pink-500 transition" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <div className="mb-12 flex items-start gap-4 animate-fadeIn">
                  <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-white flex items-center">
                    <p className="text-xl font-light">
                      We'll email you when the {selectedCourse.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')} course is available
                    </p>
                  </div>

                  <button
                    onClick={() => window.location.href = 'https://ignite.education'}
                    className="bg-white hover:bg-white rounded-xl transition flex-shrink-0 group flex items-center justify-center px-4 shadow-sm"
                    style={{ border: 'none', paddingTop: '13.5px', paddingBottom: '13.5px' }}
                  >
                    <ArrowRight size={24} className="text-gray-800 group-hover:text-pink-500 transition" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Onboarding;
