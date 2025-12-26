import { useState, useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { moveContactBetweenAudiences, RESEND_AUDIENCES, sendCourseWelcomeEmail } from '../lib/email';


const ONBOARDING_CACHE_KEY = 'onboarding_status_cache';
const COURSE_FETCH_TIMEOUT = 30000; // 30 seconds to handle Supabase cold starts
const MAX_COURSE_RETRIES = 2;

const Onboarding = ({ firstName, userId }) => {
  console.log('[Onboarding] 🚀 Component rendering with props:', { firstName, userId });

  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseStatus, setCourseStatus] = useState(''); // 'live', 'coming_soon', 'requested', or 'unrecognized'
  const [displayedName, setDisplayedName] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [showCourseSelection, setShowCourseSelection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [courses, setCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  // Debug: Log state changes
  console.log('[Onboarding] 📊 Current state:', {
    isLoadingCourses,
    courseError,
    coursesCount: courses.length,
    showCourseSelection,
    showNotification
  });

  // Helper function to clear onboarding cache
  const clearOnboardingCache = () => {
    try {
      sessionStorage.removeItem(ONBOARDING_CACHE_KEY);
      console.log('[Onboarding] Cleared onboarding cache');
    } catch (error) {
      console.warn('[Onboarding] Failed to clear cache:', error);
    }
  };

  // Manual retry function for course loading
  const handleRetryCourses = async () => {
    setIsLoadingCourses(true);
    setCourseError(null);

    for (let attempt = 0; attempt <= MAX_COURSE_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Onboarding] Manual retry - attempt ${attempt} of ${MAX_COURSE_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Course fetch timed out')), COURSE_FETCH_TIMEOUT);
        });

        const fetchPromise = supabase
          .from('courses')
          .select('*')
          .order('display_order', { ascending: true });

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) {
          console.error(`[Onboarding] Manual retry - database error on attempt ${attempt + 1}:`, error);
          if (attempt < MAX_COURSE_RETRIES) continue;
          setCourseError('Unable to load courses. Please check your connection and try again.');
          setCourses([]);
          break;
        }

        console.log('[Onboarding] Manual retry - courses loaded successfully:', data);
        setCourses(data || []);
        setCourseError(null);
        break;

      } catch (err) {
        console.error(`[Onboarding] Manual retry - exception on attempt ${attempt + 1}:`, err);
        if (attempt < MAX_COURSE_RETRIES) continue;

        const errorMessage = err.message === 'Course fetch timed out'
          ? 'Loading courses is taking too long. Please check your connection and try again.'
          : 'Unable to load courses. Please try again.';
        setCourseError(errorMessage);
        setCourses([]);
      }
    }

    setIsLoadingCourses(false);
  };

  // Typing animation effect for the name
  useEffect(() => {
    console.log('[Onboarding] ✍️ Typing animation useEffect triggered, firstName:', firstName);

    if (firstName) {
      let currentIndex = 0;
      const typingSpeed = 120; // milliseconds per character

      // Start typing after a short delay
      const startDelay = setTimeout(() => {
        console.log('[Onboarding] ✍️ Starting typing animation...');
        const typingInterval = setInterval(() => {
          if (currentIndex <= firstName.length) {
            setDisplayedName(firstName.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(typingInterval);
            console.log('[Onboarding] ✍️ Typing complete, waiting 500ms before hiding cursor...');
            // Stop cursor blinking after typing is done
            setTimeout(() => {
              setShowCursor(false);
              console.log('[Onboarding] ✍️ Cursor hidden, waiting 2000ms before showing course selection...');
              // After 2 seconds, show course selection
              setTimeout(() => {
                console.log('[Onboarding] ✍️ Setting showCourseSelection to TRUE');
                setShowCourseSelection(true);
              }, 2000);
            }, 500);
          }
        }, typingSpeed);

        return () => clearInterval(typingInterval);
      }, 800); // Wait 800ms before starting to type

      return () => clearTimeout(startDelay);
    } else {
      console.log('[Onboarding] ✍️ No firstName provided, skipping animation');
    }
  }, [firstName]);

  // Fetch courses from database with timeout and retry logic
  useEffect(() => {
    console.log('[Onboarding] 🔄 Course fetch useEffect triggered');

    const fetchCoursesWithRetry = async () => {
      console.log('[Onboarding] 📡 Starting fetchCoursesWithRetry...');
      setIsLoadingCourses(true);
      setCourseError(null);

      for (let attempt = 0; attempt <= MAX_COURSE_RETRIES; attempt++) {
        console.log(`[Onboarding] 🔁 Attempt ${attempt + 1} of ${MAX_COURSE_RETRIES + 1}`);

        try {
          if (attempt > 0) {
            console.log(`[Onboarding] ⏳ Waiting ${1000 * attempt}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }

          // Create a timeout promise
          console.log(`[Onboarding] ⏱️ Setting up ${COURSE_FETCH_TIMEOUT}ms timeout...`);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              console.log('[Onboarding] ⏱️ Timeout triggered!');
              reject(new Error('Course fetch timed out'));
            }, COURSE_FETCH_TIMEOUT);
          });

          // Create the fetch promise
          console.log('[Onboarding] 🌐 Creating Supabase fetch promise...');
          const fetchPromise = supabase
            .from('courses')
            .select('*')
            .order('display_order', { ascending: true });

          // Race between fetch and timeout
          console.log('[Onboarding] 🏁 Racing fetch vs timeout...');
          const startTime = Date.now();
          const result = await Promise.race([fetchPromise, timeoutPromise]);
          const duration = Date.now() - startTime;
          console.log(`[Onboarding] 🏁 Race completed in ${duration}ms, result:`, result);

          const { data, error } = result;

          if (error) {
            console.error(`[Onboarding] ❌ Database error on attempt ${attempt + 1}:`, error);
            if (attempt < MAX_COURSE_RETRIES) {
              console.log('[Onboarding] 🔄 Will retry...');
              continue;
            }
            console.log('[Onboarding] ❌ All retries exhausted, setting error state');
            setCourseError('Unable to load courses. Please check your connection and try again.');
            setCourses([]);
            break;
          }

          // Success!
          console.log('[Onboarding] ✅ Fetched courses successfully!');
          console.log('[Onboarding] 📦 Raw data:', JSON.stringify(data, null, 2));
          console.log('[Onboarding] 📦 Data length:', data?.length);
          console.log('[Onboarding] 📦 Data type:', typeof data);
          console.log('[Onboarding] 📦 Is array:', Array.isArray(data));

          setCourses(data || []);
          setCourseError(null);
          console.log('[Onboarding] ✅ State updated, breaking out of retry loop');
          break;

        } catch (err) {
          console.error(`[Onboarding] 💥 Exception on attempt ${attempt + 1}:`, err);
          console.error('[Onboarding] 💥 Error name:', err.name);
          console.error('[Onboarding] 💥 Error message:', err.message);
          console.error('[Onboarding] 💥 Error stack:', err.stack);

          if (attempt < MAX_COURSE_RETRIES) {
            console.log('[Onboarding] 🔄 Will retry after exception...');
            continue;
          }

          console.log('[Onboarding] ❌ All retries exhausted after exception');
          const errorMessage = err.message === 'Course fetch timed out'
            ? 'Loading courses is taking too long. Please check your connection and try again.'
            : 'Unable to load courses. Please try again.';
          setCourseError(errorMessage);
          setCourses([]);
        }
      }

      console.log('[Onboarding] 🏁 fetchCoursesWithRetry complete, setting isLoadingCourses to false');
      setIsLoadingCourses(false);
    };

    fetchCoursesWithRetry();
  }, []);

  // Organize courses by status
  // Treat courses without a status as 'live' to ensure they appear in onboarding
  const courseCategories = {
    live: courses.filter(c => c.status === 'live' || !c.status).map(c => c.title || c.name),
    coming_soon: courses.filter(c => c.status === 'coming_soon').map(c => c.title || c.name),
    requested: courses.filter(c => c.status === 'requested').map(c => c.title || c.name)
  };

  // Debug: Log courseCategories whenever courses change
  console.log('[Onboarding] 📚 courseCategories computed:', {
    live: courseCategories.live,
    coming_soon: courseCategories.coming_soon,
    requested: courseCategories.requested,
    totalCourses: courseCategories.live.length + courseCategories.coming_soon.length + courseCategories.requested.length
  });

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
      live: courseCategories.live.filter(c => c.toLowerCase().includes(query)),
      coming_soon: courseCategories.coming_soon.filter(c => c.toLowerCase().includes(query)),
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
    if (!selectedCourse || isSubmitting) return;

    // Show loading immediately
    setIsSubmitting(true);

    console.log('handleComplete called', { selectedCourse, courseStatus });

    // Check if user is still authenticated
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setIsSubmitting(false);
      alert('Your session has expired. Please sign in again.');
      window.location.href = '/auth';
      return;
    }

    // Determine if course is recognized
    let status = courseStatus;
    if (!status) {
      // Check if it's an unrecognized course (typed in but not in dropdown)
      const allCourses = [
        ...courseCategories.live,
        ...courseCategories.coming_soon,
        ...courseCategories.requested
      ];
      status = allCourses.includes(selectedCourse) ? 'requested' : 'unrecognized';
    }

    console.log('Course status determined:', status);

    // If live course, enroll and proceed to progress hub
    if (status === 'live') {
      console.log('Enrolling in available course:', selectedCourse);
      try {
        // Find the course in the database to get its kebab-case identifier (name field)
        const courseData = courses.find(c => c.title === selectedCourse || c.name === selectedCourse);
        const courseIdentifier = courseData?.name || selectedCourse;

        console.log('Course lookup:', { selectedCourse, courseIdentifier, courseData });

        // Update user profile with course identifier (not title)
        const { data, error } = await supabase
          .from('users')
          .update({
            enrolled_course: courseIdentifier,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select();

        console.log('Database update result:', { data, error });

        if (error) throw error;

        console.log('Update successful, data:', data);

        // Send course welcome email
        try {
          // Get the display name for the course
          const displayCourseName = courseData?.title || selectedCourse;
          await sendCourseWelcomeEmail(userId, displayCourseName);
          console.log('📧 Course welcome email sent');
        } catch (emailErr) {
          console.error('Failed to send course welcome email:', emailErr);
          // Don't block enrollment if email fails
        }

        // Sync to Resend audience - move from General to PM Free (if PM course)
        if (courseIdentifier === 'product-manager' && user?.email) {
          try {
            await moveContactBetweenAudiences(
              {
                email: user.email,
                firstName: firstName || user?.user_metadata?.first_name || '',
                lastName: user?.user_metadata?.last_name || ''
              },
              RESEND_AUDIENCES.GENERAL,  // Remove from General
              RESEND_AUDIENCES.PM_FREE   // Add to PM Free
            );
            console.log('📋 User moved from General to PM Free audience');
          } catch (audienceErr) {
            console.error('Failed to sync audience on enrollment:', audienceErr);
            // Don't block enrollment if audience sync fails
          }
        }

        console.log('Redirecting to progress hub');
        // Clear the onboarding cache before navigating
        clearOnboardingCache();

        // Use full page reload to ensure ProtectedRoute re-checks onboarding status from database
        window.location.href = '/progress';
      } catch (error) {
        console.error('Error updating user:', error);
        setIsSubmitting(false);
        alert(`There was an error saving your preferences: ${error.message}`);
      }
    } else {
      // For coming_soon, requested, or unrecognized courses, save request and show notification
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

      setIsSubmitting(false);
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
              <span className="ml-3 relative" style={{ minWidth: displayedName ? 'auto' : '0', color: '#EF0B72' }}>
                {displayedName}
                {showCursor && displayedName && (
                  <span
                    className="absolute h-12 ml-1"
                    style={{
                      animation: 'blink 1s step-end infinite',
                      width: '4px',
                      transition: 'opacity 0.3s',
                      backgroundColor: '#EF0B72'
                    }}
                  />
                )}
              </span>
            </h1>
          </div>

          {/* Course selection appears after typing AND courses are loaded */}
          {console.log('[Onboarding] 🎯 UI render check:', {
            showCourseSelection,
            isLoadingCourses,
            courseError,
            shouldShowCourseUI: showCourseSelection && !isLoadingCourses
          })}
          {showCourseSelection && !isLoadingCourses && (
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

              {/* Show error state with retry button if courses failed to load */}
              {courseError ? (
                <div className="mb-12 flex flex-col items-center py-4">
                  <p className="text-red-400 text-center mb-4">{courseError}</p>
                  <button
                    onClick={handleRetryCourses}
                    className="px-6 py-2 bg-white text-gray-800 rounded-xl hover:bg-gray-100 transition flex items-center gap-2"
                  >
                    <RefreshCw size={20} />
                    Retry
                  </button>
                </div>
              ) : !showNotification ? (
                <div className="mb-12 flex items-start gap-4">
                  <div className="flex-1 relative" ref={dropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                          setHighlightedIndex(-1);
                        }}
                        onClick={() => setIsDropdownOpen(true)}
                        onKeyDown={(e) => {
                          const filtered = getFilteredCourses();
                          const allCourses = [
                            ...filtered.live.map(c => ({ name: c, tag: 'Available', tagColor: 'bg-green-100 text-green-700', status: 'live' })),
                            ...filtered.coming_soon.map(c => ({ name: c, tag: 'Coming Soon', tagColor: 'bg-blue-100 text-blue-700', status: 'coming_soon' })),
                            ...filtered.requested.map(c => ({ name: c, tag: 'Requested', tagColor: 'bg-gray-100 text-gray-600', status: 'requested' }))
                          ];

                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setIsDropdownOpen(true);
                            setHighlightedIndex(prev =>
                              prev < allCourses.length - 1 ? prev + 1 : prev
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (highlightedIndex >= 0 && highlightedIndex < allCourses.length) {
                              // Select the highlighted course
                              const course = allCourses[highlightedIndex];
                              handleCourseSelect(course.name, course.status);
                              setTimeout(() => handleComplete(), 10);
                            } else if (searchQuery.trim()) {
                              // No course highlighted, use typed text
                              const course = searchQuery.trim();
                              setSelectedCourse(course);
                              setIsDropdownOpen(false);
                              setTimeout(() => handleComplete(), 10);
                            }
                          }
                        }}
                        placeholder=""
                        autoFocus
                        className="w-full bg-white text-black text-xl px-6 py-3 rounded-xl focus:outline-none"
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
                            ...filtered.live.map(c => ({ name: c, tag: 'Available', tagColor: 'bg-green-100 text-green-700', status: 'live' })),
                            ...filtered.coming_soon.map(c => ({ name: c, tag: 'Coming Soon', tagColor: 'bg-blue-100 text-blue-700', status: 'coming_soon' })),
                            ...filtered.requested.map(c => ({ name: c, tag: 'Requested', tagColor: 'bg-gray-100 text-gray-600', status: 'requested' }))
                          ];

                          return (
                            <>
                              {allCourses.length > 0 ? (
                                allCourses.map((course, index) => (
                                  <div
                                    key={course.name}
                                    onClick={() => handleCourseSelect(course.name, course.status)}
                                    className={`px-6 py-2 text-black cursor-pointer transition flex items-center justify-between ${
                                      index === highlightedIndex ? 'bg-pink-100' : 'hover:bg-pink-50'
                                    }`}
                                  >
                                    <span>{course.name}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${course.tagColor}`}>
                                      {course.tag}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="px-6 py-3 text-gray-500 text-center">
                                  No courses found. Type to add a custom course.
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleComplete}
                    disabled={!selectedCourse || isSubmitting}
                    className="bg-white hover:bg-white rounded-xl transition disabled:cursor-not-allowed flex-shrink-0 group flex items-center justify-center px-4 shadow-sm"
                    style={{ border: 'none', paddingTop: '13.5px', paddingBottom: '13.5px', minWidth: '56px' }}
                  >
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin" />
                    ) : (
                      <ArrowRight size={24} className="text-gray-800 group-hover:text-pink-500 transition" strokeWidth={2} />
                    )}
                  </button>
                </div>
              ) : (
                <div className="mb-12 flex items-start gap-4 animate-fadeIn">
                  <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-white flex items-center">
                    <p className="text-lg font-light">
                      We'll email you when the {selectedCourse.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')} course is available
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      // Sign out the user
                      await supabase.auth.signOut();
                      // Redirect to main landing page
                      window.location.href = 'https://ignite.education';
                    }}
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
