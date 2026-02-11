import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const LessonSlider = ({ upcomingLessons, completedLessons, isLessonCompleted, isLessonAccessible, currentModule, currentLesson }) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const hasInitializedScrollRef = useRef(false);

  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [snappedCardIndex, setSnappedCardIndex] = useState(0);
  const [isCarouselReady, setIsCarouselReady] = useState(false);
  const [enableSmoothScroll, setEnableSmoothScroll] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const getCardWidth = useCallback((lesson) => {
    const isCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
    const firstIncompleteIndex = upcomingLessons.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
    const isCurrent = upcomingLessons.indexOf(lesson) === firstIncompleteIndex;
    return (isCompleted || isCurrent) ? 400 : 346.06;
  }, [upcomingLessons, isLessonCompleted]);

  // Scroll handlers
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
    const walk = (x - scrollStartX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleScrollMouseUp = () => setIsScrolling(false);
  const handleScrollMouseLeave = () => setIsScrolling(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current || upcomingLessons.length === 0) return;
    const scrollPosition = scrollContainerRef.current.scrollLeft;
    const gap = 16;
    let cumulativeWidth = 0;
    let index = 0;

    for (let i = 0; i < upcomingLessons.length; i++) {
      const cardWidth = getCardWidth(upcomingLessons[i]);
      if (scrollPosition < cumulativeWidth + cardWidth / 2) {
        index = i;
        break;
      }
      cumulativeWidth += cardWidth + gap;
      if (i === upcomingLessons.length - 1) index = i;
    }

    setSnappedCardIndex(index);
  };

  const scrollToCurrentLesson = () => {
    if (!scrollContainerRef.current || upcomingLessons.length === 0) return;
    const currentLessonIndex = upcomingLessons.findIndex(
      lesson => !isLessonCompleted(lesson.module_number, lesson.lesson_number)
    );
    if (currentLessonIndex === -1) return;

    const gap = 16;
    let scrollPosition = 0;
    for (let i = 0; i < currentLessonIndex; i++) {
      scrollPosition += getCardWidth(upcomingLessons[i]) + gap;
    }

    scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    setSnappedCardIndex(currentLessonIndex);
  };

  // Initial scroll to current lesson
  useEffect(() => {
    if (hasInitializedScrollRef.current || !scrollContainerRef.current || upcomingLessons.length === 0) return;

    const currentLessonIndex = upcomingLessons.findIndex(
      lesson => !isLessonCompleted(lesson.module_number, lesson.lesson_number)
    );

    hasInitializedScrollRef.current = true;

    if (currentLessonIndex !== -1) {
      const container = scrollContainerRef.current;
      const gap = 16;
      let scrollPosition = 0;
      for (let i = 0; i < currentLessonIndex; i++) {
        scrollPosition += getCardWidth(upcomingLessons[i]) + gap;
      }
      container.scrollLeft = scrollPosition;
      setSnappedCardIndex(currentLessonIndex);
    } else {
      setSnappedCardIndex(0);
    }

    setTimeout(() => {
      setIsCarouselReady(true);
      setEnableSmoothScroll(true);
    }, 50);
  }, [upcomingLessons, isLessonCompleted, getCardWidth]);

  // Dynamic title based on snapped card
  const snappedLesson = upcomingLessons[snappedCardIndex];
  const snappedIsCompleted = snappedLesson ? isLessonCompleted(snappedLesson.module_number, snappedLesson.lesson_number) : false;
  const firstIncompleteIndex = upcomingLessons.findIndex(l => !isLessonCompleted(l.module_number, l.lesson_number));
  const isCurrentLessonCard = snappedCardIndex === firstIncompleteIndex;
  const titleLabel = snappedIsCompleted ? 'Completed Lesson' : isCurrentLessonCard ? 'Current Lesson' : 'Upcoming Lesson';

  // Back to current lesson button logic
  const allLessonsCompleted = completedLessons.length === upcomingLessons.length && upcomingLessons.length > 0;
  const isNotViewingCurrentLesson = snappedCardIndex !== firstIncompleteIndex;
  const isViewingCompletedLesson = snappedCardIndex < firstIncompleteIndex;
  const showBackButton = isNotViewingCurrentLesson && !allLessonsCompleted;

  return (
    <div className="relative" style={{ marginTop: '1.5rem', minHeight: '160px' }}>
      <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '0.05rem', position: 'relative', height: '1.5em' }}>
        {['Completed Lesson', 'Current Lesson', 'Upcoming Lesson'].map((label) => (
          <span
            key={label}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: label === titleLabel ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          >
            {label}
          </span>
        ))}
      </h2>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-hidden select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollBehavior: enableSmoothScroll ? 'smooth' : 'auto',
          WebkitOverflowScrolling: 'touch',
          cursor: isScrolling ? 'grabbing' : 'grab',
          scrollSnapType: 'x mandatory',
          scrollSnapStop: 'always',
          scrollPaddingLeft: '0px',
          willChange: 'scroll-position',
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
        <div
          className="flex gap-4"
          style={{
            minHeight: '7rem',
            height: '7rem',
            paddingRight: containerWidth > 0 ? `${Math.max(0, containerWidth - 400 - 16)}px` : '0px'
          }}
        >
          {upcomingLessons.length > 0 ? (
            upcomingLessons.map((lesson, index) => {
              const isCompleted = isLessonCompleted(lesson.module_number, lesson.lesson_number);
              const isCurrentLesson = index === firstIncompleteIndex;
              const cardWidth = (isCompleted || isCurrentLesson) ? 400 : 346.06;

              return (
                <div
                  key={`${lesson.module_number}-${lesson.lesson_number}`}
                  className="relative flex items-center gap-3"
                  style={{
                    width: `${cardWidth}px`,
                    minWidth: `${cardWidth}px`,
                    flexShrink: 0,
                    paddingTop: '5.618px',
                    paddingRight: '5.618px',
                    paddingBottom: '5.618px',
                    paddingLeft: '14px',
                    borderRadius: '0.3rem',
                    background: '#7714E0',
                    height: '7rem',
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always'
                  }}
                >
                  {/* Opacity overlay for non-snapped cards */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: index !== snappedCardIndex ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
                      backdropFilter: index !== snappedCardIndex ? 'blur(0.75px)' : 'blur(0px)',
                      WebkitBackdropFilter: index !== snappedCardIndex ? 'blur(0.75px)' : 'blur(0px)',
                      borderRadius: '0.3rem',
                      pointerEvents: 'none',
                      transition: 'background-color 0.3s ease-in-out, backdrop-filter 0.3s ease-in-out'
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold truncate text-white" style={{ marginBottom: '3px', fontSize: '1rem' }}>
                      {lesson.lesson_name || `Lesson ${lesson.lesson_number}`}
                    </h4>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.01rem' }}>
                      {(lesson.bullet_points || []).slice(0, 3).map((bulletPoint, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-purple-100" style={{ fontSize: '1rem' }}>
                          <span className="mt-0.5 text-purple-200">•</span>
                          <span>{bulletPoint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {(isCompleted || isCurrentLesson) && (
                    <button
                      className="bg-white text-black font-bold hover:bg-purple-50 transition-colors flex-shrink-0 group"
                      style={{
                        width: '48px', height: '48px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '0.3rem', marginRight: '10px'
                      }}
                      onClick={() => navigate(`/learning?module=${lesson.module_number}&lesson=${lesson.lesson_number}`)}
                    >
                      <svg className="group-hover:stroke-pink-500 transition-colors" width="26" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex-1 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center" style={{ padding: '7.398px' }}>
              <p className="text-purple-200 text-sm">No lesson data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Back to Current Lesson Button */}
      <button
        onClick={scrollToCurrentLesson}
        className="absolute bg-white text-black hover:bg-purple-50"
        style={{
          right: '16px',
          top: '50%',
          transform: 'translateY(calc(-50% - 5px))',
          width: '40px', height: '40px',
          borderRadius: '0.3rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10,
          opacity: showBackButton ? 0.7 : 0,
          pointerEvents: showBackButton ? 'auto' : 'none',
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            position: 'absolute',
            opacity: isViewingCompletedLesson ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            position: 'absolute',
            opacity: isViewingCompletedLesson ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
};

export default LessonSlider;
