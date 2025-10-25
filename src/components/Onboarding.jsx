import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Onboarding = ({ firstName, userId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState('');
  const [displayedName, setDisplayedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const navigate = useNavigate();

  // Typing animation effect for the name
  useEffect(() => {
    if (currentPage === 1 && firstName) {
      let currentIndex = 0;
      const typingSpeed = 60; // milliseconds per character (reduced from 100)

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

  const courses = [
    'Product Management',
    'Software Engineering',
    'Data Science',
    'UX Design',
    'Digital Marketing',
    'Business Analytics'
  ];

  const seniorityLevels = ['Junior', 'Mid', 'Senior'];

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
                  opacity: showTransition ? 0.8 : 1
                }}
              >
                <span>Welcome</span>
                {displayedName && (
                  <>
                    <span>,</span>
                    <span className="text-pink-500 ml-3">
                      {displayedName}
                      {showCursor && (
                        <span className="inline-block w-1 h-12 bg-pink-500 ml-1 animate-pulse" style={{ animation: 'blink 1s step-end infinite' }} />
                      )}
                    </span>
                  </>
                )}
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
                <div className="mb-12">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full max-w-md bg-gray-800 text-white text-xl px-6 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1.5rem'
                    }}
                  >
                    <option value="" disabled>Select your path...</option>
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleNext}
                  disabled={!selectedCourse}
                  className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRight size={24} />
                </button>
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
