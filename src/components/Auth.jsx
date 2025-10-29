import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
const ProgressHub = lazy(() => import('./ProgressHub'));
import Onboarding from './Onboarding';
import { ChevronDown, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [coursePageIndex, setCoursePageIndex] = useState(0);
  const [courses, setCourses] = useState([]);
  const [typedCoursesTitle, setTypedCoursesTitle] = useState('');
  const [isCourseTitleTypingComplete, setIsCourseTitleTypingComplete] = useState(false);
  const [typedLearningTagline, setTypedLearningTagline] = useState('');
  const [isLearningTaglineTypingComplete, setIsLearningTaglineTypingComplete] = useState(false);

  const { user, signIn, signUp, signInWithOAuth } = useAuth();
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
          setIsEducationTypingComplete(true);
        }
      }, 90); // 90ms per character for slower typing
    }, 1500); // 1500ms delay before starting
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
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8" style={{ scrollSnapAlign: 'start', paddingTop: '1.5rem' }}>
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
            marginBottom: 'clamp(1rem, 3vh, 2rem)'
          }}
        />

        {/* Tagline - on both sign in and create account pages */}
        <h1 className="text-lg sm:text-xl font-semibold text-white text-center px-2" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', marginBottom: 'clamp(0.5rem, 2.5vh, 1.5rem)', lineHeight: '1.2', fontSize: 'clamp(18px, 4vw, 26px)' }}>
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
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-black hover:text-pink-500 transition"
              style={{ fontSize: '0.85em' }}
            >
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </button>
          </div>
        </div>

        {/* Scroll Down Arrow - visible on both sign in and create account */}
        <div className="flex justify-center mt-10 sm:mt-12 mb-2">
          <button
            onClick={scrollToMarketing}
            className="bg-white rounded-full hover:bg-gray-100 transition shadow-lg group"
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
                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.2s ease-out', animationDelay: '1s', opacity: 0, animationFillMode: 'forwards' }}>
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

                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.2s ease-out', animationDelay: '2s', opacity: 0, animationFillMode: 'forwards' }}>
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

                      <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.2s ease-out', animationDelay: '3s', opacity: 0, animationFillMode: 'forwards' }}>
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
              className="bg-white rounded-full hover:bg-gray-100 transition shadow-lg group"
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
                  <h3 className="font-bold text-white mb-4 text-left" style={{ fontSize: '2.5rem', lineHeight: '1.2', minHeight: '120px' }}>
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
              <div className="flex items-center gap-4">
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
                        key={course.id}
                        className="bg-white text-black rounded transition-all duration-300 ease-in-out flex flex-col justify-start hover:shadow-2xl overflow-hidden aspect-square relative"
                        style={{ padding: '16px' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.015)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourseModal(course.id);
                          }}
                          className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-white rounded-full transition-all"
                          aria-label="View course details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
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
              className="bg-white rounded-full hover:bg-gray-100 transition shadow-lg group"
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
    </div>

    {/* Course Details Modal */}
    {selectedCourseModal && courses.find(c => c.id === selectedCourseModal) && (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
        }}
        onClick={() => setSelectedCourseModal(null)}
      >
        <div className="relative">
          {(() => {
            const selectedCourse = courses.find(c => c.id === selectedCourseModal);
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
              maxHeight: '70vh',
              animation: 'scaleUp 0.2s ease-out',
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

            {/* Content */}
            <div
              className="flex-1 overflow-y-auto px-8 py-8"
              style={{ scrollbarWidth: 'thin' }}
            >
              <div>
                <div className="mb-6">
                  {selectedCourse.status === 'live' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">Available Now</span>
                  )}
                  {selectedCourse.status === 'coming_soon' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">Coming Soon</span>
                  )}
                  {selectedCourse.status === 'requested' && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">Requested</span>
                  )}
                </div>

                <h3 className="text-2xl font-bold mb-4 text-gray-900">Course Overview</h3>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {selectedCourse.description}
                </p>

                {/* Module and Lesson Details */}
                {selectedCourse.module_structure && Array.isArray(selectedCourse.module_structure) && selectedCourse.module_structure.length > 0 ? (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Course Content</h3>
                    <div className="space-y-4">
                      {selectedCourse.module_structure.map((module, moduleIdx) => (
                        <div key={moduleIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Module Header */}
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {moduleIdx + 1}
                              </span>
                              {module.name}
                            </h4>
                          </div>

                          {/* Lessons List */}
                          {module.lessons && Array.isArray(module.lessons) && module.lessons.length > 0 && (
                            <div className="px-4 py-3 bg-white">
                              <p className="text-xs text-gray-500 font-medium mb-2">{module.lessons.length} Lesson{module.lessons.length !== 1 ? 's' : ''}</p>
                              <ul className="space-y-2">
                                {module.lessons.map((lesson, lessonIdx) => (
                                  <li key={lessonIdx} className="flex items-start text-sm text-gray-700">
                                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{lesson.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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

                {/* Additional Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">What You'll Get:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Certificate upon completion
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Taught by industry expert instructors
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Interactive hands-on exercises
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Self-paced learning
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setSelectedCourseModal(null)}
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
