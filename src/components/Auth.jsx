import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
const ProgressHub = lazy(() => import('./ProgressHub'));
import Onboarding from './Onboarding';
import { ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOrganizationPosts } from '../lib/linkedin';
import { getCoachesForCourse } from '../lib/api';

const Auth = () => {
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
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [isTestimonialHovered, setIsTestimonialHovered] = useState(false);
  const [hoveredUseCase, setHoveredUseCase] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [linkedInPosts, setLinkedInPosts] = useState([]);
  const [linkedInLoading, setLinkedInLoading] = useState(false);
  const [linkedInError, setLinkedInError] = useState(null);
  const [animateLinkedInFAQ, setAnimateLinkedInFAQ] = useState(false);
  const linkedInFAQSectionRef = useRef(null);
  const [courseCoaches, setCourseCoaches] = useState({});
  const authScrollContainerRef = useRef(null);

  const { user, signIn, signUp, signInWithOAuth, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (user && !showOnboarding) {
      // Clean up any hash fragments from OAuth redirect
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      navigate('/progress', { replace: true });
    }
  }, [user, navigate, showOnboarding]);

  // Intersection observer for animating words when section comes into view
  useEffect(() => {
    if (!marketingSectionRef.current || isLogin) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateWords) {
            setAnimateWords(true);
            // Start typing animation
            startEducationTyping();
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
  }, [isLogin, animateWords]);

  // Fetch courses from Supabase
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
      } catch (error) {
        console.error('Error fetching courses:', error);
        console.error('Full error details:', error);
      }
    };

    fetchCourses();
  }, []);

  // Reset snapped module index when modal opens and fetch coaches
  useEffect(() => {
    if (selectedCourseModal) {
      setSnappedModuleIndex(0);
      if (modalScrollContainerRef.current) {
        modalScrollContainerRef.current.scrollLeft = 0;
      }

      // Fetch coaches for the selected course if not already loaded
      if (!courseCoaches[selectedCourseModal]) {
        const fetchCoaches = async () => {
          try {
            const coaches = await getCoachesForCourse(selectedCourseModal);
            setCourseCoaches(prev => ({
              ...prev,
              [selectedCourseModal]: coaches || []
            }));
          } catch (error) {
            console.error('Error fetching coaches for course:', error);
            setCourseCoaches(prev => ({
              ...prev,
              [selectedCourseModal]: []
            }));
          }
        };
        fetchCoaches();
      }
    }
  }, [selectedCourseModal]);

  // Intersection observer for courses section typing animation
  useEffect(() => {
    if (!coursesSectionRef.current || isLogin) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isCourseTitleTypingComplete) {
            startCourseTitleTyping();
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
  }, [isLogin, isCourseTitleTypingComplete]);

  // Intersection observer for learning model section typing animation
  useEffect(() => {
    if (!learningModelSectionRef.current || isLogin) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLearningTaglineTypingComplete) {
            startLearningTaglineTyping();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(learningModelSectionRef.current);

    return () => {
      if (learningModelSectionRef.current) {
        observer.unobserve(learningModelSectionRef.current);
      }
    };
  }, [isLogin, isLearningTaglineTypingComplete]);

  // Intersection observer for testimonials section animation
  useEffect(() => {
    if (!testimonialsSectionRef.current || isLogin) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!animateTestimonials) {
              setAnimateTestimonials(true);
            }
            if (!isTestimonialsHeadingTypingComplete) {
              startTestimonialsHeadingTyping();
            }
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(testimonialsSectionRef.current);

    return () => {
      if (testimonialsSectionRef.current) {
        observer.unobserve(testimonialsSectionRef.current);
      }
    };
  }, [isLogin, animateTestimonials, isTestimonialsHeadingTypingComplete]);

  // Auto-rotate testimonials carousel
  useEffect(() => {
    if (!animateTestimonials || isTestimonialHovered || isLogin) return;

    const interval = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % 6); // 6 testimonials total
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [animateTestimonials, isTestimonialHovered, isLogin]);

  // Intersection observer for LinkedIn & FAQ section animation
  useEffect(() => {
    if (!linkedInFAQSectionRef.current || isLogin) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateLinkedInFAQ) {
            setAnimateLinkedInFAQ(true);
            // Fetch LinkedIn posts when section becomes visible
            fetchLinkedInPosts().catch(err => {
              console.error('Failed to fetch LinkedIn posts:', err);
            });
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
  }, [isLogin, animateLinkedInFAQ]);

  // Fetch LinkedIn posts
  const fetchLinkedInPosts = async () => {
    if (linkedInPosts.length > 0) return; // Already fetched

    setLinkedInLoading(true);
    setLinkedInError(null);

    try {
      const posts = await getOrganizationPosts('104616735', 3); // Fetch 3 posts
      setLinkedInPosts(posts);
    } catch (error) {
      console.error('Error fetching LinkedIn posts:', error);
      setLinkedInError(error.message);
      // Fallback posts are returned by the library
      const fallbackPosts = await getOrganizationPosts();
      setLinkedInPosts(fallbackPosts);
    } finally {
      setLinkedInLoading(false);
    }
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
            setTimeout(() => { isPaused = false; }, 500); // 500ms pause
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
    const fullText = 'Ignite is for everyone \nand their mother.';
    const pauseAfter = 'Ignite is for everyone'.length;
    let currentIndex = 0;
    let isPaused = false;

    // Add delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (isPaused) return;

        if (currentIndex <= fullText.length) {
          setTypedTestimonialsHeading(fullText.substring(0, currentIndex));

          // Pause after "everyone"
          if (currentIndex === pauseAfter) {
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
            <span key={`${inPinkWord.word}-${i}`} className="text-pink-500" style={{ display: 'inline', whiteSpace: 'nowrap' }}>
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
    const words = ['courses.', 'students.'];
    const fullText = 'The best courses.\nFor the best students.';

    const wordPositions = words.map(word => ({
      word,
      start: fullText.indexOf(word),
      end: fullText.indexOf(word) + word.length
    }));

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

      // Check if we're at the start of a purple word
      const inPurpleWord = wordPositions.find(wp => i >= wp.start && i < wp.end);

      if (inPurpleWord) {
        if (i < lastIndex || !result.length || result[result.length - 1].key !== inPurpleWord.word) {
          const purpleChunk = text.substring(i, Math.min(text.length, inPurpleWord.end)).replace(/\n/g, '');
          result.push(
            <span key={`${inPurpleWord.word}-${i}`} className="text-purple-600">
              {purpleChunk}
            </span>
          );
          i = Math.min(text.length - 1, inPurpleWord.end - 1);
          lastIndex = i + 1;
        }
      } else {
        // Regular text - find the next purple word or end
        let nextPurpleStart = text.length;
        for (const wp of wordPositions) {
          if (wp.start > i && wp.start < nextPurpleStart && wp.start < text.length) {
            nextPurpleStart = wp.start;
          }
        }

        const chunk = text.substring(i, Math.min(nextPurpleStart, text.length));
        const cleanChunk = chunk.replace(/\n/g, '');
        if (cleanChunk) {
          result.push(
            <span key={`text-${i}`} className="text-white">
              {cleanChunk}
            </span>
          );
          i = Math.min(text.length - 1, nextPurpleStart - 1);
          lastIndex = i + 1;
        }
      }
    }

    // Add cursor if typing is not complete
    if (!isCourseTitleTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-bold">|</span>
      );
    }

    return result;
  };

  // Helper to render typed learning tagline with purple highlights
  const renderTypedLearningTagline = () => {
    const text = typedLearningTagline;
    const words = ['smarter', 'personalised'];
    const fullText = 'Building a smarter, \nmore personalised era of education.';

    const wordPositions = words.map(word => ({
      word,
      start: fullText.indexOf(word),
      end: fullText.indexOf(word) + word.length
    }));

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

      const inPurpleWord = wordPositions.find(wp => i >= wp.start && i < wp.end);

      if (inPurpleWord) {
        if (i < lastIndex || !result.length || result[result.length - 1].key !== inPurpleWord.word) {
          const purpleChunk = text.substring(i, Math.min(text.length, inPurpleWord.end));
          result.push(
            <span key={`${inPurpleWord.word}-${i}`} className="text-purple-600">
              {purpleChunk}
            </span>
          );
          i = Math.min(text.length - 1, inPurpleWord.end - 1);
          lastIndex = i + 1;
        }
      } else {
        // Regular text - find the next purple word, line break, or end
        let nextPurpleStart = text.length;
        let nextLineBreak = text.indexOf('\n', i);
        if (nextLineBreak === -1) nextLineBreak = text.length;

        for (const wp of wordPositions) {
          if (wp.start > i && wp.start < nextPurpleStart && wp.start < text.length) {
            nextPurpleStart = wp.start;
          }
        }

        const endPos = Math.min(nextPurpleStart, nextLineBreak, text.length);
        const chunk = text.substring(i, endPos);
        if (chunk) {
          result.push(
            <span key={`text-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = endPos - 1;
          lastIndex = i + 1;
        }
      }
    }

    if (!isLearningTaglineTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-bold">|</span>
      );
    }

    return result;
  };

  // Helper to render typed testimonials heading with pink highlight on 'everyone'
  const renderTypedTestimonialsHeading = () => {
    const text = typedTestimonialsHeading;
    const pinkWord = 'everyone';
    const fullText = 'Ignite is for everyone \nand their mother.';

    const wordPosition = {
      word: pinkWord,
      start: fullText.indexOf(pinkWord),
      end: fullText.indexOf(pinkWord) + pinkWord.length
    };

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

      // Check if we're at the start of the pink word
      const inPinkWord = i >= wordPosition.start && i < wordPosition.end;

      if (inPinkWord) {
        if (i < lastIndex || !result.length || result[result.length - 1].key !== pinkWord) {
          const pinkChunk = text.substring(i, Math.min(text.length, wordPosition.end));
          result.push(
            <span key={`${pinkWord}-${i}`} className="text-pink-500">
              {pinkChunk}
            </span>
          );
          i = Math.min(text.length - 1, wordPosition.end - 1);
          lastIndex = i + 1;
        }
      } else {
        // Regular text - find the next pink word, line break, or end
        let nextPinkStart = text.length;
        let nextLineBreak = text.indexOf('\n', i);
        if (nextLineBreak === -1) nextLineBreak = text.length;

        if (wordPosition.start > i && wordPosition.start < text.length) {
          nextPinkStart = wordPosition.start;
        }

        const endPos = Math.min(nextPinkStart, nextLineBreak, text.length);
        const chunk = text.substring(i, endPos);
        if (chunk) {
          result.push(
            <span key={`text-${i}`} className="text-white">
              {chunk}
            </span>
          );
          i = endPos - 1;
          lastIndex = i + 1;
        }
      }
    }

    if (!isTestimonialsHeadingTypingComplete) {
      result.push(
        <span key="cursor" className="text-white animate-blink font-bold">|</span>
      );
    }

    return result;
  };

  // Auto-rotate through cards
  useEffect(() => {
    if (!animateWords || isLogin) return;

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 3); // Rotate through 0, 1, 2
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [animateWords, isLogin]);

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

  const scrollToTestimonials = () => {
    testimonialsSectionRef.current?.scrollIntoView({
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
        <Suspense fallback={
          <div style={{
            width: '100%',
            height: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          }} />
        }>
          <ProgressHub />
        </Suspense>
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
          scrollSnapType: 'y mandatory'
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
        <h1 className="text-lg sm:text-xl font-semibold text-white text-center px-2" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', marginBottom: 'clamp(0.75rem, 2vh, 1.25rem)', lineHeight: '1.2', fontSize: 'clamp(18px, 4vw, 26px)' }}>
          Upskill. Reskill.<br /><span className="text-pink-500">Get ready for what's next.</span>
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
            animation: 'scaleUp 0.2s ease-out',
            borderRadius: '0.3rem'
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
              className="w-full bg-pink-500 text-white rounded-xl px-4 py-1.5 sm:py-2 text-sm font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="text-black hover:text-pink-500 transition"
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
                  className="text-black hover:text-pink-500 transition"
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
                className="text-black hover:text-pink-500 transition"
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
            <ChevronDown size={24} className="text-black group-hover:text-pink-500 transition" />
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
                        <div className="bg-white rounded-full p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
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
                        <div className="bg-white rounded-full p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
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
                        <div className="bg-white rounded-full p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
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
              <ChevronDown size={24} className="text-black group-hover:text-pink-500 transition" />
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
                  <h3 className="font-bold text-white mb-2 text-left" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px' }}>
                    {renderTypedCoursesTitle()}
                  </h3>
                  <p className="text-lg text-white mb-6 max-w-md text-left" style={{ lineHeight: '1.425' }}>
                    We work backwards from industry professionals to build bespoke courses. Because of this, our course content is comprehensive, relevant, and in-demand by employers.
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
              <div className="flex items-center gap-4" style={{ marginLeft: '-50px' }}>
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
                          <h4 className="text-xl font-semibold mb-2 text-pink-500">{course.title}</h4>
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
                        <div className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    );
                  }) : (
                    // Placeholder when no courses
                    <>
                      <div className="bg-white/10 text-white rounded aspect-square flex items-center justify-center" style={{ padding: '32px' }}>
                        <p className="text-sm">Loading courses...</p>
                      </div>
                      <div className="bg-white/10 text-white rounded aspect-square" style={{ padding: '32px' }}></div>
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
              <ChevronDown size={24} className="text-black group-hover:text-pink-500 transition" />
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
          <div className="max-w-4xl w-full text-white text-left">
            {/* Learning Model Section */}
            <div className="px-4">
              <h3 className="font-bold text-white text-left mb-16" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px' }}>
                {renderTypedLearningTagline()}
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Left Column - Feature Cards */}
                <div className="space-y-6">
                  {/* Card 1 - Hands-on */}
                  <div
                    className={`rounded-lg p-4 transition-all duration-500 ${
                      activeCard === 0
                        ? 'bg-white shadow-xl scale-105 border-2 border-pink-500'
                        : 'bg-gray-300 border border-gray-400'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="bg-pink-500 rounded-full p-1.5 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base mb-1 text-black">
                          Hands-on, interactive courses
                        </h4>
                        <p className="text-xs text-gray-700">
                          Short videos are broken up by interactive exercises. Practice new skills immediately to retain information.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 - Real-world projects */}
                  <div
                    className={`rounded-lg p-4 transition-all duration-500 ${
                      activeCard === 1
                        ? 'bg-white shadow-xl scale-105 border-2 border-green-500'
                        : 'bg-gray-300 border border-gray-400'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="bg-green-500 rounded-full p-1.5 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base mb-1 text-black">
                          Real-world projects
                        </h4>
                        <p className="text-xs mb-2 text-gray-700">
                          Apply your learning in real situations, perfect for developing practical skills and building up your portfolio.
                        </p>
                        {activeCard === 1 && (
                          <button className="border-2 border-black text-black font-semibold px-3 py-1.5 rounded hover:bg-black hover:text-white transition text-xs">
                            Explore Projects →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3 - Certified professional */}
                  <div
                    className={`rounded-lg p-4 transition-all duration-500 ${
                      activeCard === 2
                        ? 'bg-white shadow-xl scale-105 border-2 border-purple-500'
                        : 'bg-gray-300 border border-gray-400'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="bg-purple-500 rounded-full p-1.5 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base mb-1 text-black">
                          Become a certified professional
                        </h4>
                        <p className="text-xs text-gray-700">
                          Prove you're job-ready. Earn industry-leading certifications built around in-demand roles.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Portfolio Preview */}
                <div className="flex items-center justify-center">
                  <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-xl p-8 border border-gray-600 w-full max-w-md">
                    <h3 className="text-3xl sm:text-4xl font-semibold mb-4">
                      Build a <span className="text-green-400">career portfolio</span>
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Project Workspace</span>
                        <div className="flex gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm font-mono">
                        <div className="text-purple-400">// Building your portfolio</div>
                        <div className="text-gray-300">const <span className="text-blue-400">skills</span> = <span className="text-yellow-400">'Product Management'</span>;</div>
                        <div className="text-gray-300">const <span className="text-blue-400">projects</span> = <span className="text-yellow-400">completed</span>;</div>
                        <div className="text-gray-300">const <span className="text-blue-400">certification</span> = <span className="text-green-400">true</span>;</div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <button className="bg-green-500 text-white px-4 py-2 rounded text-xs font-sans font-semibold hover:bg-green-600 transition w-full">
                            Submit Project
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
          <div className="max-w-4xl w-full text-white text-left">
            <div className="px-4">
              <h3 className="font-bold text-white text-left mb-16" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px' }}>
                {renderTypedTestimonialsHeading()}
              </h3>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 px-4 max-w-7xl mx-auto">
              {/* Left Column - Use Cases Accordion (2 cols) */}
              <div className="lg:col-span-2 space-y-3">
                {[
                  {
                    title: 'Recent graduates',
                    description: 'Finished university or college and wondering what\'s next? With <strong>no experience required</strong>, you\'ll gain real-world skills, build a portfolio and get job-ready.'
                  },
                  {
                    title: 'Career break returners',
                    description: 'Taken time off recently? Pick up where you left off with <strong>flexible and self-paced courses</strong>, that will help rebuild confidence and step back into the job market with a new edge.'
                  },
                  {
                    title: 'Pivoting careers',
                    description: 'Whatever your professional background, we\'ll help identify your transferable strengths and <strong>learn in-demand skills</strong> to help you make the transition.'
                  },
                  {
                    title: 'Upskilling in role',
                    description: 'Whether you\'re aiming for a promotion or taking on new responsibilities, learn on your own schedule with <strong>personalised support</strong> to apply insights directly at work.'
                  },
                  {
                    title: 'Learning something new',
                    description: 'If you\'re looking for your next steps, our courses are <strong>completely free</strong>, and designed to help you learn through real-world projects.'
                  }
                ].map((useCase, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-200 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer"
                    style={{
                      opacity: 0,
                      animation: animateTestimonials ? `fadeInUp 0.8s ease-out ${0.1 + idx * 0.1}s forwards` : 'none'
                    }}
                    onMouseEnter={() => setHoveredUseCase(idx)}
                    onMouseLeave={() => setHoveredUseCase(null)}
                  >
                    <div className="bg-purple-600 px-4 py-3">
                      <h3 className="text-lg font-bold text-white">{useCase.title}</h3>
                    </div>
                    <div
                      className="px-4 transition-all duration-300 ease-in-out overflow-hidden"
                      style={{
                        maxHeight: hoveredUseCase === idx ? '200px' : '0px',
                        paddingTop: hoveredUseCase === idx ? '12px' : '0px',
                        paddingBottom: hoveredUseCase === idx ? '12px' : '0px'
                      }}
                    >
                      <p
                        className="text-gray-800 leading-relaxed text-sm"
                        dangerouslySetInnerHTML={{
                          __html: useCase.description.replace(
                            /<strong>(.*?)<\/strong>/g,
                            '<span class="font-bold text-pink-600">$1</span>'
                          )
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column - Rotating Testimonial (3 cols) */}
              <div
                className="lg:col-span-3 flex items-center justify-center"
                style={{
                  opacity: 0,
                  animation: animateTestimonials ? 'fadeInUp 0.8s ease-out 0.6s forwards' : 'none'
                }}
              >
                <div
                  className="relative w-full"
                  onMouseEnter={() => setIsTestimonialHovered(true)}
                  onMouseLeave={() => setIsTestimonialHovered(false)}
                >
                  {[
                    {
                      quote: "As a manager, Ignite helps me show my team new packages and new ways to solve problems.",
                      name: "Gabriel Lages",
                      role: "Business Intelligence and Analytics Manager",
                      initials: "GL",
                      gradient: "from-purple-500 to-pink-500"
                    },
                    {
                      quote: "We think of it as everyone's responsibility in the organization to be more data-driven. After all, every single one of us is probably touching data in some way, regardless of your role.",
                      name: "Rachel Alt-Simmons",
                      role: "Head Of Strategic Design, Data, Pricing And Analytics",
                      initials: "RA",
                      gradient: "from-blue-500 to-cyan-500"
                    },
                    {
                      quote: "On Ignite, you learn from the experts. As you are taking courses, you are really learning from the best instructors in the world.",
                      name: "Ofentswe Lebogo",
                      role: "Data Scientist, Council for Scientific and Industrial Research (CSIR)",
                      initials: "OL",
                      gradient: "from-green-500 to-emerald-500"
                    },
                    {
                      quote: "Ignite was how I got into my Masters program. The real-world projects and short video lessons were a game changer. They made complex topics easy to understand and apply.",
                      name: "Ebuka Nwaformo",
                      role: "Graduate Student, University College Dublin",
                      initials: "EN",
                      gradient: "from-orange-500 to-red-500"
                    },
                    {
                      quote: "Only Ignite provides the interactive experience that reinforces learning. There's an excellent content depth—great for absolute beginners to experienced users.",
                      name: "Sarah Schlobohm",
                      role: "Senior Analytics Manager, Global Risk Analytics, HSBC",
                      initials: "SS",
                      gradient: "from-yellow-500 to-amber-500"
                    },
                    {
                      quote: "I've used other sites—Coursera, Udacity, things like that—but Ignite's been the one that I've stuck with.",
                      name: "Devon Edwards Joseph",
                      role: "Lloyds Banking Group",
                      initials: "DE",
                      gradient: "from-indigo-500 to-purple-500"
                    }
                  ].map((testimonial, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 transition-opacity duration-500"
                      style={{
                        position: idx === 0 ? 'relative' : 'absolute',
                        top: idx === 0 ? 'auto' : 0,
                        left: idx === 0 ? 'auto' : 0,
                        right: idx === 0 ? 'auto' : 0,
                        opacity: currentTestimonialIndex === idx ? 1 : 0,
                        pointerEvents: currentTestimonialIndex === idx ? 'auto' : 'none',
                        transition: 'opacity 0.5s ease-in-out'
                      }}
                    >
                      <p className="text-gray-300 mb-6 italic text-lg leading-relaxed">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold text-xl`}>
                          {testimonial.initials}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-lg">{testimonial.name}</div>
                          <div className="text-sm text-gray-400">{testimonial.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Carousel Indicators */}
                  <div className="flex justify-center gap-2 mt-6">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTestimonialIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          currentTestimonialIndex === idx
                            ? 'bg-purple-500 w-8'
                            : 'bg-gray-500 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to testimonial ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 px-4 max-w-7xl mx-auto mb-12">
              {/* Left Column - LinkedIn Posts (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-2xl font-bold text-white mb-6">Latest from LinkedIn</h3>

                {linkedInLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading posts...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {linkedInPosts.map((post, idx) => (
                      <div
                        key={post.id}
                        className="bg-white rounded-lg p-5 text-gray-800"
                        style={{
                          opacity: 0,
                          animation: animateLinkedInFAQ ? `fadeInUp 0.8s ease-out ${0.1 + idx * 0.15}s forwards` : 'none'
                        }}
                      >
                        <p className="text-sm leading-relaxed mb-3">{post.text}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{new Date(post.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <div className="flex gap-4">
                            <span>👍 {post.likes}</span>
                            <span>💬 {post.comments}</span>
                            <span>🔁 {post.shares}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column - FAQs (3 cols) */}
              <div className="lg:col-span-3 space-y-3">
                <h3 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h3>

                {[
                  {
                    question: 'What is Ignite?',
                    answer: 'Ignite is a free, online learning platform offering industry-leading courses in high-demand fields like Product Management, Cybersecurity, and more. Our courses are built by experts and designed to help you gain practical skills through real-world projects.'
                  },
                  {
                    question: 'Who is Ignite for?',
                    answer: 'Ignite is for everyone! Whether you\'re a recent graduate, career changer, returning to work after a break, or looking to upskill in your current role, our courses are designed to meet you where you are and help you reach your goals.'
                  },
                  {
                    question: 'How much does Ignite cost?',
                    answer: 'Ignite is completely free! We believe education should be accessible to everyone. Our platform is funded by limited, non-intrusive advertising, so you can focus on learning without worrying about subscription fees or hidden costs.'
                  },
                  {
                    question: 'What can I learn on Ignite?',
                    answer: 'We offer comprehensive courses in Product Management, Cybersecurity, and more fields are coming soon! Each course includes interactive lessons, hands-on projects, knowledge checks, and a certification upon completion.'
                  },
                  {
                    question: 'Can I learn at my own pace?',
                    answer: 'Absolutely! Ignite courses are self-paced, so you can learn when and where it works best for you. Whether you have 10 minutes or 2 hours, you can pick up right where you left off and progress at your own speed.'
                  },
                  {
                    question: 'Who created Ignite?',
                    answer: 'Ignite was founded by a team of educators and industry professionals passionate about making high-quality education accessible to everyone. Our courses are developed in collaboration with subject matter experts from leading companies.'
                  }
                ].map((faq, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
                    style={{
                      background: '#D84A8C',
                      opacity: 0,
                      animation: animateLinkedInFAQ ? `fadeInUp 0.8s ease-out ${0.5 + idx * 0.1}s forwards` : 'none'
                    }}
                    onMouseEnter={() => setExpandedFAQ(idx)}
                    onMouseLeave={() => setExpandedFAQ(null)}
                  >
                    <div className="px-6 py-4 flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white">{faq.question}</h4>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                        style={{
                          background: '#7B2D4E',
                          transform: expandedFAQ === idx ? 'rotate(45deg)' : 'rotate(0deg)'
                        }}
                      >
                        <span className="text-white text-2xl font-light">+</span>
                      </div>
                    </div>
                    <div
                      className="px-6 overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: expandedFAQ === idx ? '300px' : '0px',
                        paddingTop: expandedFAQ === idx ? '0px' : '0px',
                        paddingBottom: expandedFAQ === idx ? '16px' : '0px'
                      }}
                    >
                      <p className="text-white text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            <div className="flex justify-center gap-8 px-4 pb-12">
              <a
                href="mailto:hello@ignite.education"
                className="text-white hover:text-purple-400 transition text-sm font-medium"
              >
                Contact
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/jobs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-purple-400 transition text-sm font-medium"
              >
                Careers
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-purple-400 transition text-sm font-medium"
              >
                LinkedIn
              </a>
              <a
                href="https://ignite.education/policy"
                className="text-white hover:text-purple-400 transition text-sm font-medium"
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
              borderRadius: '0.3rem',
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
                    className="w-full bg-pink-500 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
    {selectedCourseModal && courses.find(c => c.name === selectedCourseModal) && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
          animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={() => setSelectedCourseModal(null)}
      >
        <div className="relative">
          {(() => {
            const selectedCourse = courses.find(c => c.name === selectedCourseModal);
            if (!selectedCourse) return null;

            return (
              <>
                {/* Title above the box */}
                <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
                  {selectedCourse.title}
                </h2>

          <div
            className="bg-white relative flex flex-col"
            style={{
              width: '600px',
              height: '70vh',
              animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              borderRadius: '0.3rem',
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
              style={{ scrollbarWidth: 'thin', paddingTop: '25.6px', paddingBottom: '20px' }}
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

                <p className="text-black mb-6 leading-relaxed" style={{ maxWidth: '90%' }}>
                  {selectedCourse.description}
                </p>

                {/* Module and Lesson Details - Swipable Cards */}
                {selectedCourse.module_structure && Array.isArray(selectedCourse.module_structure) && selectedCourse.module_structure.length > 0 ? (
                  <div className="mb-6 relative">
                    <h3 className="font-semibold text-gray-900 mb-1.5" style={{ fontSize: '17px' }}>
                      {(() => {
                        // Flatten all lessons from all modules
                        const allLessons = selectedCourse.module_structure.flatMap((module, modIdx) =>
                          (module.lessons || []).map((lesson, lesIdx) => ({
                            ...lesson,
                            moduleIndex: modIdx + 1,
                            moduleName: module.name,
                            lessonIndex: lesIdx + 1
                          }))
                        );

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
                        setSnappedModuleIndex(newIndex);
                      }}
                    >
                      <div className="flex gap-4" style={{ minHeight: '100px', height: '100px' }}>
                        {(() => {
                          // Flatten all lessons from all modules
                          const allLessons = selectedCourse.module_structure.flatMap((module, modIdx) =>
                            (module.lessons || []).map((lesson, lesIdx) => ({
                              ...lesson,
                              moduleIndex: modIdx + 1,
                              moduleName: module.name,
                              lessonIndex: lesIdx + 1
                            }))
                          );

                          return allLessons.map((lesson, index) => (
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
                                borderRadius: '0.3rem',
                                background: '#7714E0',
                                height: '90px',
                                scrollSnapAlign: 'start',
                                scrollSnapStop: 'always'
                              }}
                            >
                              {/* Opacity overlay for non-snapped cards */}
                              {index !== snappedModuleIndex && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                    backdropFilter: 'blur(2px)',
                                    WebkitBackdropFilter: 'blur(2px)',
                                    borderRadius: '0.3rem',
                                    pointerEvents: 'none',
                                    transition: 'background-color 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), backdrop-filter 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                    zIndex: 1
                                  }}
                                />
                              )}
                              <div className="flex-1 relative" style={{ zIndex: 2 }}>
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
                          ));
                        })()}
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

                {/* Course Coaches Section */}
                {courseCoaches[selectedCourseModal] && courseCoaches[selectedCourseModal].length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-1" style={{ fontSize: '17px' }}>
                      Course Leaders
                    </h3>
                    <div className="rounded-lg" style={{ padding: '12px', background: '#7714E0' }}>
                      <div className="flex gap-2.5 items-center">
                        <div className="flex-1 grid grid-cols-4" style={{ gap: '12px' }}>
                          {(() => {
                            // Create array of 4 slots, fill with coaches or placeholders
                            const displayCoaches = [];
                            for (let i = 0; i < 4; i++) {
                              displayCoaches.push(courseCoaches[selectedCourseModal][i] || null);
                            }

                            return displayCoaches.map((coach, index) => (
                              <div key={index} className="group">
                                {coach && coach.linkedin_url ? (
                                  <a
                                    href={coach.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center cursor-pointer"
                                  >
                                    {coach.image_url ? (
                                      <img
                                        src={coach.image_url}
                                        alt={coach.name}
                                        className="w-[50.4px] h-[50.4px] rounded object-cover mb-1"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                    )}
                                    <span className="font-semibold text-white block truncate w-full" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                                      {coach.name}
                                    </span>
                                    {coach.position && (
                                      <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>
                                    )}
                                  </a>
                                ) : (
                                  <div className="transition-transform duration-200 group-hover:scale-[1.02] flex flex-col items-center text-center">
                                    {coach ? (
                                      <>
                                        {coach.image_url ? (
                                          <img
                                            src={coach.image_url}
                                            alt={coach.name}
                                            className="w-[50.4px] h-[50.4px] rounded object-cover mb-1"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                        )}
                                        <h3 className="font-semibold text-white mb-0 truncate w-full" style={{ fontSize: '12px', lineHeight: '1.2' }}>{coach.name}</h3>
                                        {coach.position && (
                                          <p className="text-white truncate w-full" style={{ fontSize: '10px', marginTop: '0.5px', lineHeight: '1.2', opacity: 0.9, marginBottom: '-3px' }}>{coach.position}</p>
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-[50.4px] h-[50.4px] rounded bg-white/10 mb-1" />
                                    )}
                                  </div>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Course Benefits - 2 Column Layout - Vertically Centered */}
                <div className="flex items-center" style={{ minHeight: '80px' }}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 font-medium w-full">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="leading-relaxed">Certificate upon<br/>completion</span>
                    </div>
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="leading-relaxed">Taught by industry<br/>expert instructors</span>
                    </div>
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="leading-relaxed">Interactive<br/>hands-on exercises</span>
                    </div>
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="leading-relaxed">Self-paced<br/>learning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Button at Bottom */}
            <div className="px-8 py-4 bg-white" style={{ borderRadius: '0 0 0.3rem 0.3rem' }}>
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
                    ? 'bg-pink-500 text-white hover:bg-pink-600'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
                disabled={selectedCourse.status !== 'live'}
              >
                {selectedCourse.status === 'live' ? 'Get Started' : 'Notify Me When Available'}
              </button>
            </div>
          </div>
              </>
            );
          })()}
        </div>
      </div>
    )}
    </>
  );
};

export default Auth;
