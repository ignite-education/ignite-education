import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Onboarding = ({ firstName, userId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState('');
  const [displayedName, setDisplayedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Typing animation effect for the name
  useEffect(() => {
    if (currentPage === 1 && firstName) {
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
              // After 2 seconds, trigger transition to page 2
              setTimeout(() => {
                setShowTransition(true);
                setTimeout(() => {
                  setCurrentPage(2);
                  setShowTransition(false);
                }, 600); // Wait for animation to complete
              }, 2000);
            }, 500);
          }
        }, typingSpeed);

        return () => clearInterval(typingInterval);
      }, 800); // Wait 800ms before starting to type

      return () => clearTimeout(startDelay);
    }
  }, [currentPage, firstName]);

  const courseCategories = {
    available: ['Product Management'],
    upcoming: ['Cyber Security'],
    requested: [
      'Software Engineering', 'Data Science', 'UX Design', 'Digital Marketing',
      'Business Analytics', 'Cloud Architecture', 'DevOps Engineering',
      'Machine Learning Engineering', 'Frontend Development', 'Backend Development',
      'Full Stack Development', 'Mobile Development', 'Game Development',
      'Data Engineering', 'Business Intelligence', 'Financial Analysis',
      'Investment Banking', 'Management Consulting', 'Strategy Consulting',
      'Sales Engineering', 'Technical Writing', 'Content Marketing',
      'Growth Marketing', 'Brand Management', 'Public Relations',
      'Human Resources', 'Talent Acquisition', 'Operations Management',
      'Supply Chain Management', 'Legal Counsel', 'Corporate Law',
      'Intellectual Property Law', 'Accounting', 'Tax Advisory',
      'Audit', 'Risk Management', 'Compliance', 'Quality Assurance',
      'Test Automation', 'Site Reliability Engineering', 'Network Engineering',
      'Systems Administration', 'Database Administration', 'Information Security',
      'Penetration Testing', 'Incident Response', 'Architecture',
      'Interior Design', 'Graphic Design', 'Motion Graphics'
    ]
  };

  const seniorityLevels = ['Junior', 'Mid', 'Senior'];

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

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setSearchQuery(course);
    setIsDropdownOpen(false);
  };

  const handleNext = () => {
    if (currentPage < 3) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleComplete = async () => {
    // Check if user is still authenticated
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('Your session has expired. Please sign in again.');
      window.location.href = '/auth';
      return;
    }

    try {
      // Update user profile with course and seniority level
      const { error } = await supabase
        .from('users')
        .update({
          enrolled_course: selectedCourse,
          seniority_level: seniorityLevel,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) throw error;

      // Force a full page reload to ensure ProtectedRoute re-checks
      window.location.href = '/';
    } catch (error) {
      alert(`There was an error saving your preferences: ${error.message}`);
    }
  };

  return (
    <>
      {/* Blurred Background */}
      <div className="fixed inset-0 bg-black" style={{ opacity: 0.95 }} />

      {/* Onboarding Content */}
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div className="w-full max-w-2xl text-white text-center">
          {/* Page 1: Welcome */}
          {currentPage === 1 && (
            <div className="animate-fadeIn">
              <h1
                className="text-5xl font-bold flex items-center justify-center transition-all duration-600"
                style={{
                  transform: showTransition ? 'translateY(-100px)' : 'translateY(0)',
                  opacity: showTransition ? 0.8 : 1,
                  minHeight: '4rem'
                }}
              >
                <span>Welcome</span>
                <span>,</span>
                <span className="text-pink-500 ml-3" style={{ minWidth: displayedName ? 'auto' : '0' }}>
                  {displayedName}
                  {showCursor && (
                    <span className="inline-block w-1 h-12 bg-pink-500 ml-1 animate-pulse" style={{ animation: 'blink 1s step-end infinite' }} />
                  )}
                </span>
              </h1>
            </div>
          )}

          {/* Page 2: Course Selection */}
          {currentPage === 2 && (
            <div>
              {/* Welcome message stays at top */}
              <h1
                className="text-5xl font-bold mb-16 flex items-center justify-center"
                style={{ transform: 'translateY(-100px)', opacity: 0.8 }}
              >
                <span>Welcome</span>
                <span>,</span>
                <span className="text-pink-500 ml-3">{displayedName}</span>
              </h1>

              {/* Course selection slides up from below */}
              <div
                className="animate-fadeIn"
                style={{
                  animation: 'slideUp 0.6s ease-out'
                }}
              >
                <h1 className="text-4xl font-bold mb-12">
                  See yourself as a
                </h1>
                <div className="mb-12 flex items-start justify-center gap-4 max-w-3xl mx-auto">
                  <div className="flex-1 relative" ref={dropdownRef}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Select your path..."
                      className="w-full bg-white text-black text-xl px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 text-left">
                        {(() => {
                          const filtered = getFilteredCourses();
                          return (
                            <>
                              {/* Available */}
                              {filtered.available.length > 0 && (
                                <div>
                                  <div className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold text-sm sticky top-0">
                                    Available
                                  </div>
                                  {filtered.available.map((course) => (
                                    <div
                                      key={course}
                                      onClick={() => handleCourseSelect(course)}
                                      className="px-6 py-3 text-black hover:bg-pink-50 cursor-pointer transition"
                                    >
                                      {course}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Upcoming */}
                              {filtered.upcoming.length > 0 && (
                                <div>
                                  <div className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold text-sm sticky top-0">
                                    Upcoming
                                  </div>
                                  {filtered.upcoming.map((course) => (
                                    <div
                                      key={course}
                                      onClick={() => handleCourseSelect(course)}
                                      className="px-6 py-3 text-black hover:bg-pink-50 cursor-pointer transition"
                                    >
                                      {course}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Requested */}
                              {filtered.requested.length > 0 && (
                                <div>
                                  <div className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold text-sm sticky top-0">
                                    Requested
                                  </div>
                                  {filtered.requested.map((course) => (
                                    <div
                                      key={course}
                                      onClick={() => handleCourseSelect(course)}
                                      className="px-6 py-3 text-black hover:bg-pink-50 cursor-pointer transition"
                                    >
                                      {course}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {filtered.available.length === 0 &&
                               filtered.upcoming.length === 0 &&
                               filtered.requested.length === 0 && (
                                <div className="px-6 py-4 text-gray-500 text-center">
                                  No courses found
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    disabled={!selectedCourse}
                    className="bg-pink-500 hover:bg-pink-600 text-white p-4 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    style={{ width: '64px', height: '64px' }}
                  >
                    <ArrowRight size={32} className="mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Page 3: Seniority Level */}
          {currentPage === 3 && (
            <div className="animate-fadeIn">
              <h1 className="text-4xl font-bold mb-4">
                We'll find the top <span className="text-pink-500">{selectedCourse}</span> jobs for you every week.
              </h1>
              <p className="text-xl text-gray-400 mb-12">Select your experience level</p>
              <div className="flex justify-center gap-6 mb-12">
                {seniorityLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setSeniorityLevel(level)}
                    className={`px-8 py-4 rounded-xl font-semibold text-lg transition ${
                      seniorityLevel === level
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <button
                onClick={handleComplete}
                disabled={!seniorityLevel}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Setup
                <ChevronRight size={24} />
              </button>
            </div>
          )}

          {/* Page Indicators - Only show on pages 2 and 3 */}
          {currentPage !== 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {[1, 2, 3].map((page) => (
                <div
                  key={page}
                  className={`w-2 h-2 rounded-full transition ${
                    currentPage === page ? 'bg-pink-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Onboarding;
