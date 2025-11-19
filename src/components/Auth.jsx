import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressHub from './ProgressHub';
import Onboarding from './Onboarding';
import { ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrganizationPosts } from '../lib/linkedin';
import { getCoachesForCourse } from '../lib/api';

const Auth = () => {
  // Debounce helper to prevent rapid state updates
  const debounceTimeouts = useRef({});
  const debounce = (key, callback, delay = 100) => {
    if (debounceTimeouts.current[key]) {
      clearTimeout(debounceTimeouts.current[key]);
    }
    debounceTimeouts.current[key] = setTimeout(callback, delay);
  };

  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState(null);
  const marketingSectionRef = useRef(null);
  const [animateWords, setAnimateWords] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [isCardManuallySelected, setIsCardManuallySelected] = useState(false);
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);
  const [typedEducationText, setTypedEducationText] = useState('');
  const [isEducationTypingComplete, setIsEducationTypingComplete] = useState(false);
  const coursesSectionRef = useRef(null);
  const learningModelSectionRef = useRef(null);
  const testimonialsSectionRef = useRef(null);
  const [coursePageIndex, setCoursePageIndex] = useState(0);
  const [courses, setCourses] = useState([]);
  const [typedCoursesTitle, setTypedCoursesTitle] = useState('');
  const [isCourseTitleTypingComplete, setIsCourseTitleTypingComplete] = useState(false);
  const [typedLearningTagline, setTypedLearningTagline] = useState('');
  const [isLearningTaglineTypingComplete, setIsLearningTaglineTypingComplete] = useState(false);
  const [typedTestimonialsHeading, setTypedTestimonialsHeading] = useState('');
  const [isTestimonialsHeadingTypingComplete, setIsTestimonialsHeadingTypingComplete] = useState(false);
  const [animateTestimonials, setAnimateTestimonials] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [snappedModuleIndex, setSnappedModuleIndex] = useState(0);
  const modalScrollContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [isTestimonialHovered, setIsTestimonialHovered] = useState(false);
  const [hoveredUseCase, setHoveredUseCase] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(0);
  const [linkedInPosts, setLinkedInPosts] = useState([]);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInError, setLinkedInError] = useState(null);
  const [currentLinkedInPost, setCurrentLinkedInPost] = useState(0);
  const [animateLinkedInFAQ, setAnimateLinkedInFAQ] = useState(false);
  const [typedLinkedInHeading, setTypedLinkedInHeading] = useState('');
  const [typedFAQHeading, setTypedFAQHeading] = useState('');
  const linkedInFAQSectionRef = useRef(null);
  const [courseCoaches, setCourseCoaches] = useState({});
  const authScrollContainerRef = useRef(null);

  const { user, signIn, signUp, signInWithOAuth, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Memoize selected course to avoid duplicate finds and reduce re-renders
  const selectedCourse = useMemo(() => {
    if (!selectedCourseModal) return null;
    return courses.find(c => c.name === selectedCourseModal);
  }, [selectedCourseModal, courses]);

  // Memoize selected course coaches to avoid recalculating on every render
  const selectedCourseCoaches = useMemo(() => {
    if (!selectedCourseModal) return [];
    return courseCoaches[selectedCourseModal] || [];
  }, [selectedCourseModal, courseCoaches]);

  // Memoize allLessons to avoid expensive flatMap calculations on every render
  const allLessons = useMemo(() => {
    if (!selectedCourse?.module_structure) return [];
    return selectedCourse.module_structure.flatMap((module, modIdx) =>
      (module.lessons || []).map((lesson, lesIdx) => ({
        ...lesson,
        moduleIndex: modIdx + 1,
        moduleName: module.name,
        lessonIndex: lesIdx + 1
      }))
    );
  }, [selectedCourse]);

  // Clean up OAuth hash fragments before paint to prevent flicker
  useLayoutEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Reset loading state when component mounts to handle failed OAuth redirects
  useEffect(() => {
    // Reset loading state when returning to the page
    setLoading(false);

    // Handle browser back button navigation
    const handlePopState = () => {
      setLoading(false);
      setError('');
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Intersection observer for animating words when section comes into view
  useEffect(() => {
    if (!marketingSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateWords) {
            debounce('marketingAnimation', () => {
              setAnimateWords(true);
              // Start typing animation
              startEducationTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(marketingSectionRef.current);

    return () => {
      if (marketingSectionRef.current) {
        observer.unobserve(marketingSectionRef.current);
      }
    };
  }, [isLogin, animateWords, selectedCourseModal]);

  // Fetch courses from Supabase and preload coach data
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('status', ['live', 'coming_soon'])
          .order('display_order', { ascending: true });

        if (coursesError) throw coursesError;

        // Add module_names from module_structure or modules table
        const coursesWithModules = (coursesData || []).map((course) => {
          let moduleNames = '';

          // First try to get modules from module_structure field
          if (course.module_structure && Array.isArray(course.module_structure)) {
            moduleNames = course.module_structure.map(m => m.name).join(', ');
          }

          return {
            ...course,
            module_names: moduleNames
          };
        });

        console.log('Fetched courses with modules:', coursesWithModules);
        setCourses(coursesWithModules);

        // Preload coaches for all courses to prevent flickering when modal opens
        const coachesCache = {};
        await Promise.all(
          coursesWithModules.map(async (course) => {
            try {
              const coaches = await getCoachesForCourse(course.name);
              coachesCache[course.name] = coaches || [];
            } catch (error) {
              console.error(`Error fetching coaches for ${course.name}:`, error);
              coachesCache[course.name] = [];
            }
          })
        );
        setCourseCoaches(coachesCache);
      } catch (error) {
        console.error('Error fetching courses:', error);
        console.error('Full error details:', error);
      }
    };

    fetchCourses();
  }, []);

  // Preload images to prevent flickering/pop-in
  useEffect(() => {
    const imagesToPreload = [
      'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
      'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-27%20at%2019.08.45.png'
    ];

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Reset snapped module index and scroll when modal opens
  useLayoutEffect(() => {
    if (selectedCourseModal) {
      setSnappedModuleIndex(0);
      if (modalScrollContainerRef.current) {
        modalScrollContainerRef.current.scrollLeft = 0;
      }
    }

    // Cleanup scroll timeout when modal closes
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [selectedCourseModal]);

  // Intersection observer for courses section typing animation
  useEffect(() => {
    if (!coursesSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isCourseTitleTypingComplete) {
            debounce('coursesAnimation', () => {
              startCourseTitleTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(coursesSectionRef.current);

    return () => {
      if (coursesSectionRef.current) {
        observer.unobserve(coursesSectionRef.current);
      }
    };
  }, [isLogin, isCourseTitleTypingComplete, selectedCourseModal]);

  // Intersection observer for learning model section typing animation
  useEffect(() => {
    if (!learningModelSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLearningTaglineTypingComplete) {
            debounce('learningAnimation', () => {
              startLearningTaglineTyping();
            }, 50);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-100px 0px -100px 0px' }
    );

    observer.observe(learningModelSectionRef.current);

    return () => {
      if (learningModelSectionRef.current) {
        observer.unobserve(learningModelSectionRef.current);
      }
    };
  }, [isLogin, isLearningTaglineTypingComplete, selectedCourseModal]);

  // Intersection observer for testimonials section animation
  useEffect(() => {
    if (!testimonialsSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            debounce('testimonialsAnimation', () => {
              if (!animateTestimonials) {
                setAnimateTestimonials(true);
              }
              if (!isTestimonialsHeadingTypingComplete) {
                startTestimonialsHeadingTyping();
              }
            }, 50);
          }
        });
      },
      { threshold: 0.2, rootMargin: '-100px 0px -100px 0px' }
    );

    observer.observe(testimonialsSectionRef.current);

    return () => {
      if (testimonialsSectionRef.current) {
        observer.unobserve(testimonialsSectionRef.current);
      }
    };
  }, [isLogin, animateTestimonials, isTestimonialsHeadingTypingComplete, selectedCourseModal]);

  // Auto-rotate testimonials carousel
  useEffect(() => {
    if (!animateTestimonials || !isTestimonialsHeadingTypingComplete || isTestimonialHovered || isLogin || selectedCourseModal) return;

    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % 5); // 5 testimonials total
    }, 6000); // Rotate every 6 seconds

    return () => clearInterval(interval);
  }, [animateTestimonials, isTestimonialsHeadingTypingComplete, isTestimonialHovered, isLogin, selectedCourseModal]);

  // Intersection observer for LinkedIn & FAQ section animation
  useEffect(() => {
    if (!linkedInFAQSectionRef.current || isLogin || selectedCourseModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateLinkedInFAQ) {
            debounce('linkedInAnimation', () => {
              setAnimateLinkedInFAQ(true);
              // Start typing animations for headings
              startLinkedInFAQHeadingsTyping();
              // Fetch LinkedIn posts when section becomes visible
              fetchLinkedInPosts().catch(err => {
                console.error('Failed to fetch LinkedIn posts:', err);
              });
            }, 50);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(linkedInFAQSectionRef.current);

    return () => {
      if (linkedInFAQSectionRef.current) {
        observer.unobserve(linkedInFAQSectionRef.current);
      }
    };
  }, [isLogin, animateLinkedInFAQ, selectedCourseModal]);

  // Auto-rotate LinkedIn posts every 5 seconds
  useEffect(() => {
    if (linkedInPosts.length === 0) return;

    const interval = setInterval(() => {
      setCurrentLinkedInPost((prev) => (prev + 1) % linkedInPosts.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [linkedInPosts.length]);

  // Fetch LinkedIn posts from backend API
  const fetchLinkedInPosts = async () => {
    if (linkedInPosts.length > 0) return; // Already fetched

    setLinkedInLoading(true);
    setLinkedInError(null);

    try {
      // Call backend API endpoint instead of direct LinkedIn API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/linkedin/posts?orgId=104616735&count=3`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const posts = await response.json();
      setLinkedInPosts(posts);
    } catch (error) {
      console.error('Error fetching LinkedIn posts:', error);
      setLinkedInError(error.message);
      // Fallback to mock data if API fails
      const fallbackPosts = await getOrganizationPosts();
      setLinkedInPosts(fallbackPosts);
    } finally {
      setLinkedInLoading(false);
    }
  };

  // Typing animation for LinkedIn and FAQ headings
  const startLinkedInFAQHeadingsTyping = () => {
    const linkedInText = 'Latest from Ignite';
    const faqText = 'FAQs';
    let linkedInIndex = 0;
    let faqIndex = 0;

    // Add delay before starting typing
    setTimeout(() => {
      // Type LinkedIn heading first
      const linkedInInterval = setInterval(() => {
        if (linkedInIndex <= linkedInText.length) {
          setTypedLinkedInHeading(linkedInText.substring(0, linkedInIndex));
          linkedInIndex++;
        } else {
          clearInterval(linkedInInterval);

          // Wait 1 second, then type FAQ heading
          setTimeout(() => {
            const faqInterval = setInterval(() => {
              if (faqIndex <= faqText.length) {
                setTypedFAQHeading(faqText.substring(0, faqIndex));
                faqIndex++;
              } else {
                clearInterval(faqInterval);
              }
            }, 75); // 75ms per character
          }, 1000); // 1 second delay
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Typing animation for education text
  const startEducationTyping = () => {
    const fullText = 'Education should be \naccessible, personalised and integrated for everyone.';
    const pausePositions = [
      { after: 'Education should be \naccessible,'.length, duration: 500 },
      { after: 'Education should be \naccessible, personalised'.length, duration: 500 }
    ];
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return; // Skip typing if paused

        if (currentIndex <= fullText.length) {
          setTypedEducationText(fullText.substring(0, currentIndex));

          // Check if we should pause at this position
          const pausePoint = pausePositions.find(p => currentIndex === p.after);
          if (pausePoint) {
            isPaused = true;
            setTimeout(() => {
              isPaused = false;
            }, pausePoint.duration);
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          // Keep the typing indicator for 0.5 seconds before marking as complete
          setTimeout(() => {
            setIsEducationTypingComplete(true);
          }, 500);
        }
      }, 90); // 90ms per character for slower typing
    }, 2000); // 2000ms delay before starting
  };

  // Typing animation for courses title
  const startCourseTitleTyping = () => {
    const fullText = 'The best courses.\nFor the best students.';
    const firstLineLength = 'The best courses.'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return; // Skip typing if paused

        if (currentIndex <= fullText.length) {
          setTypedCoursesTitle(fullText.substring(0, currentIndex));

          // Check if we just finished the first line
          if (currentIndex === firstLineLength) {
            isPaused = true;
            // Resume typing after 1 second
            setTimeout(() => {
              isPaused = false;
            }, 1000);
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsCourseTitleTypingComplete(true);
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Typing animation for learning tagline
  const startLearningTaglineTyping = () => {
    const fullText = 'Building a smarter, \nmore personalised era of education.';
    const pauseAfter = 'Building a smarter,'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return;

        if (currentIndex <= fullText.length) {
          setTypedLearningTagline(fullText.substring(0, currentIndex));

          // Pause after "Building a smarter,"
          if (currentIndex === pauseAfter) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 700); // 700ms pause
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsLearningTaglineTypingComplete(true);
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Typing animation for testimonials heading
  const startTestimonialsHeadingTyping = () => {
    const fullText = 'Ignite is for everyone.\nThe curious, the committed, the ambitious.';
    const pauseAfterEveryone = 'Ignite is for everyone.'.length;
    const pauseAfterCurious = 'Ignite is for everyone.\nThe curious,'.length;
    const pauseAfterCommitted = 'Ignite is for everyone.\nThe curious, the committed,'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return;

        if (currentIndex <= fullText.length) {
          setTypedTestimonialsHeading(fullText.substring(0, currentIndex));

          // Pause after "everyone"
          if (currentIndex === pauseAfterEveryone) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 700); // 700ms pause
          }
          
          // Pause after "curious,"
          if (currentIndex === pauseAfterCurious) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 500); // 500ms pause
          }
          
          // Pause after "committed,"
          if (currentIndex === pauseAfterCommitted) {
            isPaused = true;
            setTimeout(() => { isPaused = false; }, 500); // 500ms pause
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTestimonialsHeadingTypingComplete(true);
        }
      }, 75); // 75ms per character
    }, 1000); // 1000ms delay before starting
  };

  // Helper to render typed text with pink highlights for key words
  const renderTypedEducation = () => {
    const text = typedEducationText;
    const words = ['accessible', 'personalised', 'integrated'];
    const fullText = 'Education should be \naccessible, personalised and integrated for everyone.';

    // Split text into parts and highlight the key words
    let result = [];
    let lastIndex = 0;

    // Define positions of each word in the full text
    const wordPositions = words.map(word => ({
      word,
      start: fullText.indexOf(word),
      end: fullText.indexOf(word) + word.length
    }));

    let currentPos = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're at the start of a pink word
      const inPinkWord = wordPositions.find(wp => i >= wp.start && i < wp.end);

      if (inPinkWord) {
        // If this is the start of a pink word section
        if (currentPos < lastIndex || !result.length || result[result.length - 1].key !== inPinkWord.word) {
          const pinkChunk = text.substring(i, Math.min(text.length, inPinkWord.end));
          result.push(
            <span key={`${inPinkWord.word}-${i}`} style={{ display: 'inline', whiteSpace: 'nowrap', color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = Math.min(text.length - 1, inPinkWord.end - 1);
          lastIndex = i + 1;
        }
      } else {
        // Regular text - find the next pink word, line break, or end
        let nextPinkStart = text.length;
        let nextLineBreak = text.indexOf('\n', i);
        if (nextLineBreak === -1) nextLineBreak = text.length;

        for (const wp of wordPositions) {
          if (wp.start > i && wp.start < nextPinkStart && wp.start < text.length) {
            nextPinkStart = wp.start;
          }
        }

        const endPos = Math.min(nextPinkStart, nextLineBreak, text.length);
        const chunk = text.substring(i, endPos);
        if (chunk) {
          result.push(
            <span key={`text-${i}`} className="text-white" style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>
              {chunk}
            </span>
          );
          i = endPos - 1;
          lastIndex = i + 1;
        }
      }
    }

    // Add cursor if typing is not complete
    if (!isEducationTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Helper to render typed courses title with purple highlights
  const renderTypedCoursesTitle = () => {
    const text = typedCoursesTitle;
    const fullText = 'The best courses.\nFor the best students.';
    const firstLineLength = 'The best courses.'.length;

    let result = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're in the second line (after the newline character)
      const isSecondLine = i > firstLineLength;

      if (isSecondLine) {
        // Find the end of current pink section
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const pinkChunk = text.substring(i, nextBreakOrEnd);
        if (pinkChunk) {
          result.push(
            <span key={`pink-${i}`} style={{ color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      } else {
        // First line - white text
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const chunk = text.substring(i, nextBreakOrEnd);
        if (chunk) {
          result.push(
            <span key={`white-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      }
    }

    // Add cursor if typing is not complete
    if (!isCourseTitleTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Helper to render typed learning tagline with purple highlights
  const renderTypedLearningTagline = () => {
    const text = typedLearningTagline;
    const fullText = 'Building a smarter, \nmore personalised era of education.';
    const firstLineLength = 'Building a smarter, '.length;

    let result = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're in the second line (after the newline character)
      const isSecondLine = i > firstLineLength;

      if (isSecondLine) {
        // Find the end of current pink section
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const pinkChunk = text.substring(i, nextBreakOrEnd);
        if (pinkChunk) {
          result.push(
            <span key={`pink-${i}`} style={{ color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      } else {
        // First line - white text
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const chunk = text.substring(i, nextBreakOrEnd);
        if (chunk) {
          result.push(
            <span key={`white-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      }
    }

    if (!isLearningTaglineTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Helper to render typed testimonials heading with white first line and pink second line
  const renderTypedTestimonialsHeading = () => {
    const text = typedTestimonialsHeading;
    const fullText = 'Ignite is for everyone.\nThe curious, the committed, the ambitious.';
    const firstLineLength = 'Ignite is for everyone.'.length;

    let result = [];
    let lastIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle line breaks
      if (char === '\n') {
        result.push(<br key={`br-${i}`} />);
        lastIndex = i + 1;
        continue;
      }

      // Check if we're in the second line (after the newline character)
      const isSecondLine = i > firstLineLength;

      if (isSecondLine) {
        // Find the end of current pink section
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const pinkChunk = text.substring(i, nextBreakOrEnd);
        if (pinkChunk) {
          result.push(
            <span key={`pink-${i}`} style={{ color: '#EF0B72' }}>
              {pinkChunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      } else {
        // First line - white text
        let nextBreakOrEnd = text.length;
        for (let j = i; j < text.length; j++) {
          if (text[j] === '\n') {
            nextBreakOrEnd = j;
            break;
          }
        }

        const chunk = text.substring(i, nextBreakOrEnd);
        if (chunk) {
          result.push(
            <span key={`white-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = nextBreakOrEnd - 1;
          lastIndex = nextBreakOrEnd;
        }
      }
    }

    if (!isTestimonialsHeadingTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-light">|</span>
      );
    }

    return result;
  };

  // Auto-rotate through cards
  useEffect(() => {
    if (!animateWords || isLogin || selectedCourseModal || isCardManuallySelected || !isLearningTaglineTypingComplete) return;

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 4); // Rotate through 0, 1, 2, 3
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [animateWords, isLogin, selectedCourseModal, isCardManuallySelected, isLearningTaglineTypingComplete]);

  // Resume auto-rotation after manual selection
  useEffect(() => {
    if (isCardManuallySelected) {
      const timer = setTimeout(() => {
        setIsCardManuallySelected(false);
      }, 8000); // Resume auto-rotation after 8 seconds of manual selection
      return () => clearTimeout(timer);
    }
  }, [isCardManuallySelected, activeCard]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/progress');
      } else {
        const result = await signUp(email, password, firstName, lastName);
        // Show onboarding for new signups
        setNewUserId(result.user.id);
        setShowOnboarding(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setError('');
    setLoading(true);

    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err.message || 'An error occurred with OAuth sign in');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting to send password reset email to:', resetEmail);
      const result = await resetPassword(resetEmail);
      console.log('Password reset response:', result);
      setResetSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'An error occurred sending reset email');
      setLoading(false);
    }
  };

  const scrollToMarketing = () => {
    marketingSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToTestimonials = () => {
    testimonialsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToCourses = () => {
    coursesSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  const scrollToLearningModel = () => {
    learningModelSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Show onboarding if user just signed up
  if (showOnboarding) {
    return <Onboarding firstName={firstName} userId={newUserId} />;
  }

  return (
    <>
      {/* Background - Progress Hub */}
      <div
        style={{
          filter: 'blur(2px)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'fadeIn 1s ease-out forwards',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        }}
      >
        <ProgressHub />
      </div>

      {/* Auth Overlay - Scrollable Container */}
      <div
        ref={authScrollContainerRef}
        className="fixed inset-0 backdrop-blur-sm animate-fadeIn overflow-y-auto"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.75))',
          animation: 'fadeIn 0.2s ease-out',
          zIndex: 50,
          scrollBehavior: 'smooth',
          scrollSnapType: 'y mandatory',
          overflow: selectedCourseModal ? 'hidden' : 'auto',
          pointerEvents: selectedCourseModal ? 'none' : 'auto'
        }}
      >
      {/* First Section - Auth Form */}
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative" style={{ scrollSnapAlign: 'start' }}>
      <div className="relative w-full flex flex-col items-center" style={{ maxWidth: '533px' }}>
        {/* Logo */}
        <div
          className="mx-auto"
          style={{
            backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            width: 'clamp(100px, 25vw, 140px)',
            height: 'clamp(32px, 8vw, 44.8px)',
            marginBottom: 'clamp(0.75rem, 2vh, 1.25rem)'
          }}
        />

        {/* Tagline - on both sign in and create account pages */}
        <h1 className="text-lg sm:text-xl font-semibold text-white text-center px-2" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', marginBottom: 'clamp(0.75rem, 2vh, 1.25rem)', lineHeight: '1.2', fontSize: 'clamp(18.9px, 4.2vw, 27.3px)' }}>
          Upskill. Reskill.<br /><span style={{ color: '#EF0B72' }}>Get ready for what's next.</span>
        </h1>

        <div className="w-full">

        {/* Title above the box */}
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Form Card */}
        <div
          className="bg-white text-black px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4"
          style={{
            animation: 'scaleUp 0.2s ease-out'
          }}
        >

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-sm hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="truncate">Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('linkedin_oidc')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0077B5] text-white rounded-xl px-3 py-1.5 sm:py-2 text-sm hover:bg-[#006097] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="truncate">Continue with LinkedIn</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative" style={{ marginBottom: '0.625rem' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 sm:gap-2">
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 transition-all duration-200 ${isLogin ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-lg"
                  placeholder="John"
                  disabled={isLogin}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-lg"
                  placeholder="Doe"
                  disabled={isLogin}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#EF0B72] text-white rounded-xl px-4 py-1.5 sm:py-2 text-sm font-semibold hover:bg-[#D50A65] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="text-center" style={{ marginTop: '0.5rem' }}>
            {isLogin ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-black hover:text-[#EF0B72] transition"
                  style={{ fontSize: '0.85em' }}
                >
                  Don't have an account?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(true);
                    setResetEmail(email);
                    setResetSuccess(false);
                    setError('');
                  }}
                  className="text-black hover:text-[#EF0B72] transition"
                  style={{ fontSize: '0.85em' }}
                >
                  Reset password
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-black hover:text-[#EF0B72] transition"
                style={{ fontSize: '0.85em' }}
              >
                Already have an account?
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Scroll Down Arrow */}
        <div className="mt-8">
          <button
            onClick={scrollToMarketing}
            className="bg-white hover:bg-gray-100 transition shadow-lg group rounded-lg"
            style={{
              animation: 'subtleBounce 2s infinite',
              padding: '11px'
            }}
            aria-label="Scroll to learn more"
          >
            <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
          </button>
        </div>
      </div>
      </div>

      {/* Second Section - Education Philosophy */}
        <div
          ref={marketingSectionRef}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-4xl w-full text-white">
            <div className="w-full max-w-3xl mx-auto px-4">
              <h2 className="text-5xl font-bold leading-tight text-left w-full inline-block" style={{ minHeight: '240px' }}>
                <span style={{ display: 'inline', whiteSpace: 'normal' }}>
                  {renderTypedEducation()}
                </span>
              </h2>

              {/* Feature bullets - fade in after typing completes - reserve space */}
              <div className="w-full" style={{ minHeight: '280px', marginTop: '7.526px' }}>
                <div className="space-y-3 text-left">
                  {isEducationTypingComplete && (
                    <>
                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '1.2s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="leading-snug font-light">
                          <div className="text-lg font-semibold text-white">Built by Industry Experts</div>
                          <div className="text-base text-white">Our courses are built with industry experts to ensure you get the latest area expertise.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '2.4s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="leading-snug font-light">
                          <div className="text-lg font-semibold text-white">Ignite is Free</div>
                          <div className="text-base text-white">All of our courses are completely free. We're funded by limited ads, not your finances.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '3.6s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="leading-snug font-light">
                          <div className="text-lg font-semibold text-white">No Educational Prerequisite</div>
                          <div className="text-base text-white">You don't need any experience to study. Our curricula is built for all educational backgrounds.</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Down Arrow - Absolutely positioned */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={scrollToCourses}
              className={`bg-white hover:bg-gray-100 transition shadow-lg group ${isLogin ? 'rounded-full' : 'rounded-lg'}`}
              style={{
                animation: 'subtleBounce 2s infinite',
                padding: '11px'
              }}
              aria-label="Scroll to courses"
            >
              <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
            </button>
          </div>
        </div>

      {/* Third Section - Courses */}
        <div
          ref={coursesSectionRef}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 relative"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-7xl w-full text-white">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-4 w-full items-center">
              {/* Left Column - Description */}
              <div className="flex items-center justify-center" style={{ paddingLeft: '52.8px', paddingRight: '48px' }}>
                <div className="flex flex-col items-start">
                  <h3 className="font-bold text-white text-left" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '0rem' }}>
                    {renderTypedCoursesTitle()}
                  </h3>
                  <p className="text-lg text-white mb-6 max-w-2xl text-left" style={{ lineHeight: '1.425' }}>
                    We work backwards from industry professionals to build bespoke courses. Because of this, our course content is comprehensive, relevant and in-demand by employers.
                  </p>
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-27%20at%2019.08.45.png"
                    alt="Course preview"
                    className="rounded-lg"
                    style={{ width: '70%' }}
                  />
                </div>
              </div>

              {/* Right Column - 2x2 Course Grid with Swipe Navigation */}
              <div className="flex items-center gap-2" style={{ marginLeft: '-50px' }}>
                {/* Left Arrow */}
                {coursePageIndex > 0 && courses.length > 4 && (
                  <button
                    onClick={() => setCoursePageIndex(Math.max(0, coursePageIndex - 1))}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                    aria-label="Previous courses"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-4 flex-1" style={{ transform: 'scale(0.85)' }}>
                  {courses.length > 0 ? courses.slice(coursePageIndex * 4, coursePageIndex * 4 + 4).map((course) => {
                    return (
                      <div
                        key={course.name}
                        className="bg-white text-black rounded transition-all duration-300 ease-in-out flex flex-col justify-start hover:shadow-2xl overflow-hidden aspect-square relative cursor-pointer"
                        style={{ padding: '16px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.015)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onClick={() => setSelectedCourseModal(course.name)}
                      >
                        <div className="flex flex-col h-full">
                          <h4 className="text-xl font-semibold mb-2" style={{ color: '#7714E0' }}>{course.title}</h4>
                          {course.description && (
                            <p className="text-sm text-gray-700 line-clamp-4 mb-2">
                              {course.description}
                            </p>
                          )}
                          {course.module_names && (
                            <div className="pb-5">
                              <p className="text-xs text-black font-semibold mb-1">Modules:</p>
                              <ul className="text-xs text-gray-700 space-y-0.5">
                                {course.module_names.split(', ').slice(0, 6).map((moduleName, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-1.5">•</span>
                                    <span className="line-clamp-1">{moduleName}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Plus Icon */}
                        <div className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    );
                  }) : (
                    // Skeleton cards while loading
                    <>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-white/10 rounded aspect-square flex flex-col justify-start overflow-hidden animate-pulse"
                          style={{ padding: '16px' }}
                        >
                          <div className="h-6 bg-white/20 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-white/20 rounded w-full mb-1"></div>
                          <div className="h-4 bg-white/20 rounded w-5/6 mb-1"></div>
                          <div className="h-4 bg-white/20 rounded w-4/5 mb-3"></div>
                          <div className="h-3 bg-white/20 rounded w-1/2 mb-2"></div>
                          <div className="space-y-1">
                            <div className="h-3 bg-white/20 rounded w-full"></div>
                            <div className="h-3 bg-white/20 rounded w-11/12"></div>
                            <div className="h-3 bg-white/20 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Right Arrow */}
                {coursePageIndex < Math.ceil(courses.length / 4) - 1 && courses.length > 4 && (
                  <button
                    onClick={() => setCoursePageIndex(Math.min(Math.ceil(courses.length / 4) - 1, coursePageIndex + 1))}
                    className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition"
                    aria-label="Next courses"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scroll Down Arrow - Absolutely positioned */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={scrollToLearningModel}
              className={`bg-white hover:bg-gray-100 transition shadow-lg group ${isLogin ? 'rounded-full' : 'rounded-lg'}`}
              style={{
                animation: 'subtleBounce 2s infinite',
                padding: '11px'
              }}
              aria-label="Scroll to learning model"
            >
              <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
            </button>
          </div>
        </div>

      {/* Fourth Section - Learning Model */}
        <div
          ref={learningModelSectionRef}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-4xl mx-auto text-white text-left">
            {/* Learning Model Section */}
            <div className="px-4">
              <h3 className="font-bold text-white text-left" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '0.5rem', marginTop: '2rem' }}>
                {renderTypedLearningTagline()}
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-center">
                {/* Left Column - Feature Cards */}
                <div className="space-y-3 flex-shrink-0">
                  {/* Card 1 - AI smarts */}
                  <div
                    onClick={() => {
                      setActiveCard(0);
                      setIsCardManuallySelected(true);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 0
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 0 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: activeCard === 0 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <div style={{
                      transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: activeCard === 0 ? 'translateY(0)' : 'translateY(0)'
                    }}>
                      <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 0 ? '23px' : '20px' }}>
                        Levelling up learning<br />with <span style={{ color: '#7714E0' }}>smart AI integration.</span>
                      </h4>
                      {activeCard === 0 && (
                        <p className="text-black text-sm" style={{
                          marginTop: '0.2rem',
                          animation: 'fadeIn 200ms ease-in forwards',
                          animationDelay: '300ms',
                          opacity: 0
                        }}>
                          Learn like never before with Chat with Will, Smart Notes, Voice Over and Knowledge Check, all personalised and bespoke to you.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card 2 - Personalised support */}
                  <div
                    onClick={() => {
                      setActiveCard(1);
                      setIsCardManuallySelected(true);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 1
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 1 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: activeCard === 1 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <div style={{
                      transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: activeCard === 1 ? 'translateY(0)' : 'translateY(0)'
                    }}>
                      <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 1 ? '23px' : '20px' }}>
                        Personalised support<br />from <span style={{ color: '#7714E0' }}>industry professionals.</span>
                      </h4>
                      {activeCard === 1 && (
                        <p className="text-black text-sm" style={{
                          marginTop: '0.2rem',
                          animation: 'fadeIn 200ms ease-in forwards',
                          animationDelay: '300ms',
                          opacity: 0
                        }}>
                          Ignite courses are built by industry professionals. If you want 1:1 support, you can talk to them through Office Hours at a time that suits you.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card 3 - Community */}
                  <div
                    onClick={() => {
                      setActiveCard(2);
                      setIsCardManuallySelected(true);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 2
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 2 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: activeCard === 2 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <div style={{
                      transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: activeCard === 2 ? 'translateY(0)' : 'translateY(0)'
                    }}>
                      <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 2 ? '23px' : '20px' }}>
                        Connect with<br />the <span style={{ color: '#7714E0' }}>global community.</span>
                      </h4>
                      {activeCard === 2 && (
                        <p className="text-black text-sm" style={{
                          marginTop: '0.2rem',
                          animation: 'fadeIn 200ms ease-in forwards',
                          animationDelay: '300ms',
                          opacity: 0
                        }}>
                          Hear the latest conversation, industry trends and ask a question to other people in your specialism through the global Community Forum.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card 4 - Get certified */}
                  <div
                    onClick={() => {
                      setActiveCard(3);
                      setIsCardManuallySelected(true);
                    }}
                    className={`rounded cursor-pointer ${
                      activeCard === 3
                        ? 'shadow-xl'
                        : ''
                    }`}
                    style={{
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: activeCard === 3 ? '10rem' : '5rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      backgroundColor: activeCard === 3 ? '#FFFFFF' : '#F0F0F2'
                    }}
                  >
                    <div style={{
                      transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: activeCard === 3 ? 'translateY(0)' : 'translateY(0)'
                    }}>
                      <h4 className="font-semibold text-black leading-tight transition-all duration-500" style={{ fontSize: activeCard === 3 ? '23px' : '20px' }}>
                        Get certified<br />to <span style={{ color: '#7714E0' }}>take on your next role.</span>
                      </h4>
                      {activeCard === 3 && (
                        <p className="text-black text-sm" style={{
                          marginTop: '0.2rem',
                          animation: 'fadeIn 200ms ease-in forwards',
                          animationDelay: '300ms',
                          opacity: 0
                        }}>
                          Upon completing the course, you'll get a personalised certification demonstrating your knowledge with future employers and to share on LinkedIn.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Dynamic Content */}
                <div className="flex items-center justify-center">
                  <div className="rounded transition-all duration-500 bg-white p-8" style={{ height: '27.25rem', width: '32.2rem' }}>
                  </div>
                </div>
              </div>

            {/* Scroll Down Arrow */}
            <div className="flex justify-center mt-8">
              <button
                onClick={scrollToTestimonials}
                className="bg-white hover:bg-gray-100 transition shadow-lg group rounded-lg"
                style={{
                  animation: 'subtleBounce 2s infinite',
                  padding: '11px'
                }}
                aria-label="Scroll to testimonials"
              >
                <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
              </button>
            </div>
            </div>
          </div>


        </div>

      {/* Fifth Section - Merged Testimonials & Use Cases */}
        <div
          ref={testimonialsSectionRef}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="w-full text-white text-left">
            {/* Title Container */}
            <div className="max-w-4xl mx-auto px-4">
              <h3 className="font-bold text-white text-left" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px', marginBottom: '2.8rem' }}>
                {renderTypedTestimonialsHeading()}
              </h3>
            </div>

            {/* Testimonials and Cards Container */}
            <div style={{ maxWidth: '70rem', paddingLeft: '4rem', paddingRight: '0rem' }} className="mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* Left Column - Testimonials Slider */}
                <div className="flex flex-col justify-center"
                  onMouseEnter={() => setIsTestimonialHovered(true)}
                  onMouseLeave={() => setIsTestimonialHovered(false)}>
                  <div className="relative">
                    {[
                      {
                        quote: "I was completely lost about my career direction. Ignite helped me identify my strengths and understand the paths I could take. Crazy considering it's free.",
                        name: "Amelia Chen",
                        role: "Junior Designer",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/2.png"
                      },
                      {
                        quote: "Ignite gave me the confidence to change careers. Best decision I've made.",
                        name: "Sarah Matthews",
                        role: "Product Marketing Manager",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/1.png"
                      },
                      {
                        quote: "University teaches theory, but Ignite taught me how to actually succeed in the workplace. Wish I'd found this sooner!",
                        name: "James Patel",
                        role: "University Student",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/3.png"
                      },
                      {
                        quote: "Taking a career break left me feeling out of touch. Following the course and using the neat AI features allowed me learn at my own pace. I'm now really enjoying my new role.",
                        name: "Rebecca Thompson",
                        role: "Former Teacher",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/4.png"
                      },
                      {
                        quote: "Fresh perspectives that actually made a difference. Working at my own pace meant I could properly reflect and apply what I learned.",
                        name: "David Morrison",
                        role: "Sr Product Manager",
                        avatar: "https://auth.ignite.education/storage/v1/object/public/assets/5.png"
                      }
                    ].map((testimonial, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-6 rounded flex items-center justify-center"
                        style={{
                          position: idx === 0 ? 'relative' : 'absolute',
                          top: idx === 0 ? 'auto' : 0,
                          left: idx === 0 ? 'auto' : 0,
                          right: idx === 0 ? 'auto' : 0,
                          opacity: currentTestimonialIndex === idx ? 1 : 0,
                          pointerEvents: currentTestimonialIndex === idx ? 'auto' : 'none',
                          transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          width: '576px',
                          height: '324.8px',
                          overflow: 'visible'
                        }}
                      >
                        <div style={{ paddingBottom: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
                          <p className="text-gray-900 text-2xl font-medium leading-snug text-left" style={{ maxWidth: '80%' }}>
                            <span style={{ fontWeight: 'bold' }}>"</span>{testimonial.quote}<span style={{ fontWeight: 'bold' }}>"</span>
                          </p>
                        </div>
                        {/* Avatar positioned on bottom edge */}
                        <div
                          className="w-24 h-24 rounded flex-shrink-0"
                          style={{
                            position: 'absolute',
                            bottom: '-40px',
                            left: '44px',
                            backgroundImage: `url(${testimonial.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        ></div>
                        {/* Name and role positioned at bottom edge */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '155px',
                            lineHeight: '1.2'
                          }}
                        >
                          <div className="font-semibold text-black">{testimonial.name}</div>
                          <div className="text-sm text-gray-600">{testimonial.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Carousel Indicators */}
                  <div className="flex justify-center gap-2" style={{ width: '576px', marginTop: '1rem', marginLeft: '20px' }}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTestimonialIndex(idx)}
                        className={`transition-all duration-300 ${
                          currentTestimonialIndex === idx
                            ? 'bg-[#EF0B72]'
                            : 'bg-white hover:bg-gray-300'
                        }`}
                        style={{
                          width: currentTestimonialIndex === idx ? '32px' : '10px',
                          height: '10px',
                          borderRadius: '2px'
                        }}
                        aria-label={`Go to testimonial ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>


                {/* Right Column - 2x2 Grid of Cards */}
                <div className="flex items-center justify-center">
                  <div className="relative" style={{ width: '21.35rem', height: '20.3rem' }}>
                    {[
                      {
                        title: 'Recent Graduates',
                        description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.',
                        position: { top: '0', left: '0' }
                      },
                      {
                        title: 'Career Break Returners',
                        description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.',
                        position: { top: '0', left: '11.05rem' }
                      },
                      {
                        title: 'Upskilling in Role',
                        description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.',
                        position: { top: '10.525rem', left: '0' }
                      },
                      {
                        title: 'Pivotting Careers',
                        description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.',
                        position: { top: '10.525rem', left: '11.05rem' }
                      }
                    ].map((card, idx) => (
                      <div
                        key={idx}
                        onMouseEnter={() => {
                          setHoveredUseCase(idx);
                        }}
                        onMouseLeave={() => {
                          setHoveredUseCase(null);
                        }}
                        className="rounded flex items-center justify-center cursor-pointer bg-white absolute"
                        style={{
                          height: '9.775rem',
                          width: '10.3rem',
                          top: card.position.top,
                          left: card.position.left,
                          zIndex: 1,
                          padding: '1.5rem',
                          opacity: hoveredUseCase !== null ? 0 : 1,
                          transition: 'opacity 300ms ease-in-out',
                          pointerEvents: 'auto'
                        }}
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <h4 className="font-semibold leading-tight text-lg" style={{
                            color: '#7714E0'
                          }}>
                            {card.title === 'Career Break Returners' ? (
                              <>Career Break<br />Returners</>
                            ) : card.title === 'Upskilling in Role' ? (
                              <>Upskilling<br />in Role</>
                            ) : card.title}
                          </h4>
                        </div>
                      </div>
                    ))}

                    {/* Single overlay card that covers entire grid */}
                    <div
                      onMouseEnter={() => {
                        if (hoveredUseCase !== null) {
                          setHoveredUseCase(hoveredUseCase);
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredUseCase(null);
                      }}
                      className="absolute rounded flex items-center justify-center bg-white"
                      style={{
                        top: 0,
                        left: 0,
                        width: '21.35rem',
                        height: '20.3rem',
                        zIndex: 10,
                        padding: '2rem',
                        opacity: hoveredUseCase !== null ? 1 : 0,
                        visibility: hoveredUseCase !== null ? 'visible' : 'hidden',
                        transition: 'opacity 300ms ease-in-out, visibility 300ms ease-in-out',
                        pointerEvents: hoveredUseCase !== null ? 'auto' : 'none'
                      }}
                    >
                      <div className="flex flex-col items-center justify-center text-center" style={{
                        animation: hoveredUseCase !== null ? 'fadeIn 400ms ease-in forwards' : 'none',
                        animationDelay: '100ms',
                        opacity: 0
                      }}>
                        <h4 className="font-semibold leading-tight text-2xl mb-4" style={{
                          color: '#7714E0'
                        }}>
                          {hoveredUseCase !== null ? [
                            { title: 'Recent Graduates', description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.' },
                            { title: 'Career Break Returners', description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.' },
                            { title: 'Upskilling in Role', description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.' },
                            { title: 'Pivotting Careers', description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.' }
                          ][hoveredUseCase].title : ''}
                        </h4>
                        <p className="text-black text-base leading-relaxed">
                          {hoveredUseCase !== null ? [
                            { title: 'Recent Graduates', description: 'Launch your career with industry-relevant skills and hands-on experience that employers value. Our comprehensive courses provide you with practical knowledge and real-world projects to build a strong portfolio.' },
                            { title: 'Career Break Returners', description: 'Refresh your skills and confidently re-enter the workforce with updated knowledge and support. We understand the challenges of returning to work and provide a supportive environment to rebuild your confidence.' },
                            { title: 'Upskilling in Role', description: 'Stay ahead in your current position by mastering the latest tools and techniques in your field. Learn at your own pace while applying new skills directly to your current role for immediate impact.' },
                            { title: 'Pivotting Careers', description: 'Transform your career path with comprehensive training designed to help you transition successfully. We provide structured learning paths that bridge your existing experience with new career opportunities.' }
                          ][hoveredUseCase].description : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-12">
                <button
                  onClick={() => {
                    linkedInFAQSectionRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }}
                  className="bg-white hover:bg-gray-100 transition shadow-lg group rounded-lg"
                  style={{
                    animation: 'subtleBounce 2s infinite',
                    padding: '11px'
                  }}
                  aria-label="Scroll to LinkedIn and FAQs"
                >
                  <ChevronDown size={24} className="text-black group-hover:text-[#EF0B72] transition" />
                </button>
              </div>
            </div>
          </div>

      {/* Sixth Section - LinkedIn & FAQs */}
        <div
          ref={linkedInFAQSectionRef}
          className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
          style={{
            background: 'black',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-7xl w-full text-white">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 max-w-7xl mx-auto" style={{ marginBottom: '35px' }}>
              {/* Left Column - LinkedIn Posts */}
              <div className="flex flex-col items-center" style={{ marginLeft: '20px' }}>
                <div className="flex justify-center" style={{ minHeight: 'calc(2.4rem + 60px + 1.5rem)' }}>
                  <h3 className="font-bold text-white text-left" style={{ fontSize: '2rem', lineHeight: '1.2', minHeight: '2.4rem', paddingTop: '60px', width: '320px', marginBottom: '1.5rem' }}>{typedLinkedInHeading}</h3>
                </div>

                {linkedInLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading posts...</p>
                  </div>
                ) : linkedInPosts.length > 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    {/* Single Post Display */}
                    <div
                      className="bg-white rounded-lg p-6 text-gray-800 w-full max-w-md"
                      style={{
                        aspectRatio: '1 / 1',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        opacity: 1,
                        transform: animateLinkedInFAQ ? 'translateY(0)' : 'translateY(10px)',
                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <p className="text-sm leading-relaxed mb-3 overflow-auto flex-1">
                        {linkedInPosts[currentLinkedInPost]?.text}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(linkedInPosts[currentLinkedInPost]?.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <div className="flex gap-4">
                          <span>👍 {linkedInPosts[currentLinkedInPost]?.likes}</span>
                          <span>💬 {linkedInPosts[currentLinkedInPost]?.comments}</span>
                          <span>🔁 {linkedInPosts[currentLinkedInPost]?.shares}</span>
                        </div>
                      </div>
                    </div>

                    {/* Carousel Indicators with Arrows */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                      {/* Left Arrow */}
                      <button
                        onClick={() => setCurrentLinkedInPost((prev) => (prev - 1 + linkedInPosts.length) % linkedInPosts.length)}
                        className="bg-white hover:bg-white transition flex-shrink-0 group"
                        style={{ borderRadius: '4px', padding: '6px' }}
                        aria-label="Previous post"
                      >
                        <svg className="text-black group-hover:text-[#D84A8C] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Dot Indicators */}
                      <div className="flex justify-center gap-2">
                        {linkedInPosts.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentLinkedInPost(idx)}
                            className={`transition-all duration-300 ${
                              currentLinkedInPost === idx
                                ? 'bg-[#EF0B72]'
                                : 'bg-white hover:bg-gray-300'
                            }`}
                            style={{
                              width: currentLinkedInPost === idx ? '32px' : '10px',
                              height: '10px',
                              borderRadius: '2px'
                            }}
                            aria-label={`Go to post ${idx + 1}`}
                          />
                        ))}
                      </div>

                      {/* Right Arrow */}
                      <button
                        onClick={() => setCurrentLinkedInPost((prev) => (prev + 1) % linkedInPosts.length)}
                        className="bg-white hover:bg-white transition flex-shrink-0 group"
                        style={{ borderRadius: '4px', padding: '6px' }}
                        aria-label="Next post"
                      >
                        <svg className="text-black group-hover:text-[#D84A8C] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Right Column - FAQs */}
              <div>
                <div className="flex justify-center" style={{ minHeight: 'calc(2.4rem + 60px + 1.5rem)' }}>
                  <h3 className="font-bold text-white mb-6 text-left" style={{ fontSize: '2rem', lineHeight: '1.2', minHeight: '2.4rem', paddingTop: '60px', width: '80px' }}>{typedFAQHeading}</h3>
                </div>

                <div className="space-y-3" style={{ height: '30.5rem', width: '85%', margin: '0 auto' }}>
                {[
                  {
                    question: 'What is Ignite?',
                    answer: 'Ignite gives you free, expert-led courses in high-demand careers like Product Management and Cybersecurity, so you can build the skills that actually get you hired in today\'s competitive job market.'
                  },
                  {
                    question: 'Who is Ignite for?',
                    answer: 'Ignite is for anyone ready to level up their career, especially students, recent graduates, and young professionals looking to break into competitive fields, switch careers, or gain new skills quickly.'
                  },
                  {
                    question: 'How much does Ignite cost?',
                    answer: 'Ignite courses are completely free, supported by limited advertising. Want an ad-free experience plus exclusive access to industry professionals and curated job opportunities? Upgrade for just 99p/week.'
                  },
                  {
                    question: 'What can I learn on Ignite?',
                    answer: 'We offer comprehensive courses in Product Management and Cyber Security, with more fields launching soon. Each course includes interactive lessons, knowledge checks and certification to boost your CV.'
                  },
                  {
                    question: 'Can I learn at my own pace?',
                    answer: 'Absolutely. Ignite courses are self-paced, so you can learn when and where it works best for you. We suggest completing 2 to 4 lessons per week for the best results and maximum knowledge retention.'
                  },
                  {
                    question: 'What makes Ignite different?',
                    answer: 'Unlike other platforms, Ignite is completely free with no paywalls or hidden costs. We focus on practical, industry-relevant skills that employers actually want, not just theory. Our courses get you job-ready, fast.'
                  }
                ].map((faq, idx) => (
                  <div
                    key={idx}
                    className="rounded cursor-pointer"
                    style={{
                      backgroundColor: expandedFAQ === idx ? '#FFFFFF' : '#F0F0F2',
                      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      height: expandedFAQ === idx ? '6.75rem' : '3.75rem',
                      overflow: 'hidden',
                      paddingTop: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: '1rem',
                      paddingLeft: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      opacity: 0,
                      animation: animateLinkedInFAQ ? `fadeInUp 0.8s ease-out ${0.5 + idx * 0.1}s forwards` : 'none'
                    }}
                    onMouseEnter={() => debounce('faqExpand', () => setExpandedFAQ(idx), 250)}
                  >
                    <div style={{
                      transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: expandedFAQ === idx ? 'translateY(0)' : 'translateY(0)'
                    }}>
                      <h4 className="font-semibold leading-tight transition-all duration-500" style={{ fontSize: '20px', color: expandedFAQ === idx ? '#EF0B72' : '#000000' }}>
                        {faq.question}
                      </h4>
                      {expandedFAQ === idx && (
                        <p className="text-black text-sm" style={{
                          marginTop: '0.2rem',
                          animation: 'fadeIn 200ms ease-in forwards',
                          animationDelay: '300ms',
                          opacity: 0
                        }}>
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="flex justify-center px-4 pb-8" style={{ paddingTop: '0px' }}>
              <button
                onClick={() => {
                  if (authScrollContainerRef.current) {
                    authScrollContainerRef.current.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }
                }}
                className="bg-[#EF0B72] hover:bg-[#D50A65] text-white font-semibold py-3 px-8 rounded transition"
                style={{ fontSize: '16px' }}
              >
                Get Started
              </button>
            </div>

            {/* Footer Links */}
            <div className="flex justify-center gap-8 px-4 pb-12">
              <a
                href="mailto:hello@ignite.education"
                className="text-white hover:text-pink-500 transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Contact
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/jobs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-pink-500 transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Careers
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-pink-500 transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                LinkedIn
              </a>
              <a
                href="https://ignite.education/policy"
                className="text-white hover:text-pink-500 transition font-semibold"
                style={{ fontSize: '14px' }}
              >
                Policy
              </a>
            </div>
          </div>
        </div>
    </div>

    {/* Password Reset Modal */}
    {showResetPassword && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
        }}
        onClick={() => {
          setShowResetPassword(false);
          setResetSuccess(false);
          setError('');
        }}
      >
        <div className="relative">
          <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
            Reset Password
          </h2>

          <div
            className="bg-white relative"
            style={{
              width: '450px',
              maxWidth: '90vw',
              animation: 'scaleUp 0.2s ease-out',
              padding: '2rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowResetPassword(false);
                setResetSuccess(false);
                setError('');
              }}
              className="absolute top-4 right-4 text-gray-600 hover:text-black"
            >
              <X size={24} />
            </button>

            {!resetSuccess ? (
              <>
                <p className="text-gray-700 mb-4 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-black">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full bg-gray-100 text-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#EF0B72] text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-[#D50A65] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">Check Your Email</h3>
                <p className="text-gray-700 text-sm mb-4">
                  We've sent a password reset link to <strong>{resetEmail}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Course Details Modal */}
    {selectedCourse && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
        }}
        onClick={() => setSelectedCourseModal(null)}
      >
        <div className="relative">
          <>
            {/* Title above the box */}
            <h2 className="font-semibold text-white pl-1" style={{ marginBottom: '0.15rem', fontSize: '1.35rem' }}>
              {selectedCourse.title}
            </h2>

          <div
            className="bg-white relative flex flex-col animate-scaleUp"
            style={{
              width: '720px',
              height: '70vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedCourseModal(null)}
              className="absolute top-6 right-6 text-gray-600 hover:text-black z-10"
            >
              <X size={24} />
            </button>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto px-8"
              style={{ scrollbarWidth: 'none', paddingTop: '25.6px', paddingBottom: '20px' }}
            >
              <div>
                {selectedCourse.status === 'coming_soon' && (
                  <div className="mb-6">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">Coming Soon</span>
                  </div>
                )}
                {selectedCourse.status === 'requested' && (
                  <div className="mb-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">Requested</span>
                  </div>
                )}

                {/* Full description */}
                <div className="text-black leading-relaxed mb-6" style={{ maxWidth: '100%', marginTop: '0.3rem' }}>
                  {(() => {
                    const description = selectedCourse.description || '';
                    const firstSentenceEnd = description.indexOf('. ');
                    if (firstSentenceEnd !== -1) {
                      const firstSentence = description.substring(0, firstSentenceEnd + 1);
                      const restOfDescription = description.substring(firstSentenceEnd + 1).trim();
                      // Highlight "leading products from concept to launch" in pink
                      const pinkPhrase = 'leading products from concept to launch';
                      const pinkIndex = firstSentence.toLowerCase().indexOf(pinkPhrase);

                      if (pinkIndex !== -1) {
                        const before = firstSentence.substring(0, pinkIndex);
                        const pink = firstSentence.substring(pinkIndex, pinkIndex + pinkPhrase.length);
                        const after = firstSentence.substring(pinkIndex + pinkPhrase.length);

                        return (
                          <>
                            <span style={{ fontWeight: 600, fontSize: '20px' }}>
                              {before}
                              <span style={{ color: '#EC4899' }}>{pink}</span>
                              {after}
                            </span>
                            {restOfDescription && (
                              <>
                                <br /><br />
                                <span style={{ fontWeight: 400, fontSize: '16px' }}>{restOfDescription}</span>
                              </>
                            )}
                          </>
                        );
                      }

                      return (
                        <>
                          <span style={{ fontWeight: 600, fontSize: '20px' }}>{firstSentence}</span>
                          {restOfDescription && (
                            <>
                              <br /><br />
                              <span style={{ fontWeight: 400, fontSize: '16px' }}>{restOfDescription}</span>
                            </>
                          )}
                        </>
                      );
                    }
                    return <span style={{ fontWeight: 600, fontSize: '20px' }}>{description}</span>;
                  })()}
                </div>

                {/* Module and Lesson Details - Swipable Cards */}
                {selectedCourse.module_structure && Array.isArray(selectedCourse.module_structure) && selectedCourse.module_structure.length > 0 ? (
                  <div className="mb-6 relative">
                    <h3 className="font-semibold text-gray-900 mb-1.5" style={{ fontSize: '17px' }}>
                      {(() => {
                        if (allLessons.length > 0 && snappedModuleIndex < allLessons.length && allLessons[snappedModuleIndex]) {
                          const currentLesson = allLessons[snappedModuleIndex];
                          return `Module ${currentLesson.moduleIndex} - ${currentLesson.moduleName}`;
                        }
                        return 'Course Modules';
                      })()}
                    </h3>
                    <div
                      ref={modalScrollContainerRef}
                      className="overflow-x-auto overflow-y-hidden select-none"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        cursor: 'grab',
                        scrollSnapType: 'x mandatory',
                        scrollSnapStop: 'always',
                        scrollPaddingLeft: '0px'
                      }}
                      onScroll={(e) => {
                        const scrollLeft = e.target.scrollLeft;
                        const cardWidth = 406; // Approximate card width + gap (390 + 16)
                        const newIndex = Math.round(scrollLeft / cardWidth);

                        // Throttle updates to avoid excessive re-renders during scroll
                        if (scrollTimeoutRef.current) {
                          clearTimeout(scrollTimeoutRef.current);
                        }

                        scrollTimeoutRef.current = setTimeout(() => {
                          setSnappedModuleIndex(newIndex);
                        }, 50); // Update only after 50ms of no scrolling
                      }}
                    >
                      <div className="flex gap-4" style={{ minHeight: '100px', height: '100px' }}>
                        {allLessons.map((lesson, index) => (
                            <div
                              key={`${lesson.moduleIndex}-${lesson.lessonIndex}`}
                              className="relative flex items-center gap-3 flex-shrink-0"
                              style={{
                                width: '390px',
                                minWidth: '390px',
                                paddingTop: '5.618px',
                                paddingRight: '5.618px',
                                paddingBottom: '5.618px',
                                paddingLeft: '14px',
                                background: '#7714E0',
                                height: '90px',
                                scrollSnapAlign: 'start',
                                scrollSnapStop: 'always'
                              }}
                            >
                              {/* Opacity overlay for non-snapped cards - Always rendered, controlled by CSS opacity */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                  backdropFilter: 'blur(0.75px)',
                                  WebkitBackdropFilter: 'blur(0.75px)',
                                  pointerEvents: 'none',
                                  opacity: index === snappedModuleIndex ? 0 : 1,
                                  transition: 'opacity 0.2s ease-out',
                                  willChange: 'opacity'
                                }}
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold truncate text-white" style={{ marginBottom: '3px', fontSize: '13px' }}>
                                  {lesson.name || `Lesson ${lesson.lessonIndex}`}
                                </h4>
                                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.01rem' }}>
                                  {(lesson.bullet_points || [])
                                    .slice(0, 3)
                                    .map((bulletPoint, idx) => (
                                      <li key={idx} className="text-xs flex items-start gap-2 text-purple-100">
                                        <span className="mt-0.5 text-purple-200">•</span>
                                        <span>{bulletPoint}</span>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Back to First Lesson Button - Show when not viewing first lesson */}
                    {snappedModuleIndex > 0 && (
                      <button
                        onClick={() => {
                          if (modalScrollContainerRef.current) {
                            modalScrollContainerRef.current.scrollTo({
                              left: 0,
                              behavior: 'smooth'
                            });
                          }
                        }}
                        className="absolute bg-white text-black hover:bg-purple-50 transition-all"
                        style={{
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-20%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          zIndex: 10,
                          opacity: 0.7
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Fallback for courses without module_structure */
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-3 text-gray-900">Course Structure</h3>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        <strong>
                          {selectedCourse.modules && selectedCourse.modules.toLowerCase() === 'multiple'
                            ? 'Multiple comprehensive modules'
                            : `${selectedCourse.modules} comprehensive module${selectedCourse.modules !== '1' ? 's' : ''}`}
                        </strong>
                      </p>
                      {selectedCourse.lessons > 0 && (
                        <p className="text-gray-700">{selectedCourse.lessons} lessons</p>
                      )}
                      {selectedCourse.duration && (
                        <p className="text-gray-700">Duration: {selectedCourse.duration}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Course Benefits - Single Row Layout */}
                <div className="flex items-center" style={{ minHeight: '80px', marginTop: '-7.2px', marginBottom: '19.2px' }}>
                  <div className="grid grid-cols-3 gap-x-8 text-base text-black font-medium w-full">
                    <div className="flex items-center" style={{ paddingLeft: '1rem' }}>
                      <svg className="w-6.5 h-6.5 text-purple-600 flex-shrink-0" style={{ marginRight: '9.6px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="leading-tight">Certificate upon<br/>completion</span>
                    </div>
                    <div className="flex items-center" style={{ paddingLeft: '1rem' }}>
                      <svg className="w-6.5 h-6.5 text-purple-600 flex-shrink-0" style={{ marginRight: '9.6px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="leading-tight">Taught by industry<br/>expert instructors</span>
                    </div>
                    <div className="flex items-center" style={{ paddingLeft: '1rem' }}>
                      <svg className="w-6.5 h-6.5 text-purple-600 flex-shrink-0" style={{ marginRight: '9.6px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="leading-tight">Self-paced<br/>learning</span>
                    </div>
                  </div>
                </div>

                {/* Course Coaches Section - Always rendered with min-height to prevent layout shift */}
                <div className="mb-6" style={{ minHeight: selectedCourseCoaches.length > 0 ? 'auto' : '0' }}>
                  {selectedCourseCoaches.length > 0 && (
                    <>
                      <h3 className="font-semibold text-gray-900 mb-3" style={{ fontSize: '17px' }}>
                        Course Leaders
                      </h3>
                      <div className="flex flex-col gap-4">
                        {selectedCourseCoaches.map((coach, index) => (
                        <div key={index} className="flex gap-4 items-start">
                          {/* Left side - Coach info */}
                          <div className="flex items-start gap-3 flex-shrink-0" style={{ width: '240px' }}>
                            {coach.linkedin_url ? (
                              <a
                                href={coach.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 group transition-all"
                              >
                                {coach.image_url ? (
                                  <img
                                    src={coach.image_url}
                                    alt={coach.name}
                                    className="w-16 h-16 rounded-lg object-cover"
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-gray-200" />
                                )}
                                <div>
                                  <h4 className="font-semibold text-black group-hover:text-[#FF1CF7] transition-colors" style={{ fontSize: '14px' }}>
                                    {coach.name}
                                  </h4>
                                  {coach.position && (
                                    <p className="text-black text-sm group-hover:text-[#FF1CF7] transition-colors">{coach.position}</p>
                                  )}
                                </div>
                              </a>
                            ) : (
                              <div className="flex items-start gap-3 group">
                                {coach.image_url ? (
                                  <img
                                    src={coach.image_url}
                                    alt={coach.name}
                                    className="w-16 h-16 rounded-lg object-cover"
                                    onError={(e) => {
                                      e.target.src = '';
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-gray-200" />
                                )}
                                <div>
                                  <h4 className="font-semibold text-black group-hover:text-[#FF1CF7] transition-colors" style={{ fontSize: '14px' }}>
                                    {coach.name}
                                  </h4>
                                  {coach.position && (
                                    <p className="text-black text-sm group-hover:text-[#FF1CF7] transition-colors">{coach.position}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right side - Description or skeleton */}
                          <div className="flex-1 pt-0.5">
                            {coach.description ? (
                              <p className="text-black text-sm leading-relaxed">
                                {coach.description}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                                <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
                                <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6" />
                              </div>
                            )}
                          </div>
                        </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Get Started Button */}
                <div className="mt-6">
                  <button
                onClick={async () => {
                  if (selectedCourse.status === 'live' && user) {
                    try {
                      console.log('📝 Enrolling in course:', {
                        courseId: selectedCourse.id,
                        courseName: selectedCourse.name,
                        courseTitle: selectedCourse.title,
                        userId: user.id
                      });

                      // Verify the course has lesson data
                      const { data: lessonCheck, error: lessonError } = await supabase
                        .from('lessons')
                        .select('id')
                        .eq('course_id', selectedCourse.name)
                        .limit(1);

                      if (lessonError) {
                        console.error('Error checking lessons:', lessonError);
                      }

                      if (!lessonCheck || lessonCheck.length === 0) {
                        console.warn('⚠️ No lessons found for course:', selectedCourse.name);
                        console.log('Checking if module_structure exists...');

                        // Check if the course has module_structure data
                        if (!selectedCourse.module_structure || selectedCourse.module_structure.length === 0) {
                          alert(`This course doesn't have lesson content yet. Please contact support.`);
                          setSelectedCourseModal(null);
                          return;
                        }
                      }

                      // Enroll user in the course
                      const { error } = await supabase
                        .from('users')
                        .update({ enrolled_course: selectedCourse.name })
                        .eq('id', user.id);

                      if (error) throw error;

                      console.log('✅ User enrolled in course:', selectedCourse.name);

                      // Navigate to progress hub
                      window.location.href = '/progress';
                    } catch (error) {
                      console.error('Error enrolling in course:', error);
                      alert('Failed to enroll in course. Please try again.');
                    }
                  } else {
                    // Close modal first
                    setSelectedCourseModal(null);
                    // Set to sign-up mode
                    setIsLogin(false);
                    // Wait for modal close animation, then scroll to top
                    setTimeout(() => {
                      if (authScrollContainerRef.current) {
                        const container = authScrollContainerRef.current;
                        const startPosition = container.scrollTop;
                        const duration = 800; // 800ms for slower, smoother scroll
                        const startTime = performance.now();

                        const easeInOutCubic = (t) => {
                          return t < 0.5
                            ? 4 * t * t * t
                            : 1 - Math.pow(-2 * t + 2, 3) / 2;
                        };

                        const animateScroll = (currentTime) => {
                          const elapsed = currentTime - startTime;
                          const progress = Math.min(elapsed / duration, 1);
                          const easeProgress = easeInOutCubic(progress);

                          container.scrollTop = startPosition * (1 - easeProgress);

                          if (progress < 1) {
                            requestAnimationFrame(animateScroll);
                          }
                        };

                        requestAnimationFrame(animateScroll);
                      }
                    }, 300);
                  }
                }}
                className={`w-full font-semibold py-3 rounded-lg transition ${
                  selectedCourse.status === 'live'
                    ? 'bg-[#EF0B72] text-white hover:bg-[#D50A65]'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                disabled={selectedCourse.status !== 'live'}
              >
                {selectedCourse.status === 'live' ? 'Get Started' : 'Notify Me When Available'}
              </button>
                </div>
              </div>
            </div>
          </div>
          </>
        </div>
      </div>
    )}
    </>
  );
};

export default Auth;
