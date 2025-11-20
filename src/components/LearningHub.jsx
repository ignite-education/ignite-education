import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Volume2, FileText, X, Linkedin, ChevronLeft, Pause, ChevronRight, Trash2, Edit2, Save, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import Lottie from 'lottie-react';
import { getLessonsByModule, getLessonsMetadata, markLessonComplete, getCompletedLessons, saveExplainedSection, getExplainedSections, deleteExplainedSection, updateExplainedSection, getFlashcards, submitLessonRating, getLessonRating } from '../lib/api';
import GoogleAd from './GoogleAd';
import { useAuth } from '../contexts/AuthContext';
import { useAnimation } from '../contexts/AnimationContext';
import KnowledgeCheck from './KnowledgeCheck';
import LoadingScreen from './LoadingScreen';
import { supabase } from '../lib/supabase';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Helper to remove formatting markers from text
const stripFormattingMarkers = (text) => {
  if (!text) return '';
  // Remove bold (**), underline (__), italic (*), and bullet markers
  return text
    .replace(/\*\*/g, '') // Remove bold markers
    .replace(/__/g, '')   // Remove underline markers
    .replace(/(?<!\*)\*(?!\*)/g, '') // Remove italic markers (single asterisks)
    .replace(/^[•\-]\s/gm, '') // Remove bullet points
    .trim();
};

const LearningHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { firstName, user, isAdFree, userRole } = useAuth();
  const { lottieData } = useAnimation();

  // Helper function to get user's enrolled course
  const getUserCourseId = async () => {
    if (!user?.id) return 'product-manager'; // Default fallback

    const { data: userData } = await supabase
      .from('users')
      .select('enrolled_course')
      .eq('id', user.id)
      .single();

    return userData?.enrolled_course || 'product-manager';
  };
  const [loading, setLoading] = useState(true);
  const [groupedLessons, setGroupedLessons] = useState({});
  const [lessonsMetadata, setLessonsMetadata] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [userCourseName, setUserCourseName] = useState('Product Management');
  const [currentModule, setCurrentModule] = useState(parseInt(searchParams.get('module')) || 1);
  const [currentLesson, setCurrentLesson] = useState(parseInt(searchParams.get('lesson')) || 1);
  const [chatMessages, setChatMessages] = useState([
    {
      type: 'assistant',
      text: 'Hello, I\'m Will.\nI\'m here to answer any questions you may have on course content. Ask me to dive deeper into a topic or to phrase something differently.',
      isComplete: false
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [upgradingToAdFree, setUpgradingToAdFree] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [showKnowledgeCheck, setShowKnowledgeCheck] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [isClosingLinkedInModal, setIsClosingLinkedInModal] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [suggestedQuestion, setSuggestedQuestion] = useState('Can you explain this another way?');
  const [isCarouselReady, setIsCarouselReady] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [isClosingFlashcards, setIsClosingFlashcards] = useState(false);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [explainedSections, setExplainedSections] = useState([]);
  const [hoveredExplanation, setHoveredExplanation] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0, preferAbove: true });
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState('');
  const [popupLocked, setPopupLocked] = useState(false);
  const [isReadingNote, setIsReadingNote] = useState(false);
  const noteAudioRef = React.useRef(null);
  const closeTimeoutRef = React.useRef(null);
  const highlightRef = React.useRef(null);
  const editableRef = React.useRef(null);
  const scrollContainerRef = React.useRef(null);
  const chatContainerRef = React.useRef(null);
  const checkoutRef = React.useRef(null);
  const cardRefs = React.useRef([]);
  const sectionRefs = React.useRef([]);
  const contentScrollRef = React.useRef(null);
  const isInitialMountRef = React.useRef(true);
  const [isReading, setIsReading] = React.useState(false);
  const [currentNarrationSection, setCurrentNarrationSection] = React.useState(0);
  const audioRef = React.useRef(null);
  const isPausedRef = React.useRef(false); // Track if user manually paused
  const [lessonRating, setLessonRating] = useState(null); // null, true (thumbs up), or false (thumbs down)
  const [showRatingFeedback, setShowRatingFeedback] = useState(false);

  useEffect(() => {
    fetchLessonData();
    // Start typing animation for initial greeting message with a slight delay
    setTimeout(() => {
      setTypingMessageIndex(0);
    }, 2500);
  }, []);

  // Refresh user session after successful payment
  useEffect(() => {
    const refreshUserSession = async () => {
      const params = new URLSearchParams(window.location.search);

      console.log('🔍 Checking URL params:', window.location.search);
      console.log('🔍 Payment param value:', params.get('payment'));

      if (params.get('payment') === 'success') {
        // Check if we've already processed this payment to prevent multiple reloads
        const hasProcessed = sessionStorage.getItem('payment_processed');
        if (hasProcessed) {
          console.log('⏭️ Payment already processed, skipping...');
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        console.log('\n✅ ============ PAYMENT SUCCESS DETECTED ============');
        console.log('⏰ Timestamp:', new Date().toISOString());
        console.log('⏳ Waiting 3 seconds for webhook to process...');

        // Mark as processed immediately to prevent re-runs
        sessionStorage.setItem('payment_processed', 'true');

        // Wait 3 seconds to ensure webhook has time to update user metadata
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🔄 Calling supabase.auth.refreshSession()...');

        try {
          const { data, error } = await supabase.auth.refreshSession();

          if (error) {
            console.error('❌ Session refresh FAILED');
            console.error('❌ Error:', error.message);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            sessionStorage.removeItem('payment_processed');
            return;
          }

          console.log('✅ Session refreshed successfully');
          console.log('👤 User data:', JSON.stringify(data.session?.user, null, 2));
          console.log('📦 User metadata:', JSON.stringify(data.session?.user?.user_metadata, null, 2));
          console.log('🎯 is_ad_free value:', data.session?.user?.user_metadata?.is_ad_free);

          // Remove the query parameter to prevent repeated refreshes
          window.history.replaceState({}, '', window.location.pathname);

          // Note: No page reload needed - the auth context will automatically update
          // when the session is refreshed, causing components to re-render with new user data
          console.log('✅ Payment processed successfully without page reload');

        } catch (err) {
          console.error('❌ Exception during session refresh');
          console.error('❌ Error:', err.message);
          console.error('❌ Stack:', err.stack);
          sessionStorage.removeItem('payment_processed');
        }
      }
    };

    refreshUserSession();
  }, []);

  // Load explained sections when lesson changes
  useEffect(() => {
    const loadExplainedSections = async () => {
      if (!user) return;

      try {
        const courseId = await getUserCourseId();
        const sections = await getExplainedSections(user.id, courseId, currentModule, currentLesson);

        // Transform database format to component state format
        // Strip formatting markers from legacy data that might have them
        const transformedSections = sections.map(section => ({
          text: stripFormattingMarkers(section.selected_text),
          explanation: section.explanation,
          id: section.id
        }));

        setExplainedSections(transformedSections);
      } catch (error) {
        console.error('Error loading explained sections:', error);
      }
    };

    loadExplainedSections();
  }, [user, currentModule, currentLesson]);

  // Load lesson rating when lesson changes
  useEffect(() => {
    const loadLessonRating = async () => {
      if (!user) return;

      try {
        const courseId = await getUserCourseId();
        const rating = await getLessonRating(user.id, courseId, currentModule, currentLesson);
        setLessonRating(rating ? rating.rating : null);
      } catch (error) {
        console.error('Error loading lesson rating:', error);
      }
    };

    loadLessonRating();
  }, [user, currentModule, currentLesson]);

  // Update current module and lesson when URL params change
  useEffect(() => {
    const moduleParam = parseInt(searchParams.get('module'));
    const lessonParam = parseInt(searchParams.get('lesson'));

    if (moduleParam && moduleParam !== currentModule) {
      setCurrentModule(moduleParam);
    }
    if (lessonParam && lessonParam !== currentLesson) {
      setCurrentLesson(lessonParam);
    }
  }, [searchParams]);

  // Reset chat conversation and scroll position when lesson changes
  useEffect(() => {
    // Skip on initial mount to preserve welcome message
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Reset chat to initial greeting
    setChatMessages([
      {
        type: 'assistant',
        text: 'Hello, I\'m Will.\nI\'m here to answer any questions you may have on course content. Ask me to dive deeper into a topic or to phrase something differently.',
        isComplete: false
      }
    ]);

    // Clear chat input field
    setChatInput('');

    // Scroll lesson content to top
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }

    // Start typing animation for greeting message
    setTimeout(() => {
      setTypingMessageIndex(0);
    }, 100);
  }, [currentModule, currentLesson]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      // Don't handle text selection if knowledge check or flashcards are open
      if (showKnowledgeCheck || showFlashcards) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim();

      // Get the element that contains the selection
      const anchorNode = selection?.anchorNode;
      const isInputSelection = anchorNode?.parentElement?.tagName === 'INPUT' ||
                               anchorNode?.parentElement?.closest('input');

      // Check if selection is within the popup notes
      const isPopupSelection = anchorNode?.parentElement?.closest('[data-popup-notes]');

      // Only update if the selection is NOT from the input field, NOT from popup, and user is not editing
      if (!isInputSelection && !isPopupSelection && !isEditingInput) {
        if (text && text.length > 0) {
          setSelectedText(text);
          setChatInput(`Explain '${text}'`);
        } else {
          // Clear the input if text is unselected and it contains the "Explain" prompt
          if (chatInput.startsWith('Explain \'')) {
            setChatInput('');
            setSelectedText('');
          }
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('selectionchange', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [chatInput, isEditingInput, showKnowledgeCheck, showFlashcards]);

  // Handle Enter key to send auto-populated explanation prompts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if Enter is pressed, there's an explanation prompt, and user is not focused on an input
      if (
        e.key === 'Enter' &&
        chatInput.startsWith('Explain \'') &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        !document.activeElement.isContentEditable
      ) {
        e.preventDefault();
        // Trigger the form submit by creating a synthetic event
        const form = document.querySelector('[data-chat-form]');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [chatInput]);

  // Typing animation effect
  useEffect(() => {
    if (typingMessageIndex === null) return;

    const message = chatMessages[typingMessageIndex];
    if (!message || message.isComplete) return;

    const fullText = message.text;
    let currentIndex = 0;
    let pauseCounter = 0;

    const typingInterval = setInterval(() => {
      // Check if we need to pause (at newline characters)
      if (pauseCounter > 0) {
        pauseCounter--;
        return;
      }

      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));

        // Add pause after newline characters
        if (fullText[currentIndex] === '\n') {
          pauseCounter = 15; // Pause for ~675ms (15 * 45ms)
        }

        // Add pause after sentence-ending punctuation (. ! ?)
        if (fullText[currentIndex] === '.' || fullText[currentIndex] === '!' || fullText[currentIndex] === '?') {
          pauseCounter = 7; // Pause for ~300ms (7 * 45ms, rounded from 6.67)
        }

        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // Mark message as complete
        setChatMessages(prev => prev.map((msg, idx) =>
          idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
        ));
        setTypingMessageIndex(null);
        setDisplayedText('');
      }
    }, 45); // Adjust speed here (lower = faster)

    return () => clearInterval(typingInterval);
  }, [typingMessageIndex, chatMessages]);

  // Track which card is in the leftmost position using Intersection Observer
  useEffect(() => {
    if (!scrollContainerRef.current || cardRefs.current.length === 0) return;

    const observerOptions = {
      root: scrollContainerRef.current,
      threshold: [0, 0.5, 1], // Multiple thresholds to catch more intersection events
      rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
      // Find the most visible card
      let mostVisibleCard = null;
      let highestRatio = 0;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > highestRatio) {
          highestRatio = entry.intersectionRatio;
          mostVisibleCard = entry.target;
        }
      });

      if (mostVisibleCard) {
        const cardIndex = cardRefs.current.indexOf(mostVisibleCard);
        if (cardIndex !== -1) {
          setActiveCardIndex(cardIndex);
        }
      }
    }, observerOptions);

    // Observe all card elements
    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    // Force initial check - manually determine which card is most visible
    requestAnimationFrame(() => {
      if (scrollContainerRef.current && cardRefs.current.length > 0) {
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const containerWidth = scrollContainerRef.current.clientWidth;

        // Find which card is most visible
        let mostVisibleIndex = 0;
        let maxVisibility = 0;

        cardRefs.current.forEach((card, index) => {
          if (card) {
            const rect = card.getBoundingClientRect();
            const containerRect = scrollContainerRef.current.getBoundingClientRect();

            // Calculate how much of the card is visible
            const visibleLeft = Math.max(rect.left, containerRect.left);
            const visibleRight = Math.min(rect.right, containerRect.right);
            const visibleWidth = Math.max(0, visibleRight - visibleLeft);
            const visibility = visibleWidth / rect.width;

            if (visibility > maxVisibility) {
              maxVisibility = visibility;
              mostVisibleIndex = index;
            }
          }
        });

        setActiveCardIndex(mostVisibleIndex);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [groupedLessons, currentModule, currentLesson]);

  const fetchLessonData = async () => {
    try {
      console.log('🔄 Starting fetchLessonData...');

      const userId = user?.id || 'temp-user-id';
      const courseId = await getUserCourseId();

      console.log('📝 Using userId:', userId, 'courseId:', courseId);

      // Fetch course title from courses table
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, name')
        .eq('name', courseId)
        .single();

      // Set the user's course title for display
      setUserCourseName(courseData?.title || courseId);

      console.log('📚 Fetching lessons by module...');
      const lessonsData = await getLessonsByModule(courseId);
      console.log('✅ Lessons data received:', lessonsData);

      // Debug: Show the lesson names for Module 1 to verify correct course content
      if (lessonsData.module_1) {
        console.log('🔍 Module 1 lessons from database:');
        Object.keys(lessonsData.module_1).forEach(lessonKey => {
          const lesson = lessonsData.module_1[lessonKey];
          console.log(`  ${lessonKey}: ${lesson.lessonName || 'No name'}`);
        });
      }

      setGroupedLessons(lessonsData);

      // Fetch lessons metadata (for upcoming lessons carousel)
      console.log('📋 Fetching lessons metadata...');
      const metadataData = await getLessonsMetadata(courseId);
      console.log('✅ Metadata received:', metadataData);
      setLessonsMetadata(metadataData);

      // Fetch completed lessons
      try {
        console.log('✓ Fetching completed lessons...');
        const completedLessonsData = await getCompletedLessons(userId, courseId);
        console.log('✅ Completed lessons received:', completedLessonsData);
        setCompletedLessons(completedLessonsData);
      } catch (error) {
        console.error('Error fetching completed lessons:', error);
        setCompletedLessons([]);
      }

      console.log('✅ All data loaded, setting loading to false');
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching lesson data:', error);
      console.error('Error details:', error.message, error.stack);
      setLoading(false);
    }
  };

  const getCurrentLessonData = () => {
    const moduleKey = `module_${currentModule}`;
    const lessonKey = `lesson_${currentLesson}`;
    return groupedLessons[moduleKey]?.[lessonKey] || [];
  };

  const currentLessonSections = getCurrentLessonData();
  const lessonName = currentLessonSections.lessonName || `Lesson ${currentLesson}`;

  // Debug: Log the lesson being displayed
  console.log('📖 Displaying lesson:', {
    module: currentModule,
    lesson: currentLesson,
    lessonName: lessonName,
    sectionsCount: Array.isArray(currentLessonSections) ? currentLessonSections.length : 0
  });

  // Helper to determine if a section is high-priority for question generation
  // Get suggested question for section (only uses custom questions from H2 headings)
  const generateQuestionForSection = (section) => {
    if (!section) {
      console.log('generateQuestionForSection: no section');
      return null;
    }

    console.log('generateQuestionForSection:', {
      content_type: section.content_type,
      level: section.content?.level,
      suggested_question: section.suggested_question
    });

    // Only check H2 headings for suggested questions
    if (section.content_type === 'heading' && section.content?.level === 2) {
      // Only return custom suggested question if available
      if (section.suggested_question && section.suggested_question.trim()) {
        console.log('✅ Returning question:', section.suggested_question);
        return section.suggested_question;
      }
      console.log('⚠️ H2 found but no suggested_question');
    }

    // No auto-generated questions - return null if not H2 or no custom question exists
    return null;
  };


  // Intersection Observer to track visible sections
  useEffect(() => {
    // Wait for loading to complete and DOM to render
    if (loading || !currentLessonSections || currentLessonSections.length === 0 || !contentScrollRef.current) {
      console.log('Observer setup skipped - missing requirements:', {
        loading,
        hasLessonSections: !!currentLessonSections,
        lessonSectionsLength: currentLessonSections?.length || 0,
        hasContentScrollRef: !!contentScrollRef.current
      });
      return;
    }

    console.log('Setting up Intersection Observer for', currentLessonSections.length, 'sections');

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the H2 heading closest to the 50% mark of the viewport
        let closestH2Index = null;
        let smallestDistance = Infinity;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionIndex = parseInt(entry.target.dataset.sectionIndex);
            const section = currentLessonSections[sectionIndex];
            const rect = entry.boundingClientRect;
            const containerRect = entry.rootBounds;

            if (!containerRect) return;

            // Only check H2 headings for suggested questions
            const isH2 = section && section.content_type === 'heading' && section.content?.level === 2;

            if (isH2) {
              // Calculate how close the H2 is to the 50% point of the viewport (midway)
              const targetPosition = containerRect.height * 0.5;
              const sectionTop = rect.top;

              // Only consider H2s that have reached or passed the 50% mark (midway)
              if (sectionTop <= targetPosition) {
                const distanceFromTarget = Math.abs(sectionTop - targetPosition);
                if (distanceFromTarget < smallestDistance) {
                  smallestDistance = distanceFromTarget;
                  closestH2Index = sectionIndex;
                }
              }
            }
          }
        });

        // Use the H2 closest to the 50% mark that has reached or passed it
        const selectedH2 = closestH2Index;

        // Update the active section and suggested question
        if (selectedH2 !== null) {
          setActiveSectionIndex((prev) => {
            if (prev !== selectedH2) {
              const section = currentLessonSections[selectedH2];

              // Always show a question - either custom or fallback
              const newQuestion = generateQuestionForSection(section);
              setSuggestedQuestion(newQuestion || 'Can you explain this another way?');

              return selectedH2;
            }
            return prev;
          });
        }
      },
      {
        root: contentScrollRef.current,
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
      }
    );

    // Small delay to ensure refs are populated
    const setupTimer = setTimeout(() => {
      // Observe ALL section refs
      const refsToObserve = sectionRefs.current.filter(ref => ref !== null);
      console.log('Observing', refsToObserve.length, 'section refs');

      refsToObserve.forEach((ref) => {
        observer.observe(ref);
      });
    }, 100);

    return () => {
      clearTimeout(setupTimer);
      observer.disconnect();
    };
  }, [currentLessonSections, currentModule, currentLesson, loading]);

  const handleContinue = async () => {
    // Trigger knowledge check when user clicks Continue
    setShowKnowledgeCheck(true);
  };

  const handleRating = async (rating) => {
    if (!user) return;

    try {
      const courseId = await getUserCourseId();
      await submitLessonRating(user.id, courseId, currentModule, currentLesson, rating);
      setLessonRating(rating);
      setShowRatingFeedback(true);

      // Hide feedback after 2 seconds
      setTimeout(() => {
        setShowRatingFeedback(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting lesson rating:', error);
    }
  };

  const handleKnowledgeCheckClose = () => {
    setShowKnowledgeCheck(false);
  };

  const handleOpenFlashcards = async () => {
    try {
      // Show modal with loading state
      setShowFlashcards(true);
      setFlashcards([]);
      setIsLoadingFlashcards(true);
      setFlashcardError(null);

      // Fetch flashcards from database (already shuffled)
      const courseId = await getUserCourseId();
      const flashcardsData = await getFlashcards(courseId, currentModule, currentLesson);

      setIsLoadingFlashcards(false);

      if (flashcardsData && flashcardsData.length > 0) {
        setFlashcards(flashcardsData);
        setCurrentFlashcardIndex(0);
        setIsFlashcardFlipped(false);
      } else {
        // If no flashcards exist, show empty state
        console.warn(`No flashcards found for Module ${currentModule}, Lesson ${currentLesson}`);
        setFlashcards([]);
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      setIsLoadingFlashcards(false);
      setFlashcardError('Failed to load flashcards. Please try again.');
      setFlashcards([]);
    }
  };

  const handleCloseFlashcards = () => {
    setIsClosingFlashcards(true);
    setTimeout(() => {
      setShowFlashcards(false);
      setIsClosingFlashcards(false);
      setIsFlashcardFlipped(false);
      setCurrentFlashcardIndex(0);
      setFlashcardError(null);
      setIsLoadingFlashcards(false);
    }, 200);
  };

  const handleFlipFlashcard = () => {
    setIsFlashcardFlipped(!isFlashcardFlipped);
  };

  const handleNextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setIsFlashcardFlipped(false);
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
    }
  };

  const handlePreviousFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setIsFlashcardFlipped(false);
      setCurrentFlashcardIndex(currentFlashcardIndex - 1);
    }
  };

  const handleCloseLinkedInModal = () => {
    setIsClosingLinkedInModal(true);
    setTimeout(() => {
      setShowLinkedInModal(false);
      setIsClosingLinkedInModal(false);
      navigate('/');
    }, 200);
  };

  const handleAddToLinkedIn = () => {
    // LinkedIn URL to add education entry
    // This URL opens the LinkedIn profile edit page directly to the education section
    const linkedInUrl = 'https://www.linkedin.com/in/me/edit/forms/education/new/';

    // Open LinkedIn in new tab
    window.open(linkedInUrl, '_blank');

    // Close modal and navigate
    handleCloseLinkedInModal();
  };

  const handleKnowledgeCheckPass = async () => {
    console.log('🎯 handleKnowledgeCheckPass called');
    console.log('📍 Current lesson:', { module: currentModule, lesson: currentLesson });

    // Mark lesson as complete
    try {
      const userId = user?.id || 'temp-user-id';
      const courseId = await getUserCourseId();
      console.log('💾 Marking lesson complete for userId:', userId);

      await markLessonComplete(userId, courseId, currentModule, currentLesson);
      console.log('✅ Lesson marked as complete in database');

      // Check if this is the first lesson completed
      const isFirstLesson = completedLessons.length === 0;
      console.log('🔍 Is first lesson?', isFirstLesson, '(Current completed count:', completedLessons.length, ')');

      // Refresh completed lessons data
      try {
        const completedLessonsData = await getCompletedLessons(userId, courseId);
        console.log('✅ Completed lessons refreshed in LearningHub:', completedLessonsData);
        console.log('📊 New completed lessons count:', completedLessonsData.length);
        setCompletedLessons(completedLessonsData);
      } catch (error) {
        console.error('❌ Error refreshing completed lessons:', error);
      }

      // Close knowledge check
      setShowKnowledgeCheck(false);

      // If this is the first lesson, show LinkedIn modal
      if (isFirstLesson) {
        console.log('🎉 First lesson complete! Showing LinkedIn modal');
        setShowLinkedInModal(true);
      } else {
        // Otherwise navigate back to Progress Hub
        console.log('➡️ Navigating to Progress Hub');
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Error marking lesson complete:', error);
      // Still navigate back on error
      setShowKnowledgeCheck(false);
      navigate('/');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    const currentSelectedText = selectedText; // Store the selected text at send time

    // Add user message
    const newMessages = [...chatMessages, { type: 'user', text: userMessage }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsTyping(true);

    try {
      // Build lesson context from all sections
      const lessonContext = currentLessonSections.length > 0 ? `
Lesson: ${lessonName}
Module: ${currentModule}

Sections:
${currentLessonSections.map(section => `
Title: ${section.title}
Content: ${typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
`).join('\n---\n')}
      `.trim() : '';

      // Call backend API
      const response = await fetch('https://ignite-education-api.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          lessonContext: lessonContext
        }),
      });

      const data = await response.json();

      setIsTyping(false);

      if (data.success) {
        const newMessageIndex = chatMessages.length + 1;
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          text: data.response,
          isComplete: false
        }]);
        setTypingMessageIndex(newMessageIndex);

        // If this was explaining a selected text, save it to database and state
        if (currentSelectedText && userMessage.startsWith('Explain \'')) {
          try {
            const courseId = await getUserCourseId();
            // Strip formatting markers from selected text before saving
            const cleanText = stripFormattingMarkers(currentSelectedText);
            const savedSection = await saveExplainedSection(
              user.id,
              courseId,
              currentModule,
              currentLesson,
              cleanText,
              data.response
            );

            // Add to local state with database ID
            setExplainedSections(prev => [...prev, {
              text: cleanText,
              explanation: data.response,
              id: savedSection.id
            }]);
            setSelectedText(''); // Clear selected text
          } catch (error) {
            console.error('Error saving explained section:', error);
            // Still add to local state even if save fails
            const cleanText = stripFormattingMarkers(currentSelectedText);
            setExplainedSections(prev => [...prev, {
              text: cleanText,
              explanation: data.response,
              id: Date.now()
            }]);
            setSelectedText('');
          }
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      const newMessageIndex = chatMessages.length + 1;
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        text: 'Sorry, I encountered an error. Please try again! 😊',
        isComplete: false
      }]);
      setTypingMessageIndex(newMessageIndex);
    }
  };

  const handleDeleteExplanation = async (sectionId) => {
    try {
      // Delete from database
      await deleteExplainedSection(sectionId);

      // Remove from local state
      setExplainedSections(prev => prev.filter(section => section.id !== sectionId));

      // Clear any pending timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      // Close the popup and unlock
      setHoveredExplanation(null);
      setPopupLocked(false);
    } catch (error) {
      console.error('Error deleting explained section:', error);
    }
  };

  const handleStartEdit = (explanation) => {
    setEditedExplanation(explanation);
    setIsEditingExplanation(true);

    // Focus at the end of the content after render
    setTimeout(() => {
      if (editableRef.current) {
        editableRef.current.focus();
        // Move cursor to end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editableRef.current);
        range.collapse(false); // false means collapse to end
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 10);
  };

  const handleSaveEdit = async (sectionId) => {
    try {
      // Update in database
      await updateExplainedSection(sectionId, editedExplanation);

      // Update local state
      setExplainedSections(prev =>
        prev.map(section =>
          section.id === sectionId
            ? { ...section, explanation: editedExplanation }
            : section
        )
      );

      // Clear any pending timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      // Exit edit mode and close popup
      setIsEditingExplanation(false);
      setEditedExplanation('');
      setPopupLocked(false);
      setHoveredExplanation(null);
    } catch (error) {
      console.error('Error updating explained section:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingExplanation(false);
    setEditedExplanation('');
  };

  const handleReadNoteAloud = async (explanation) => {
    // If already reading, stop the audio
    if (isReadingNote && noteAudioRef.current) {
      noteAudioRef.current.pause();
      noteAudioRef.current = null;
      setIsReadingNote(false);
      return;
    }

    try {
      setIsReadingNote(true);

      // Strip markdown formatting from the text
      const cleanText = explanation
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold **text**
        .replace(/\*(.+?)\*/g, '$1')     // Remove italic *text*
        .trim();

      const response = await fetch('https://ignite-education-api.onrender.com/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      noteAudioRef.current = audio;

      audio.onended = () => {
        setIsReadingNote(false);
        noteAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsReadingNote(false);
        noteAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error reading note aloud:', error);
      setIsReadingNote(false);
      noteAudioRef.current = null;
    }
  };

  // Scroll handlers for upcoming lessons
  const handleScrollMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsScrolling(true);
    setScrollStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleScrollMouseMove = (e) => {
    if (!isScrolling || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - scrollStartX) * 2; // Multiply for faster scroll
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleScrollMouseUp = () => {
    setIsScrolling(false);
  };

  const handleScrollMouseLeave = () => {
    setIsScrolling(false);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current || upcomingLessonsToShow.length === 0) return;

    const scrollPosition = scrollContainerRef.current.scrollLeft;
    const gap = 16; // Gap between cards (gap-4 = 1rem = 16px)

    // Calculate which card is currently visible based on scroll position
    // Need to account for variable widths (completed lessons are slightly wider)
    let cumulativeWidth = 0;
    let index = 0;

    for (let i = 0; i < upcomingLessonsToShow.length; i++) {
      const lesson = upcomingLessonsToShow[i];
      const lessonIsCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
      // Find the first incomplete lesson (this is the current lesson)
      const firstIncompleteIndex = upcomingLessonsToShow.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
      const lessonIsCurrentLesson = i === firstIncompleteIndex;
      const cardWidth = (lessonIsCompleted || lessonIsCurrentLesson) ? 390 : 346.06;

      // Check if the scroll position is within this card's range
      if (scrollPosition < cumulativeWidth + cardWidth / 2) {
        index = i;
        break;
      }

      cumulativeWidth += cardWidth + gap;

      // If we've gone past all cards, set to last card
      if (i === upcomingLessonsToShow.length - 1) {
        index = i;
      }
    }

    setActiveCardIndex(index);
  };

  const scrollToCurrentLesson = () => {
    if (!scrollContainerRef.current || upcomingLessonsToShow.length === 0) return;

    // Find the index of the first incomplete lesson (current lesson)
    const currentLessonIndex = upcomingLessonsToShow.findIndex(
      lesson => !isLessonCompleted(lesson.module_number, lesson.lesson_number)
    );

    if (currentLessonIndex !== -1) {
      // Calculate the scroll position to show the current lesson card
      const gap = 16; // gap-4 = 16px
      let scrollPosition = 0;

      // Calculate position based on all previous cards accounting for variable widths
      for (let i = 0; i < currentLessonIndex; i++) {
        const lesson = upcomingLessonsToShow[i];
        const lessonIsCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
        const isCurrentLesson = i === currentLessonIndex;
        const width = (lessonIsCompleted || isCurrentLesson) ? 390 : 346.06;
        scrollPosition += width + gap;
      }

      scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      setActiveCardIndex(currentLessonIndex);
    }
  };

  const handleCloseUpgradeModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowUpgradeModal(false);
      setIsClosingModal(false);
      setClientSecret(null);
      setUpgradingToAdFree(false);
    }, 200);
  };

  const handleOpenUpgradeModal = async () => {
    if (!user) {
      alert('Please sign in to upgrade to ad-free');
      return;
    }

    setShowUpgradeModal(true);
    setUpgradingToAdFree(true);

    try {
      const response = await fetch('https://ignite-education-api.onrender.com/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setUpgradingToAdFree(false);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start upgrade process. Please try again.');
      handleCloseUpgradeModal();
    }
  };

  // Mount Stripe Checkout when clientSecret is available
  useEffect(() => {
    let checkout = null;

    const mountCheckout = async () => {
      if (clientSecret && checkoutRef.current) {
        try {
          const stripe = await stripePromise;

          checkout = await stripe.initEmbeddedCheckout({
            clientSecret,
          });

          checkout.mount(checkoutRef.current);
        } catch (error) {
          console.error('Error mounting Stripe checkout:', error);
          setUpgradingToAdFree(false);
          alert('Failed to load payment form. Please try again.');
        }
      }
    };

    mountCheckout();

    // Cleanup function
    return () => {
      if (checkout) {
        checkout.destroy();
      }
    };
  }, [clientSecret]);

  // Helper function to calculate total number of lessons in the course
  const getTotalLessonsCount = () => {
    let totalCount = 0;
    Object.keys(groupedLessons).forEach(moduleKey => {
      const moduleData = groupedLessons[moduleKey];
      const lessonKeys = Object.keys(moduleData).filter(key => key.startsWith('lesson_'));
      totalCount += lessonKeys.length;
    });
    return totalCount;
  };

  // Helper function to calculate how many lessons have been completed
  const getCompletedLessonsCount = () => {
    let completedCount = 0;

    // Count all lessons in modules before the current module
    for (let m = 1; m < currentModule; m++) {
      const moduleKey = `module_${m}`;
      if (groupedLessons[moduleKey]) {
        const lessonKeys = Object.keys(groupedLessons[moduleKey]).filter(key => key.startsWith('lesson_'));
        completedCount += lessonKeys.length;
      }
    }

    // Add completed lessons in the current module (lessons before current lesson)
    const currentModuleKey = `module_${currentModule}`;
    if (groupedLessons[currentModuleKey]) {
      const lessonKeys = Object.keys(groupedLessons[currentModuleKey])
        .filter(key => key.startsWith('lesson_'))
        .map(key => parseInt(key.split('_')[1]))
        .filter(num => num < currentLesson);
      completedCount += lessonKeys.length;
    }

    return completedCount;
  };

  // Calculate progress percentage (same logic as ProgressHub)
  const calculateProgressPercentage = () => {
    const totalLessons = getTotalLessonsCount();
    if (totalLessons === 0) return 0;

    const completedLessons = getCompletedLessonsCount();
    return Math.round((completedLessons / totalLessons) * 100);
  };

  const progressPercentage = Object.keys(groupedLessons).length > 0 ? calculateProgressPercentage() : 0;

  // Helper function to check if a lesson is completed
  const isLessonCompleted = (moduleNum, lessonNum) => {
    return completedLessons.some(
      (completion) => completion.module_number === moduleNum && completion.lesson_number === lessonNum
    );
  };

  // Helper function to get current lesson, completed lessons, and upcoming lessons
  const getAllLessons = () => {
    if (lessonsMetadata.length === 0) return [];

    // Return all lessons sorted by module and lesson number
    return lessonsMetadata.sort((a, b) => {
      if (a.module_number !== b.module_number) {
        return a.module_number - b.module_number;
      }
      return a.lesson_number - b.lesson_number;
    });
  };

  const upcomingLessonsToShow = Object.keys(groupedLessons).length > 0 ? getAllLessons() : [];

  // Scroll to current lesson on initial load
  useEffect(() => {
    // Only run if we have lessons and the scroll container exists
    if (!scrollContainerRef.current || upcomingLessonsToShow.length === 0 || loading) return;

    // Find the index of the current lesson
    // Find the first incomplete lesson (this is the current lesson)
    const currentLessonIndex = upcomingLessonsToShow.findIndex(
      lesson => !isLessonCompleted(lesson.module_number, lesson.lesson_number)
    );

    console.log('🎯 LearningHub - Attempting to scroll to current lesson index:', currentLessonIndex);
    console.log('📚 LearningHub - Total lessons:', upcomingLessonsToShow.length);
    console.log('📝 LearningHub - All lessons:', upcomingLessonsToShow.map(l => `M${l.module_number}L${l.lesson_number}`));

    if (currentLessonIndex !== -1) {
      // Calculate the scroll position immediately
      const container = scrollContainerRef.current;
      const gap = 16; // gap-4 = 16px
      let scrollPosition = 0;

      // Sum up widths of all cards before the current lesson
      for (let i = 0; i < currentLessonIndex; i++) {
        const lesson = upcomingLessonsToShow[i];
        const lessonIsCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
        const lessonIsCurrentLesson = i === currentLessonIndex;
        const width = (lessonIsCompleted || lessonIsCurrentLesson) ? 390 : 346.06;
        scrollPosition += width + gap;
      }

      console.log('📍 LearningHub - Setting initial scroll position:', scrollPosition);

      // Set scroll position immediately without animation
      container.scrollLeft = scrollPosition;

      // Update active card index to match
      setActiveCardIndex(currentLessonIndex);

      // Mark carousel as ready to display
      setIsCarouselReady(true);
    } else {
      // No current lesson found, just show the carousel
      setIsCarouselReady(true);
    }
  }, [upcomingLessonsToShow, loading, currentModule, currentLesson, completedLessons]);

  // Track container width for dynamic padding
  useEffect(() => {
    if (!scrollContainerRef.current || !isCarouselReady) return;

    const updateContainerWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };

    // Initial measurement
    updateContainerWidth();

    // Update on window resize
    window.addEventListener('resize', updateContainerWidth);

    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, [upcomingLessonsToShow.length, isCarouselReady]);

  // Extract text content from sections for read-aloud
  const extractTextFromSection = (section) => {
    if (section.content_type === 'heading') {
      const text = section.content?.text || section.title || '';
      return stripFormattingMarkers(text);
    }

    if (section.content_type === 'paragraph') {
      const text = typeof section.content === 'string' ? section.content : section.content?.text || section.content_text || '';
      return stripFormattingMarkers(text);
    }

    return '';
  };

  // Helper to format explanation text with proper formatting (matching chat display)
  const formatExplanationText = (text) => {
    if (!text) return null;

    return text.split('\n').map((line, i) => {
      // Check if line starts with bullet point or number (with : or -)
      const bulletMatchColon = line.match(/^[•\-\*]\s+(.+?):\s*(.*)$/);
      const bulletMatchDash = line.match(/^[•\-\*]\s+(.+?)\s+-\s+(.*)$/);
      const numberedMatchColon = line.match(/^(\d+)\.\s+(.+?):\s*(.*)$/);
      const numberedMatchDash = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.*)$/);

      if (bulletMatchColon) {
        // Bullet point with colon
        return (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            <span>{bulletMatchColon[0].charAt(0)} </span>
            <strong className="font-semibold">{bulletMatchColon[1]}:</strong>
            <span> {bulletMatchColon[2]}</span>
          </p>
        );
      } else if (bulletMatchDash) {
        // Bullet point with dash
        return (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            <span>{bulletMatchDash[0].charAt(0)} </span>
            <strong className="font-semibold">{bulletMatchDash[1]}</strong>
            <span> - {bulletMatchDash[2]}</span>
          </p>
        );
      } else if (numberedMatchColon) {
        // Numbered list with colon
        return (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            <span>{numberedMatchColon[1]}. </span>
            <strong className="font-semibold">{numberedMatchColon[2]}:</strong>
            <span> {numberedMatchColon[3]}</span>
          </p>
        );
      } else if (numberedMatchDash) {
        // Numbered list with dash
        return (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            <span>{numberedMatchDash[1]}. </span>
            <strong className="font-semibold">{numberedMatchDash[2]}</strong>
            <span> - {numberedMatchDash[3]}</span>
          </p>
        );
      } else {
        // Regular text with inline formatting
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|DNA|RNA|Proteins)/g);
        return (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {parts.map((part, j) => {
              // Check for bold (**text**)
              if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                const boldText = part.slice(2, -2).trim();
                return <strong key={j} className="font-semibold">{boldText}</strong>;
              }
              // Check for italic (*text*)
              else if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
                const italicText = part.slice(1, -1).trim();
                return <em key={j} className="italic">{italicText}</em>;
              }
              // Specific keywords to bold
              else if (part === 'DNA' || part === 'RNA' || part === 'Proteins') {
                return <strong key={j} className="font-semibold">{part}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      }
    });
  };

  // Helper to calculate popup position within viewport bounds
  const getAdjustedPopupPosition = (x, y) => {
    const popupWidth = 400; // Fixed width
    const popupMaxHeight = 400;
    const offset = 20;

    let adjustedX = x;
    let adjustedY = y - offset;
    let transformY = '-100%'; // Default: above cursor

    // Check if popup would overflow top of viewport
    // Estimate popup height (we'll use max height as worst case)
    if (adjustedY - popupMaxHeight < 0) {
      // Position below cursor instead
      adjustedY = y + offset;
      transformY = '0%';
    }

    // Check horizontal bounds
    const halfWidth = popupWidth / 2;
    if (adjustedX - halfWidth < 0) {
      adjustedX = halfWidth;
    } else if (adjustedX + halfWidth > window.innerWidth) {
      adjustedX = window.innerWidth - halfWidth;
    }

    return {
      x: adjustedX,
      y: adjustedY,
      transformY
    };
  };

  // Helper to render text with explained sections highlighted
  const renderTextWithHighlight = (text, startWordIndex) => {
    if (!text) return null;

    // Check if any explained sections match parts of this text
    let result = text;
    const elements = [];
    let lastIndex = 0;

    explainedSections.forEach((section) => {
      const index = text.indexOf(section.text);
      if (index !== -1) {
        // Add text before the match
        if (index > lastIndex) {
          elements.push(text.substring(lastIndex, index));
        }

        // Add highlighted explained text with hover functionality
        elements.push(
          <span
            key={section.id}
            className="bg-pink-100 cursor-pointer transition-colors hover:bg-pink-200"
            style={{
              backgroundColor: hoveredExplanation === section.id ? '#fce7f3' : '#fce7f3',
              borderRadius: '2px',
              padding: '2px 0'
            }}
            onMouseEnter={(e) => {
              // Clear any pending close timeout
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }

              if (!popupLocked) {
                setHoveredExplanation(section.id);

                // Calculate position based on the highlighted element
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + (rect.width / 2);
                const bottomY = rect.bottom;
                const topY = rect.top;

                // Check if there's enough space above
                const popupHeight = 500; // max height
                const spaceAbove = topY;
                const spaceBelow = window.innerHeight - bottomY;
                const preferAbove = spaceAbove > popupHeight || spaceAbove > spaceBelow;

                setPopupPosition({
                  x: centerX,
                  y: preferAbove ? topY : bottomY,
                  preferAbove: preferAbove
                });

                // Store reference to the highlight element
                highlightRef.current = e.currentTarget;
              }
            }}
            onMouseMove={(e) => {
              // Don't update position on mouse move - keep it fixed
            }}
            onMouseLeave={() => {
              if (!popupLocked) {
                // Add a delay before closing to allow user to move to popup
                closeTimeoutRef.current = setTimeout(() => {
                  setHoveredExplanation(null);
                  highlightRef.current = null;
                }, 300); // 300ms delay
              }
            }}
          >
            {section.text}
          </span>
        );

        lastIndex = index + section.text.length;
      }
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return elements.length > 0 ? elements : text;
  };

  // Narrate a single section
  const narrateSection = async (sectionIndex) => {
    if (sectionIndex >= currentLessonSections.length) {
      // Finished all sections
      console.log('✅ Finished narrating all sections');
      setIsReading(false);
      setCurrentNarrationSection(0);
      return;
    }

    const section = currentLessonSections[sectionIndex];
    const sectionText = extractTextFromSection(section);

    if (!sectionText || sectionText.length === 0) {
      // Skip empty sections and move to next
      console.log(`⏭️ Skipping empty section ${sectionIndex}`);
      await narrateSection(sectionIndex + 1);
      return;
    }

    console.log(`📖 Narrating section ${sectionIndex}: ${sectionText.substring(0, 50)}...`);

    // Scroll when we hit h2 or h3 headers (but skip the first h2 which is learning objectives)
    const headingLevel = section.content_type === 'heading' ? (section.content?.level || 2) : null;
    const isH2OrH3Header = headingLevel === 2 || headingLevel === 3;

    if (isH2OrH3Header) {
      // Find if this is the first h2 header (learning objectives)
      const firstH2Index = currentLessonSections.findIndex(s =>
        s.content_type === 'heading' && (s.content?.level || 2) === 2
      );

      // Skip scrolling only if this is the first h2 header
      if (sectionIndex !== firstH2Index) {
        scrollToSection(sectionIndex);
      }
    }

    try {
      const response = await fetch('https://ignite-education-api.onrender.com/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: sectionText }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log(`✅ Finished section ${sectionIndex}`);
        URL.revokeObjectURL(audioUrl);

        // Continue to next section if not paused
        if (!isPausedRef.current) {
          narrateSection(sectionIndex + 1);
        }
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        setIsReading(false);
      };

      await audio.play();
      setCurrentNarrationSection(sectionIndex);

    } catch (error) {
      console.error('Error narrating section:', error);
      setIsReading(false);
    }
  };

  // Scroll to a specific section with custom smooth animation
  const scrollToSection = (sectionIndex) => {
    if (!contentScrollRef.current || !sectionRefs.current[sectionIndex]) return;

    const targetSection = sectionRefs.current[sectionIndex];
    const container = contentScrollRef.current;
    const sectionTop = targetSection.offsetTop;
    const containerPadding = 32;
    const targetScrollTop = sectionTop - containerPadding;

    // Custom smooth scroll with easing
    const startScrollTop = container.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    const duration = 1200; // Longer duration for smoother scroll
    let startTime = null;

    // Ease in-out cubic function for smooth acceleration and deceleration
    const easeInOutCubic = (t) => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      container.scrollTop = startScrollTop + distance * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Narrate the lesson title before starting content
  const narrateLessonTitle = async () => {
    try {
      console.log(`📖 Narrating lesson title: ${lessonName}`);

      const response = await fetch('https://ignite-education-api.onrender.com/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: lessonName }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech for lesson title');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        console.log(`✅ Finished lesson title`);
        URL.revokeObjectURL(audioUrl);

        // Continue to lesson content if not paused
        if (!isPausedRef.current) {
          narrateSection(0);
        }
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        setIsReading(false);
      };

      await audio.play();

    } catch (error) {
      console.error('Error narrating lesson title:', error);
      setIsReading(false);
    }
  };

  // Handle read-aloud functionality with Amazon Polly
  const handleReadAloud = async () => {
    // If audio is playing, pause it
    if (isReading && audioRef.current) {
      audioRef.current.pause();
      setIsReading(false);
      isPausedRef.current = true;
      return;
    }

    // If audio exists and is paused, resume it
    if (audioRef.current && !isReading && audioRef.current.currentTime > 0) {
      audioRef.current.play();
      setIsReading(true);
      isPausedRef.current = false;
      return;
    }

    // Start reading from the beginning with lesson title
    setIsReading(true);
    isPausedRef.current = false;
    setCurrentNarrationSection(0);
    narrateLessonTitle();
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (noteAudioRef.current) {
        noteAudioRef.current.pause();
        noteAudioRef.current = null;
      }
    };
  }, []);

  // Cleanup note audio when popup closes
  useEffect(() => {
    if (!hoveredExplanation && noteAudioRef.current) {
      noteAudioRef.current.pause();
      noteAudioRef.current = null;
      setIsReadingNote(false);
    }
  }, [hoveredExplanation]);

  if (loading) {
    return <LoadingScreen />;
  }

  // Check if user is trying to access a lesson ahead of their progress
  // Only run this check after completedLessons has been loaded to avoid false positives
  let isLessonLocked = false;
  let currentLessonToNavigate = null;

  if (!loading && lessonsMetadata.length > 0 && completedLessons !== null) {
    const allLessons = [...lessonsMetadata].sort((a, b) => {
      if (a.module_number !== b.module_number) {
        return a.module_number - b.module_number;
      }
      return a.lesson_number - b.lesson_number;
    });

    // Check if the previous lesson is completed
    const requestedLessonIndex = allLessons.findIndex(
      lesson => lesson.module_number === currentModule && lesson.lesson_number === currentLesson
    );

    console.log('🔒 Lesson Lock Check:');
    console.log('  Current Module/Lesson:', currentModule, currentLesson);
    console.log('  Requested Lesson Index:', requestedLessonIndex);
    console.log('  Completed Lessons:', completedLessons.map(l => `M${l.module_number}L${l.lesson_number}`).join(', '));

    if (requestedLessonIndex > 0) {
      // There is a previous lesson - check if it's completed
      const previousLesson = allLessons[requestedLessonIndex - 1];
      console.log('  Previous Lesson:', `M${previousLesson.module_number}L${previousLesson.lesson_number}`);

      const isPreviousCompleted = isLessonCompleted(previousLesson.module_number, previousLesson.lesson_number);
      console.log('  Is Previous Completed?', isPreviousCompleted);

      if (!isPreviousCompleted) {
        console.log('  ❌ LESSON LOCKED - previous lesson not completed');
        isLessonLocked = true;
        // Find the first incomplete lesson to navigate to
        const firstIncompleteIndex = allLessons.findIndex(
          lesson => !isLessonCompleted(lesson.module_number, lesson.lesson_number)
        );
        currentLessonToNavigate = allLessons[firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0];
      } else {
        console.log('  ✅ LESSON UNLOCKED - previous lesson is completed');
      }
    } else {
      console.log('  ✅ LESSON UNLOCKED - this is the first lesson');
    }
  }

  if (!currentLessonSections || currentLessonSections.length === 0) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center flex-col gap-4">
        <div className="text-xl">Lesson not found</div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
        >
          Back to Progress Hub
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Left Sidebar - Course Navigation */}
      <div className="bg-black border-r border-gray-800 flex flex-col h-screen overflow-hidden" style={{ width: '507.1px', minWidth: '507.1px' }}>
        {/* Header */}
        <div className="flex-shrink-0 px-8" style={{ paddingTop: '19.38px', paddingBottom: '5px' }}>
          <div className="flex items-center justify-between">
            <div
              className="w-auto cursor-pointer"
              style={{
                backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                width: '108.8px',
                height: '36px',
                marginBottom: '12px',
                marginLeft: '-5.44px'
              }}
              onClick={() => navigate('/')}
            />
          </div>
          <h2 className="font-semibold" style={{ letterSpacing: '0.011em', fontSize: '27px', marginBottom: '0.72px' }}>{userCourseName}</h2>
        </div>

        {/* Upcoming Lessons */}
        <div className="flex-shrink-0 px-8 relative" style={{ paddingTop: '0px', paddingBottom: '4px' }}>
          <h3 className="font-semibold" style={{ fontSize: '19px', marginBottom: '2px' }}>
            {upcomingLessonsToShow.length > 0 && activeCardIndex < upcomingLessonsToShow.length && upcomingLessonsToShow[activeCardIndex] ? (
              (() => {
                const activeLesson = upcomingLessonsToShow[activeCardIndex];
                const isCompleted = isLessonCompleted(activeLesson.module_number, activeLesson.lesson_number);
                // Find the first incomplete lesson (this is the current lesson)
                const firstIncompleteIndex = upcomingLessonsToShow.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
                const isCurrentLesson = activeCardIndex === firstIncompleteIndex;

                if (isCompleted) return 'Completed Lesson';
                if (isCurrentLesson) return 'Current Lesson';
                return 'Upcoming Lesson';
              })()
            ) : 'Upcoming Lessons'}
          </h3>
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-hidden select-none"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              scrollBehavior: 'smooth',
              cursor: isScrolling ? 'grabbing' : 'grab',
              paddingBottom: '9px',
              scrollSnapType: 'x mandatory',
              opacity: isCarouselReady ? 1 : 0,
              visibility: isCarouselReady ? 'visible' : 'hidden',
              transition: 'opacity 0.3s ease-in'
            }}
            onMouseDown={handleScrollMouseDown}
            onMouseMove={handleScrollMouseMove}
            onMouseUp={handleScrollMouseUp}
            onMouseLeave={handleScrollMouseLeave}
            onScroll={handleScroll}
          >
            <div className="flex gap-4" style={{
              minHeight: '100px',
              height: '100px',
              paddingRight: containerWidth > 0 ? `${Math.max(0, containerWidth - 390 - 16)}px` : '0px'
            }}>
              {upcomingLessonsToShow.length > 0 ? (
                upcomingLessonsToShow.map((lesson, index) => {
                  const isCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
                  // Find the first incomplete lesson (this is the current lesson)
                  const firstIncompleteIndex = upcomingLessonsToShow.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
                  const isCurrentLesson = index === firstIncompleteIndex;

                  return (
                    <div
                      key={`${lesson.module_number}-${lesson.lesson_number}`}
                      ref={(el) => (cardRefs.current[index] = el)}
                      className="relative flex items-center gap-3"
                      style={{
                        width: (isCompleted || isCurrentLesson) ? '390px' : '346.06px',
                        minWidth: (isCompleted || isCurrentLesson) ? '390px' : '346.06px',
                        flexShrink: 0,
                        paddingTop: '4px',
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
                        {/* Opacity overlay for non-active cards */}
                        {index !== activeCardIndex && (
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
                              borderRadius: '0.3rem',
                              pointerEvents: 'none',
                              transition: 'background-color 0.4s cubic-bezier(0.4, 0.0, 0.2, 1), backdrop-filter 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)'
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold truncate text-white" style={{ marginBottom: '3px', fontSize: '13px' }}>
                            {lesson.lesson_name || `Lesson ${lesson.lesson_number}`}
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

                        {/* Arrow button for completed and current lessons */}
                        {(isCompleted || isCurrentLesson) && (
                          <button
                            className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                            style={{
                              width: '48px',
                              height: '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '0.3rem',
                              marginRight: '10px'
                            }}
                            onClick={() => {
                              navigate(`/learning?module=${lesson.module_number}&lesson=${lesson.lesson_number}`);
                            }}
                          >
                            <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </button>
                        )}
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center" style={{ padding: '7.398px' }}>
                  <p className="text-purple-200 text-sm">No more upcoming lessons</p>
                </div>
              )}
            </div>
          </div>

          {/* Back to Current Lesson Button - Hide when viewing current lesson or when all lessons are completed */}
          {(() => {
            // Check if all lessons in the course are completed
            const allLessonsCompleted = completedLessons.length === upcomingLessonsToShow.length && upcomingLessonsToShow.length > 0;

            // Find the index of the first incomplete lesson (current lesson)
            const currentLessonIndex = upcomingLessonsToShow.findIndex(
              l => !isLessonCompleted(l.module_number, l.lesson_number)
            );
            // Show button only when NOT viewing the current lesson
            const isNotViewingCurrentLesson = activeCardIndex !== currentLessonIndex;
            // Determine if viewing a completed lesson (left of current) or upcoming lesson (right of current)
            const isViewingCompletedLesson = activeCardIndex < currentLessonIndex;

            return isNotViewingCurrentLesson && !allLessonsCompleted && (
              <button
                onClick={scrollToCurrentLesson}
                className="absolute bg-white text-black hover:bg-purple-50 transition-all"
                style={{
                  right: '42px',
                  top: '50%',
                  transform: 'translateY(-35%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  opacity: 0.7
                }}
              >
                {isViewingCompletedLesson ? (
                  // Right-pointing arrow when viewing completed lessons
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                ) : (
                  // Left-pointing arrow when viewing upcoming lessons
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                )}
              </button>
            );
          })()}
        </div>

        {/* Chat with Will Section - Scrollable */}
        <div className="flex-1 flex flex-col px-8 overflow-hidden" style={{ paddingTop: '0px', paddingBottom: isAdFree ? '8px' : '17.6px' }}>
          <h3 className="flex-shrink-0 font-semibold" style={{ fontSize: '19px', marginBottom: '1px' }}>Chat with Will</h3>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={chatContainerRef} className="bg-white overflow-y-auto hide-scrollbar flex flex-col justify-end" style={{ borderRadius: '0.3rem 0.3rem 0 0', marginBottom: '0px', scrollbarWidth: 'none', msOverflowStyle: 'none', flex: '0.98', minHeight: '0', padding: '1.5rem 1rem 0.8rem 1rem' }}>
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={msg.type === 'user' ? 'flex justify-end' : ''}
                  style={{
                    animation: 'slideUp 0.3s ease-out',
                    opacity: 1,
                    marginBottom: idx < chatMessages.length - 1 ? '0.5rem' : '0'
                  }}
                >
                  {msg.type === 'assistant' ? (
                    <div className="p-3 text-black text-sm leading-snug relative group inline-block max-w-[95%]" style={{
                      position: 'relative',
                      borderRadius: '8px',
                      backgroundColor: '#f3f4f6'
                    }}>
                      {(typingMessageIndex === idx && !msg.isComplete ? displayedText : (!msg.isComplete && typingMessageIndex === null ? '' : msg.text)).split('\n').map((line, i) => {
                        // Check if line starts with bullet point or number (with : or -)
                        const bulletMatchColon = line.match(/^[•\-\*]\s+(.+?):\s*(.*)$/);
                        const bulletMatchDash = line.match(/^[•\-\*]\s+(.+?)\s+-\s+(.*)$/);
                        const numberedMatchColon = line.match(/^(\d+)\.\s+(.+?):\s*(.*)$/);
                        const numberedMatchDash = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.*)$/);

                        if (bulletMatchColon) {
                          // Bullet point with colon
                          const titleText = bulletMatchColon[1].replace(/\*\*/g, '');
                          const contentText = bulletMatchColon[2].replace(/\*\*/g, '');
                          return (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                              <span>{bulletMatchColon[0].charAt(0)} </span>
                              <strong className="font-semibold">{titleText}:</strong>
                              <span> {contentText}</span>
                            </p>
                          );
                        } else if (bulletMatchDash) {
                          // Bullet point with dash
                          const titleText = bulletMatchDash[1].replace(/\*\*/g, '');
                          const contentText = bulletMatchDash[2].replace(/\*\*/g, '');
                          return (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                              <span>{bulletMatchDash[0].charAt(0)} </span>
                              <strong className="font-semibold">{titleText}</strong>
                              <span> - {contentText}</span>
                            </p>
                          );
                        } else if (numberedMatchColon) {
                          // Numbered list with colon
                          const titleText = numberedMatchColon[2].replace(/\*\*/g, '');
                          const contentText = numberedMatchColon[3].replace(/\*\*/g, '');
                          return (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                              <span>{numberedMatchColon[1]}. </span>
                              <strong className="font-semibold">{titleText}:</strong>
                              <span> {contentText}</span>
                            </p>
                          );
                        } else if (numberedMatchDash) {
                          // Numbered list with dash
                          const titleText = numberedMatchDash[2].replace(/\*\*/g, '');
                          const contentText = numberedMatchDash[3].replace(/\*\*/g, '');
                          return (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                              <span>{numberedMatchDash[1]}. </span>
                              <strong className="font-semibold">{titleText}</strong>
                              <span> - {contentText}</span>
                            </p>
                          );
                        } else {
                          // Regular text with inline formatting
                          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|DNA|RNA|Proteins)/g);
                          return (
                            <p key={i} className={i > 0 ? 'mt-2' : ''}>
                              {parts.map((part, j) => {
                                // Check for bold (**text**)
                                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                                  const boldText = part.slice(2, -2);
                                  return <strong key={j} className="font-semibold">{boldText}</strong>;
                                }
                                // Check for italic (*text*)
                                else if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
                                  const italicText = part.slice(1, -1);
                                  return <em key={j} className="italic">{italicText}</em>;
                                }
                                // Specific keywords to bold
                                else if (part === 'DNA' || part === 'RNA' || part === 'Proteins') {
                                  return <strong key={j} className="font-semibold">{part}</strong>;
                                }
                                return <span key={j}>{part}</span>;
                              })}
                            </p>
                          );
                        }
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-white text-sm max-w-[95%] inline-block" style={{
                      position: 'relative',
                      borderRadius: '8px',
                      backgroundColor: '#7c3aed'
                    }}>
                      {msg.text}
                    </div>
                  )}
                </div>
              ))}
              {/* Typing indicator */}
              {isTyping && (
                <div
                  style={{
                    animation: 'slideUp 0.3s ease-out',
                    marginTop: '1rem'
                  }}
                >
                  <div className="p-3 text-black text-sm leading-snug inline-block max-w-[95%]" style={{
                    position: 'relative',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6'
                  }}>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 bg-gray-100 p-3" style={{ marginTop: '0px', borderRadius: '0 0 0.3rem 0.3rem' }}>
              <form data-chat-form onSubmit={handleSendMessage} style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onFocus={() => {
                    setShowPlaceholder(false);
                    setIsEditingInput(true);
                  }}
                  onBlur={() => {
                    setShowPlaceholder(true);
                    setIsEditingInput(false);
                  }}
                  placeholder={showPlaceholder ? "type to understand or select below" : ""}
                  className="w-full bg-gray-100 px-5 text-sm text-center focus:outline-none placeholder-gray-500 text-black caret-gray-500"
                  style={{ borderRadius: '0 0 0.75rem 0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
                />
              </form>
              {suggestedQuestion && (
                <button
                  key={suggestedQuestion}
                  onClick={async () => {
                    const question = suggestedQuestion;

                    // Add user message directly
                    const newMessages = [...chatMessages, { type: 'user', text: question }];
                    setChatMessages(newMessages);
                    setIsTyping(true);

                    try {
                      // Build lesson context from all sections
                      const lessonContext = currentLessonSections.length > 0 ? `
Lesson: ${lessonName}

Content:
${currentLessonSections.map((section) => {
  if (section.content_type === 'heading') {
    return `## ${section.content?.text || section.title}`;
  } else if (section.content_type === 'paragraph') {
    return typeof section.content === 'string' ? section.content : section.content?.text || section.content_text || '';
  }
  return '';
}).filter(Boolean).join('\n\n')}
` : '';

                      const response = await fetch('https://ignite-education-api.onrender.com/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          messages: newMessages,
                          lessonContext: lessonContext
                        })
                      });

                      const data = await response.json();

                      setIsTyping(false);

                      if (data.success) {
                        const newMessageIndex = newMessages.length;
                        setChatMessages(prev => [...prev, {
                          type: 'assistant',
                          text: data.response,
                          isComplete: false
                        }]);
                        setTypingMessageIndex(newMessageIndex);
                      } else {
                        throw new Error(data.error || 'Failed to get response');
                      }
                    } catch (error) {
                      console.error('Error sending message:', error);
                      setIsTyping(false);
                      const newMessageIndex = newMessages.length;
                      setChatMessages(prev => [...prev, {
                        type: 'assistant',
                        text: 'Sorry, I encountered an error. Please try again.',
                        isComplete: false
                      }]);
                      setTypingMessageIndex(newMessageIndex);
                    }
                  }}
                  className="flex-shrink-0 w-full text-white px-4 py-2 font-medium transition overflow-hidden"
                  style={{ borderRadius: '1rem', fontSize: '0.85rem', backgroundColor: '#7714E0', hover: { backgroundColor: '#6610C7' } }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6610C7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7714E0'}
                >
                  {suggestedQuestion.split('').map((char, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'inline-block',
                        animation: 'letterSlideUp 0.12s ease-out forwards',
                        animationDelay: `${index * 0.008}s`,
                        opacity: 0,
                        transform: 'translateY(3px)'
                      }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ))}
                </button>
              )}
            </div>

            {/* Google Display Ad */}
            <div className={`flex-shrink-0 ${isAdFree ? 'mt-2' : 'mt-8'} w-full relative`}>
              {/* Ad-Free Upgrade Banner (only show if not ad-free) */}
              {!isAdFree && (
                <button
                  onClick={handleOpenUpgradeModal}
                  className="absolute -top-5 left-0 text-white hover:text-pink-500 transition text-sm cursor-pointer"
                >
                  Go ad-free for 99p
                </button>
              )}

              <GoogleAd
                adClient="ca-pub-8629703639546275"
                adSlot="3322377575"
                adFormat="auto"
                style={{ minHeight: '60px' }}
                isAdFree={isAdFree}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white text-black overflow-hidden relative" style={{ minWidth: '600px', flexShrink: 0 }}>
        {/* Locked Lesson Overlay */}
        {isLessonLocked && currentLessonToNavigate && (
          <div className="absolute inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
            <div className="text-center flex flex-col gap-4">
              <div className="text-xl text-black font-semibold">Lesson not available yet</div>
              <button
                onClick={() => window.location.href = `/learning?module=${currentLessonToNavigate.module_number}&lesson=${currentLessonToNavigate.lesson_number}`}
                className="px-6 py-2 rounded-lg transition"
                style={{ backgroundColor: '#EF0B72', color: 'white' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#D90A65'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#EF0B72'}
              >
                Go to Current Lesson
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content - All Sections */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto px-16 py-8 pb-20" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', position: 'relative' }}>
          <div className="max-w-4xl mx-auto space-y-0" style={{ position: 'relative', zIndex: 2 }}>
            {/* Lesson Title */}
            <div style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
              <p className="text-xl font-medium" style={{ color: '#EF0B72', marginBottom: '0.25rem' }}>
                Lesson {(() => {
                  // Calculate global lesson number across all modules
                  const sortedLessons = [...lessonsMetadata].sort((a, b) => {
                    if (a.module_number !== b.module_number) return a.module_number - b.module_number;
                    return a.lesson_number - b.lesson_number;
                  });
                  const globalIndex = sortedLessons.findIndex(
                    l => l.module_number === currentModule && l.lesson_number === currentLesson
                  );
                  return globalIndex !== -1 ? globalIndex + 1 : currentLesson;
                })()}
              </p>
              <div className="bg-black text-white px-3 flex items-center" style={{ borderRadius: '0.2rem', paddingTop: '1rem', paddingBottom: '1rem', maxWidth: '750px', width: 'fit-content' }}>
                <h1 className="text-3xl font-medium text-left">{lessonName}</h1>
              </div>
            </div>
            {/* Render ALL sections */}
            <div style={{ filter: isLessonLocked ? 'blur(8px)' : 'none', pointerEvents: isLessonLocked ? 'none' : 'auto' }}>
            {currentLessonSections.map((section, sectionIdx) => {
              // Determine how to render based on content_type
              const renderContent = () => {
                // Handle new content types from CurriculumUpload
                if (section.content_type === 'heading') {
                  const level = section.content?.level || 2;
                  const text = section.content?.text || section.title;
                  const HeadingTag = `h${level}`;
                  const sizes = { 1: 'text-3xl', 2: 'text-2xl', 3: 'text-xl' };

                  // Calculate word offset for this section
                  const wordsBeforeThisSection = currentLessonSections
                    .slice(0, sectionIdx)
                    .map(s => extractTextFromSection(s))
                    .join('. ')
                    .split(/\s+/)
                    .filter(w => w.length > 0).length;

                  // Helper function to render text with underline formatting and highlighting
                  const renderHeadingText = (text, wordOffset) => {
                    const parts = text.split(/(__[^_]+__)/g);
                    let currentOffset = wordOffset;

                    return parts.map((part, i) => {
                      const cleanPart = part.replace(/__/g, '');
                      const wordCount = cleanPart.split(/\s+/).filter(w => w.length > 0).length;

                      let result;
                      if (part.startsWith('__') && part.endsWith('__')) {
                        const innerText = part.slice(2, -2);
                        result = <u key={i}>{renderTextWithHighlight(innerText, currentOffset)}</u>;
                      } else {
                        result = <span key={i}>{renderTextWithHighlight(part, currentOffset)}</span>;
                      }

                      currentOffset += wordCount;
                      return result;
                    });
                  };

                  // For h2 headings, wrap in black box
                  if (level === 2) {
                    return (
                      <div className="bg-black text-white flex items-center mb-2" style={{ borderRadius: '0.2rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', maxWidth: '750px', width: 'fit-content', marginTop: '3rem' }}>
                        {React.createElement(HeadingTag, {
                          className: 'font-medium',
                          style: { fontSize: '1.4rem' }
                        }, renderHeadingText(text, wordsBeforeThisSection))}
                      </div>
                    );
                  }

                  return React.createElement(HeadingTag, {
                    className: `${sizes[level]} font-bold mt-8 mb-2`
                  }, renderHeadingText(text, wordsBeforeThisSection));
                }

                if (section.content_type === 'paragraph') {
                  const text = typeof section.content === 'string' ? section.content : section.content?.text || section.content_text;

                  // Calculate word offset for this section
                  const wordsBeforeThisSection = currentLessonSections
                    .slice(0, sectionIdx)
                    .map(s => extractTextFromSection(s))
                    .join('. ')
                    .split(/\s+/)
                    .filter(w => w.length > 0).length;

                  // Helper function to render text with bold and underline formatting
                  const renderTextWithBold = (text, wordOffset = 0) => {
                    // Split by bold (**), underline (__), italic (*), and link [text](url) markers
                    // Match ** before * to avoid conflicts
                    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\[(?:[^\]]+)\]\((?:[^)]+)\)|(?<!\*)\*(?!\*)([^*]+)\*(?!\*))/g);
                    let currentOffset = wordOffset;

                    return parts.map((part, i) => {
                      // Skip undefined parts from regex capture groups
                      if (part === undefined) return null;

                      // Check for link format [text](url)
                      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

                      // Remove formatting markers to count words
                      const cleanPart = part
                        .replace(/\*\*/g, '')
                        .replace(/__/g, '')
                        .replace(/(?<!\*)\*(?!\*)/g, '')
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove link syntax, keep text
                      const wordCount = cleanPart.split(/\s+/).filter(w => w.length > 0).length;

                      let result;
                      if (linkMatch) {
                        const linkText = linkMatch[1];
                        const url = linkMatch[2];
                        result = (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {renderTextWithHighlight(linkText, currentOffset)}
                          </a>
                        );
                      } else if (part.startsWith('**') && part.endsWith('**')) {
                        const innerText = part.slice(2, -2);
                        result = <strong key={i} className="font-semibold">{renderTextWithHighlight(innerText, currentOffset)}</strong>;
                      } else if (part.startsWith('__') && part.endsWith('__')) {
                        const innerText = part.slice(2, -2);
                        result = <u key={i}>{renderTextWithHighlight(innerText, currentOffset)}</u>;
                      } else if (part.match(/^(?<!\*)\*(?!\*)([^*]+)\*(?!\*)$/)) {
                        const innerText = part.slice(1, -1);
                        result = <em key={i}>{renderTextWithHighlight(innerText, currentOffset)}</em>;
                      } else {
                        result = <span key={i}>{renderTextWithHighlight(part, currentOffset)}</span>;
                      }

                      currentOffset += wordCount;
                      return result;
                    });
                  };

                  // Check if text contains bullet points or newlines
                  const lines = text.split('\n');
                  const hasBullets = lines.some(line => /^[•\-]\s/.test(line.trim()));
                  const hasMultipleLines = lines.filter(line => line.trim()).length > 1;

                  if (hasBullets || hasMultipleLines) {
                    // Render with bullet point formatting or multi-line formatting
                    let currentWordOffset = wordsBeforeThisSection;

                    return (
                      <div className="mb-6">
                        {lines.map((line, idx) => {
                          const trimmedLine = line.trim();
                          if (/^[•\-]\s/.test(trimmedLine)) {
                            // This is a bullet point line
                            const bulletText = trimmedLine.replace(/^[•\-]\s+/, '');
                            // Calculate word count for this bullet
                            const cleanBulletText = bulletText
                              .replace(/\*\*/g, '')
                              .replace(/__/g, '')
                              .replace(/(?<!\*)\*(?!\*)/g, '')
                              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove link syntax, keep text
                            const bulletWordCount = cleanBulletText.split(/\s+/).filter(w => w.length > 0).length;

                            const element = (
                              <div key={idx} className="flex items-start gap-2 mb-1">
                                <span className="text-black mt-1">•</span>
                                <span className="text-base leading-relaxed flex-1">
                                  {renderTextWithBold(bulletText, currentWordOffset)}
                                </span>
                              </div>
                            );

                            currentWordOffset += bulletWordCount;
                            return element;
                          } else if (trimmedLine) {
                            // Regular text line
                            const cleanLineText = line
                              .replace(/\*\*/g, '')
                              .replace(/__/g, '')
                              .replace(/(?<!\*)\*(?!\*)/g, '')
                              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove link syntax, keep text
                            const lineWordCount = cleanLineText.split(/\s+/).filter(w => w.length > 0).length;

                            const element = (
                              <p key={idx} className="text-base leading-relaxed mb-2">
                                {renderTextWithBold(line, currentWordOffset)}
                              </p>
                            );

                            currentWordOffset += lineWordCount;
                            return element;
                          } else if (hasMultipleLines) {
                            // Empty line - render as spacing between paragraphs
                            return <div key={idx} className="h-2"></div>;
                          }
                          return null;
                        })}
                      </div>
                    );
                  }

                  return (
                    <p className="text-base leading-relaxed mb-6">
                      {renderTextWithBold(text, wordsBeforeThisSection)}
                    </p>
                  );
                }

                if (section.content_type === 'image') {
                  const imageData = section.content || {};
                  const widthClass =
                    imageData.width === 'small' ? 'max-w-sm' :
                    imageData.width === 'medium' ? 'max-w-md' :
                    imageData.width === 'large' ? 'max-w-lg' :
                    imageData.width === 'xl' ? 'max-w-xl' :
                    imageData.width === '2xl' ? 'max-w-2xl' :
                    imageData.width === 'full' ? 'max-w-full' :
                    'max-w-lg'; // default to large if not specified
                  return (
                    <div className="my-8 flex flex-col items-center">
                      <img
                        src={imageData.url}
                        alt={imageData.alt || section.title}
                        className={`${widthClass} rounded-lg shadow-lg`}
                      />
                      {imageData.caption && (
                        <p className="text-sm text-gray-600 mt-2 italic">{imageData.caption}</p>
                      )}
                    </div>
                  );
                }

                if (section.content_type === 'youtube') {
                  const videoData = section.content || {};
                  const videoId = videoData.videoId;
                  return (
                    <div className="my-8">
                      {videoData.title && (
                        <h3 className="text-xl font-bold mb-4">{videoData.title}</h3>
                      )}
                      <div className="aspect-w-16 aspect-h-9">
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}${videoData.startTime ? `?start=${videoData.startTime}` : ''}`}
                          title={videoData.title || 'YouTube video'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-96 rounded-lg shadow-lg"
                        />
                      </div>
                    </div>
                  );
                }

                if (section.content_type === 'list') {
                  const listData = section.content || {};
                  const ListTag = listData.type === 'ordered' ? 'ol' : 'ul';
                  const listClass = listData.type === 'ordered' ? 'list-decimal list-inside' : 'list-disc list-inside';
                  return (
                    <ListTag className={`${listClass} space-y-3 mb-6`}>
                      {(listData.items || []).map((item, idx) => (
                        <li key={idx} className="text-base leading-relaxed">{item}</li>
                      ))}
                    </ListTag>
                  );
                }

                if (section.content_type === 'bulletlist') {
                  const items = section.content?.items || [];
                  return (
                    <ul className="list-disc list-inside space-y-2 mb-6">
                      {items.map((item, idx) => (
                        <li key={idx} className="text-base leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  );
                }

                // Legacy content structure support
                if (section.content && typeof section.content === 'object') {
                  return (
                    <div className="prose prose-lg max-w-none">
                      {/* Main description */}
                      {section.content.description && (
                        <p className="text-lg leading-relaxed mb-6">{section.content.description}</p>
                      )}

                      {/* Bullet points */}
                      {section.content.points && Array.isArray(section.content.points) && (
                        <ul className="space-y-4 mb-6">
                          {section.content.points.map((point, idx) => (
                            <li key={idx} className="text-base leading-relaxed">
                              <strong className="font-bold">{point.title}</strong> {point.description}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Subsections */}
                      {section.content.subsections && Array.isArray(section.content.subsections) && (
                        <div className="space-y-6">
                          {section.content.subsections.map((subsection, idx) => (
                            <div key={idx}>
                              <h3 className="text-xl font-bold mb-4">{subsection.title}</h3>
                              {subsection.description && <p className="text-base leading-relaxed mb-4">{subsection.description}</p>}
                              {subsection.list && (
                                <ol className="list-decimal list-inside space-y-3">
                                  {subsection.list.map((item, itemIdx) => (
                                    <li key={itemIdx} className="text-base leading-relaxed">
                                      {item.text && <span>{item.text} </span>}
                                      {item.highlight && <strong className="font-bold">{item.highlight}</strong>}
                                      {item.detail && <span> {item.detail}</span>}
                                    </li>
                                  ))}
                                </ol>
                              )}
                              {subsection.image && (
                                <div className="my-6 flex justify-center">
                                  <img src={subsection.image} alt={subsection.title} className="max-w-md rounded-lg" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Images */}
                      {section.content.image && (
                        <div className="my-8 flex justify-center">
                          <img src={section.content.image} alt={section.title} className="max-w-lg rounded-lg shadow-lg" />
                        </div>
                      )}
                    </div>
                  );
                }

                // Fallback to plain text
                return <p className="text-base leading-relaxed">{section.content || section.content_text || 'No content available for this section.'}</p>;
              };

              return (
                <div
                  key={section.id || sectionIdx}
                  className="section-content"
                  ref={(el) => (sectionRefs.current[sectionIdx] = el)}
                  data-section-index={sectionIdx}
                >
                  {/* Don't show auto-generated titles like "Section 1", "Section 2", etc. */}
                  {/* Headings render their own titles within the content */}
                  {renderContent()}
                </div>
              );
            })}

            {/* Lesson Rating - positioned at bottom left */}
            <div className="mt-6 mb-4">
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={() => handleRating(true)}
                  className="flex items-center justify-center transition"
                  style={{
                    color: lessonRating === true ? '#EF0B72' : '#6B7280',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (lessonRating !== true) {
                      e.currentTarget.style.color = '#EF0B72';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (lessonRating !== true) {
                      e.currentTarget.style.color = '#6B7280';
                    }
                  }}
                  title="I liked this lesson"
                >
                  <ThumbsUp size={18} fill="none" strokeWidth={2} />
                </button>
                <button
                  onClick={() => handleRating(false)}
                  className="flex items-center justify-center transition"
                  style={{
                    color: lessonRating === false ? '#EF0B72' : '#6B7280',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (lessonRating !== false) {
                      e.currentTarget.style.color = '#EF0B72';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (lessonRating !== false) {
                      e.currentTarget.style.color = '#6B7280';
                    }
                  }}
                  title="I didn't like this lesson"
                >
                  <ThumbsDown size={18} fill="none" strokeWidth={2} />
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 px-16 py-6 flex items-center justify-center gap-4" style={{ zIndex: 10 }}>
          {/* Gradient blur backdrop */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)',
            zIndex: 1
          }}></div>

          {/* White overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white pointer-events-none" style={{ zIndex: 2 }}></div>

          {/* Content */}
          <div className="relative z-10 flex items-center justify-center gap-2 w-full" style={{ zIndex: 20 }}>
          <button
            onClick={handleReadAloud}
            className="rounded-lg flex items-center justify-center transition text-white"
            style={{
              backgroundColor: isReading ? '#D10A64' : '#EF0B72',
              width: '43px',
              height: '43px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D10A64'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isReading ? '#D10A64' : '#EF0B72'}
          >
            {isReading ? (
              <Pause size={18} className="text-white" fill="white" />
            ) : (
              <Volume2 size={18} className="text-white" />
            )}
          </button>
          <button
            onClick={handleContinue}
            className="text-white font-semibold rounded-lg transition"
            style={{
              backgroundColor: '#EF0B72',
              paddingLeft: '43px',
              paddingRight: '43px',
              paddingTop: '11px',
              paddingBottom: '11px',
              fontSize: '15px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D10A64'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF0B72'}
          >
            Continue
          </button>
          <button
            onClick={handleOpenFlashcards}
            className="rounded-lg flex items-center justify-center transition text-white"
            style={{
              backgroundColor: '#EF0B72',
              width: '43px',
              height: '43px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D10A64'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF0B72'}
          >
            <FileText size={18} className="text-white" />
          </button>
          </div>
        </div>
      </div>

      {/* Upgrade to Ad-Free Modal */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseUpgradeModal}
        >
          <div className="relative">
            <div
              className="bg-white relative flex"
              style={{
                width: '850px',
                height: '65vh',
                minHeight: '100px',
                padding: '0px',
                animation: isClosingModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                overflow: 'hidden'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseUpgradeModal}
                className="absolute top-6 right-6 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Left side - Features section (fixed) */}
              <div style={{ width: '45.6%' }} className="bg-black p-8 flex flex-col justify-center">
                <div style={{ marginTop: '-50px' }}>
                <h3 className="text-white text-2xl font-medium" style={{ animation: 'fadeIn 1.5s ease-out', animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards', lineHeight: '1', marginBottom: '1.8rem' }}>
                  <span className="font-light text-lg">For just 99p a week,</span><br />
                  <span className="text-pink-500" style={{ fontSize: '1.4rem' }}>get exclusive access to:</span>
                </h3>

                <div className="space-y-4">
                  {/* Office Hours feature */}
                  <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '2s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-0">Office Hours</h4>
                      <p className="text-white text-sm opacity-90 m-0" style={{ marginTop: '-3px' }}>Get personalised support from<br />course leaders when you need it.</p>
                    </div>
                  </div>

                  {/* Ad-free feature */}
                  <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '3.0s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-0">Completely Ad-Free</h4>
                      <p className="text-white text-sm opacity-90 m-0" style={{ marginTop: '-3px' }}>Learn without distractions with<br />a completely ad-free experience.</p>
                    </div>
                  </div>

                  {/* Weekly Handpicked Roles feature */}
                  <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 1.5s ease-out', animationDelay: '4s', opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="bg-white rounded p-1.5 flex-shrink-0" style={{ transform: 'scale(0.8)' }}>
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg mb-0">Weekly Handpicked Roles</h4>
                      <p className="text-white text-sm opacity-90 m-0" style={{ marginTop: '-3px' }}>We'll send you the top career<br />opportunities to you every week.</p>
                    </div>
                  </div>

                  {/* Billing info */}
                  <p className="text-white text-sm mt-6" style={{ animation: 'fadeIn 1.5s ease-out', animationDelay: '6.0s', opacity: 0, animationFillMode: 'forwards' }}>
                    Billed monthly. Cancel anytime.
                  </p>
                </div>
                </div>
              </div>

              {/* Right side - Stripe checkout (scrollable) */}
              <div style={{ width: '54.4%', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="relative overflow-y-auto">
                <div
                  key={clientSecret}
                  ref={checkoutRef}
                  style={{
                    minHeight: '350px',
                    paddingTop: '10px',
                    paddingBottom: '10px'
                  }}
                >
                  {/* Stripe Checkout will be mounted here */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LinkedIn Modal */}
      {showLinkedInModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingLinkedInModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseLinkedInModal}
        >
          <div className="relative w-full px-4" style={{ maxWidth: '632.5px' }}>
            {/* Title above the box */}
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>Add to LinkedIn</h2>

            {/* Modal Card - Entire card is clickable */}
            <div
              className="bg-white text-black relative cursor-pointer hover:opacity-95 transition"
              style={{
                animation: isClosingLinkedInModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
                padding: '2rem'
              }}
              onClick={handleAddToLinkedIn}
            >
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseLinkedInModal();
                }}
                className="absolute top-4 right-4 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Content */}
              <div className="text-center">
                <p className="text-black mb-6">
                  Congratulations, you've completed your first lesson!<br />
                  Add to your LinkedIn to showcase your progress.
                </p>

                {/* Image */}
                <div className="mb-6">
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/Screenshot%202025-10-16%20at%2022.16.20.png"
                    alt="Add to LinkedIn"
                    className="w-full h-auto rounded-lg"
                  />
                </div>

                {/* Add to LinkedIn Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToLinkedIn();
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-black font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  Add to
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/LI-Logo.png"
                    alt="LinkedIn"
                    className="h-5"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Check Modal */}
      <KnowledgeCheck
        isOpen={showKnowledgeCheck}
        onClose={handleKnowledgeCheckClose}
        onPass={handleKnowledgeCheckPass}
        lessonContext={currentLessonSections.length > 0 ? `
Lesson: ${lessonName}
Module: ${currentModule}

Sections:
${currentLessonSections.map(section => `
Title: ${section.title}
Content: ${typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
`).join('\n---\n')}
        `.trim() : ''}
        lessonName={lessonName}
        moduleNum={currentModule}
        lessonNum={currentLesson}
        userId={user?.id}
        firstName={firstName}
        userRole={userRole}
        nextLessonName={(() => {
          const allLessons = [...lessonsMetadata].sort((a, b) => {
            if (a.module_number !== b.module_number) return a.module_number - b.module_number;
            return a.lesson_number - b.lesson_number;
          });
          const currentIndex = allLessons.findIndex(l => l.module_number === currentModule && l.lesson_number === currentLesson);
          return currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1].lesson_name : null;
        })()}
      />

      {/* Flashcards Modal */}
      {showFlashcards && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: isClosingFlashcards ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseFlashcards}
        >
          <div className="relative">
            {/* Title above the box */}
            <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
              Flashcards
            </h2>

            <div
              className="bg-white relative flex flex-col"
              style={{
                width: '600px',
                height: '450px',
                animation: isClosingFlashcards ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
                borderRadius: '0.3rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleCloseFlashcards}
                className="absolute top-6 right-6 text-gray-600 hover:text-black z-10"
              >
                <X size={24} />
              </button>

              {/* Flashcard content */}
              {isLoadingFlashcards ? (
                <div className="flex-1 flex items-center justify-center px-8 py-8">
                  {lottieData ? (
                    <Lottie
                      animationData={lottieData}
                      loop={true}
                      autoplay={true}
                      style={{ width: 150, height: 150 }}
                    />
                  ) : (
                    <p className="text-gray-500">Loading flashcards...</p>
                  )}
                </div>
              ) : flashcardError ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
                  <p className="text-red-500 text-center mb-4">{flashcardError}</p>
                  <button
                    onClick={handleOpenFlashcards}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : flashcards.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-8">
                  <p className="text-gray-500 text-center mb-2">No flashcards available for this lesson yet.</p>
                  <p className="text-gray-400 text-sm text-center">Check back later or contact your instructor.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center px-8 pb-4" style={{ paddingTop: '1px' }}>
                  {/* Card counter and navigation buttons */}
                  <div className="flex items-center gap-3 w-full mb-4">
                    <button
                      onClick={handlePreviousFlashcard}
                      disabled={currentFlashcardIndex === 0}
                      className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <button
                      onClick={handleNextFlashcard}
                      disabled={currentFlashcardIndex === flashcards.length - 1}
                      className="px-3 py-1.5 text-sm text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      style={{
                        backgroundColor: '#EF0B72'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D10A64'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF0B72'}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                    <div className="text-sm text-gray-500">
                      {currentFlashcardIndex + 1} / {flashcards.length}
                    </div>
                  </div>

                  {/* Flashcard */}
                  <div
                    onClick={handleFlipFlashcard}
                    className="w-full cursor-pointer select-none"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      height: '306px'
                    }}
                  >
                    <div className="relative w-full h-full">
                      {/* Question */}
                      {!isFlashcardFlipped && (
                        <div
                          className="w-full h-full rounded-lg px-12 py-6"
                          style={{
                            backgroundColor: '#7c3aed'
                          }}
                        >
                          <div className="flex flex-col h-full">
                            <p className="text-xl font-semibold text-white mb-4 text-left">Question</p>
                            <div className="flex-1 flex items-start justify-start pt-2">
                              <p className="text-lg font-medium text-white text-left">
                                {flashcards[currentFlashcardIndex].question}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Answer */}
                      {isFlashcardFlipped && (
                        <div
                          className="w-full h-full bg-black rounded-lg px-4 py-6"
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto px-2 py-4">
                              <div className="text-base text-white space-y-2 w-full">
                                {flashcards[currentFlashcardIndex].answer.split('\n').map((line, idx) => {
                                  if (line.trim().startsWith('•')) {
                                    const content = line.trim().substring(1).trim();
                                    // Parse bold text
                                    const parts = content.split(/(\*\*[^*]+\*\*)/g);
                                    return (
                                      <div key={idx} className="flex gap-2">
                                        <span className="flex-shrink-0" style={{ color: '#EF0B72' }}>•</span>
                                        <span className="text-left flex-1">
                                          {parts.map((part, i) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                              return <strong key={i}>{part.slice(2, -2)}</strong>;
                                            }
                                            return part;
                                          })}
                                        </span>
                                      </div>
                                    );
                                  } else if (line.trim()) {
                                    return <p key={idx} className="mt-3 text-center">{line}</p>;
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Click to reveal/hide text below flashcard */}
                  <p className="text-xs text-gray-500 mt-2 text-left w-full">
                    {isFlashcardFlipped ? 'Click to hide' : 'Click to reveal'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Explanation Popup */}
      {hoveredExplanation && (() => {
        const explanation = explainedSections.find(s => s.id === hoveredExplanation)?.explanation;

        // Calculate final position
        const popupWidth = 400;
        let finalX = popupPosition.x;

        // Ensure popup doesn't overflow horizontally
        const halfWidth = popupWidth / 2;
        if (finalX - halfWidth < 10) {
          finalX = halfWidth + 10;
        } else if (finalX + halfWidth > window.innerWidth - 10) {
          finalX = window.innerWidth - halfWidth - 10;
        }

        return (
          <div
            data-popup-notes
            className="fixed rounded shadow-xl p-4 z-50"
            style={{
              left: `${finalX}px`,
              top: popupPosition.preferAbove ? 'auto' : `${popupPosition.y + 10}px`,
              bottom: popupPosition.preferAbove ? `${window.innerHeight - popupPosition.y + 10}px` : 'auto',
              transform: 'translateX(-50%)',
              maxHeight: '500px',
              width: '400px',
              overflowY: 'auto',
              backgroundColor: '#fce7f3',
              color: '#000',
              pointerEvents: 'auto'
            }}
            onMouseEnter={() => {
              // Clear any pending close timeout
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
              setPopupLocked(true);
            }}
            onMouseLeave={() => {
              if (!isEditingExplanation) {
                setPopupLocked(false);
                // Add delay before closing
                closeTimeoutRef.current = setTimeout(() => {
                  setHoveredExplanation(null);
                }, 300);
              }
            }}
          >
            <div className="flex items-start justify-between" style={{ marginBottom: '0.3rem' }}>
              <h4 className="font-semibold text-base text-gray-800">Additional Notes</h4>
              <div className="flex gap-1">
                {!isEditingExplanation ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReadNoteAloud(explanation);
                      }}
                      className={`p-1 hover:bg-pink-200 rounded transition-colors ${isReadingNote ? 'text-pink-600' : 'text-gray-700'}`}
                      title={isReadingNote ? "Stop reading" : "Read aloud"}
                    >
                      <Volume2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(explanation);
                      }}
                      className="p-1 hover:bg-pink-200 rounded transition-colors text-gray-700"
                      title="Edit explanation"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExplanation(hoveredExplanation);
                      }}
                      className="p-1 hover:bg-pink-200 rounded transition-colors text-gray-700"
                      title="Delete explanation"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveEdit(hoveredExplanation);
                      }}
                      className="p-1 hover:bg-pink-200 rounded transition-colors text-gray-700"
                      title="Save changes"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEdit();
                      }}
                      className="p-1 hover:bg-pink-200 rounded transition-colors text-gray-700"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div
              ref={editableRef}
              contentEditable={isEditingExplanation}
              suppressContentEditableWarning
              onInput={(e) => {
                if (isEditingExplanation) {
                  setEditedExplanation(e.currentTarget.textContent);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={`text-sm leading-snug text-gray-800 focus:outline-none min-h-[100px] ${
                isEditingExplanation ? 'cursor-text' : ''
              }`}
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
            >
              {isEditingExplanation ? editedExplanation : formatExplanationText(explanation)}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LearningHub;
