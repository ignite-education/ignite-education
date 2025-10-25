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
    available: ['Product Manager'],
    upcoming: ['Cyber Security Analyst'],
    requested: [
      'Software Engineer', 'Data Scientist', 'UX Designer', 'Digital Marketer',
      'Business Analyst', 'Cloud Architect', 'DevOps Engineer',
      'Machine Learning Engineer', 'Frontend Developer', 'Backend Developer',
      'Full Stack Developer', 'Mobile Developer', 'Game Developer',
      'Data Engineer', 'Business Intelligence Analyst', 'Financial Analyst',
      'Investment Banker', 'Management Consultant', 'Strategy Consultant',
      'Sales Engineer', 'Technical Writer', 'Content Marketer',
      'Growth Marketer', 'Brand Manager', 'Public Relations Manager',
      'Human Resources Manager', 'Talent Acquisition Specialist', 'Operations Manager',
      'Supply Chain Manager', 'Legal Counsel', 'Corporate Lawyer',
      'Intellectual Property Lawyer', 'Accountant', 'Tax Advisor',
      'Auditor', 'Risk Manager', 'Compliance Officer', 'Quality Assurance Engineer',
      'Test Automation Engineer', 'Site Reliability Engineer', 'Network Engineer',
      'Systems Administrator', 'Database Administrator', 'Information Security Analyst',
      'Penetration Tester', 'Incident Response Analyst', 'Architect',
      'Interior Designer', 'Graphic Designer', 'Motion Graphics Designer'
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
        <div className="w-full max-w-3xl text-white">
          {/* Page 1: Welcome */}
          {currentPage === 1 && (
            <div className="animate-fadeIn px-4">
              <h1
                className="text-5xl font-bold inline-flex items-center transition-all duration-600"
                style={{
                  transform: showTransition ? 'translateY(-100px)' : 'translateY(0)',
                  opacity: 1,
                  minHeight: '4rem'
                }}
              >
                <span>Welcome</span>
                <span>,</span>
                <span className="text-pink-500 ml-3 relative" style={{ minWidth: displayedName ? 'auto' : '0' }}>
                  {displayedName}
                  <span
                    className="absolute h-12 bg-pink-500 ml-1"
                    style={{
                      animation: 'blink 1s step-end infinite',
                      width: '4px',
                      opacity: showCursor ? 1 : 0,
                      transition: 'opacity 0.3s'
                    }}
                  />
                </span>
              </h1>
            </div>
          )}

          {/* Page 2: Course Selection */}
          {currentPage === 2 && (
            <div className="text-left px-4">
              {/* Welcome message stays at top */}
              <h1
                className="text-5xl font-bold inline-flex items-start"
                style={{ transform: 'translateY(-100px)', opacity: 1, marginBottom: '2px' }}
              >
                <span>Welcome</span>
                <span>,</span>
                <span className="text-pink-500 ml-3">{displayedName}</span>
              </h1>

              {/* Course selection */}
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  See yourself as a
                </h2>
                <div className="mb-12 flex items-start gap-4">
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
                      style={{
                        caretColor: '#ec4899'
                      }}
                    />

                    {isDropdownOpen && (
                      <div
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-y-auto z-50 text-left"
                        style={{
                          maxHeight: 'calc(100vh - 400px)'
                        }}
                      >
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
                    className="bg-white hover:bg-white text-gray-800 p-4 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 group"
                    style={{ width: '64px', height: '64px' }}
                  >
                    <ArrowRight size={32} className="mx-auto text-gray-800 group-hover:text-pink-500 transition" />
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

        </div>
      </div>
    </>
  );
};

export default Onboarding;
