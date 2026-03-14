import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Lottie from 'lottie-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAnimation } from '../../contexts/AnimationContext';
import LoadingScreen from '../LoadingScreen';
import useLessonData from './hooks/useLessonData';
import useLessonNavigation from './hooks/useLessonNavigation';
import LessonHeader from './components/LessonHeader';
import ContentRenderer from './components/ContentRenderer';
import MediaPanel from './components/MediaPanel';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import useChat from './hooks/useChat';
import Footer from '../Footer';

// Group text sections by h2 headings — each h2 starts a new group
const groupSectionsByHeading = (sections) => {
  const groups = [];
  let currentGroup = [];

  sections.forEach((section) => {
    const level = section.content?.level || 2;
    const isHeading = section.content_type === 'heading' && (level === 2 || level === 3);
    if (isHeading && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(section);
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

const LearningHubV2 = () => {
  const { firstName } = useAuth();
  const { lottieData } = useAnimation();
  const [chatInput, setChatInput] = useState('');
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const contentScrollRef = useRef(null);
  const sectionRefs = useRef([]);
  const groupRefs = useRef([]);
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);
  const chatInputRef = useRef(null);

  // Start logo animation after a short delay (matches ProgressHubV2 behavior)
  useEffect(() => {
    const timer = setTimeout(() => {
      lottieRef.current?.play();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Chat
  const {
    chatMessages,
    isTyping,
    displayedText,
    typingMessageIndex,
    sendMessage,
    resetChat,
  } = useChat();

  // Data fetching
  const {
    loading,
    groupedLessons,
    lessonsMetadata,
    completedLessons,
    userCourseId,
    userCourseName,
  } = useLessonData();

  // Navigation
  const {
    currentModule,
    currentLesson,
    currentLessonSections,
    lessonName,
    globalLessonNumber,
    isLessonCompleted,
    goToNextLesson,
  } = useLessonNavigation({ groupedLessons, lessonsMetadata, completedLessons });

  // Build lesson context for AI chat
  const buildLessonContext = useCallback(() => {
    if (!currentLessonSections || currentLessonSections.length === 0) return '';
    return `Lesson: ${lessonName}\nModule: ${currentModule}\n\nSections:\n${currentLessonSections.map(section => `\nTitle: ${section.title}\nContent: ${typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}\n`).join('\n---\n')}`.trim();
  }, [currentLessonSections, lessonName, currentModule]);

  const handleChatSubmit = useCallback((text) => {
    const lessonContext = buildLessonContext();
    sendMessage(text, lessonContext);
    setChatInput('');
    window.getSelection()?.removeAllRanges();
  }, [buildLessonContext, sendMessage]);

  // Text selection → "Explain '...'" in chat input
  const handleSelectionRef = useRef(null);
  handleSelectionRef.current = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const anchorNode = selection?.anchorNode;
    const isInputSelection = anchorNode?.parentElement?.tagName === 'INPUT' ||
      anchorNode?.parentElement?.tagName === 'TEXTAREA' ||
      anchorNode?.parentElement?.isContentEditable;

    if (isInputSelection) return;

    if (text && text.length > 0) {
      setChatInput(`Explain '${text}'`);
    } else if (chatInput.startsWith('Explain \'')) {
      setChatInput('');
    }
  };

  useEffect(() => {
    const listener = () => handleSelectionRef.current?.();
    document.addEventListener('selectionchange', listener);
    return () => document.removeEventListener('selectionchange', listener);
  }, []);

  // Filter sections into text (left) and media (right)
  const textSections = useMemo(() => {
    if (!Array.isArray(currentLessonSections)) return [];
    return currentLessonSections.filter(s => s.content_type !== 'image' && s.content_type !== 'youtube');
  }, [currentLessonSections]);

  // Group text sections by h2 headings
  const sectionGroups = useMemo(() => groupSectionsByHeading(textSections), [textSections]);
  const totalGroups = sectionGroups.length;
  const isLastGroup = currentGroupIndex >= totalGroups - 1;
  const activeGroup = sectionGroups[currentGroupIndex] || [];
  const lessonProgress = totalGroups > 1 ? ((currentGroupIndex + 1) / totalGroups) * 100 : 100;

  // If current group starts with H3, find the parent H2 to display above it
  const parentH2 = useMemo(() => {
    const firstSection = activeGroup[0];
    if (!firstSection) return null;
    const level = firstSection.content?.level || 2;
    if (firstSection.content_type !== 'heading' || level === 2) return null;
    // Look backwards through previous groups for the most recent H2
    for (let i = currentGroupIndex - 1; i >= 0; i--) {
      const group = sectionGroups[i];
      for (let j = group.length - 1; j >= 0; j--) {
        if (group[j].content_type === 'heading' && (group[j].content?.level || 2) === 2) {
          return group[j];
        }
      }
    }
    return null;
  }, [sectionGroups, currentGroupIndex, activeGroup]);

  // Sequential typing — track how many sections have finished animating
  const [completedSections, setCompletedSections] = useState(0);
  const allTypingComplete = completedSections >= activeGroup.length;
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    if (allTypingComplete) {
      const timer = setTimeout(() => setShowButtons(true), 500);
      return () => clearTimeout(timer);
    }
    setShowButtons(false);
  }, [allTypingComplete, currentGroupIndex]);

  const handleSectionComplete = useCallback(() => {
    setCompletedSections((prev) => prev + 1);
  }, []);

  // Get suggested question from the current group's H2 heading
  const suggestedQuestion = useMemo(() => {
    const h2Section = activeGroup.find(
      s => s.content_type === 'heading' && (s.content?.level || 2) === 2
    );
    return h2Section?.suggested_question?.trim() || null;
  }, [activeGroup]);

  // Auto-scroll content area when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0 || isTyping) {
      setTimeout(() => {
        if (contentScrollRef.current) {
          contentScrollRef.current.scrollTop = contentScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [chatMessages, displayedText, isTyping]);

  // Check if the last assistant message just finished typing
  const lastAssistantDone = useMemo(() => {
    if (chatMessages.length === 0) return true;
    const last = chatMessages[chatMessages.length - 1];
    return last.type === 'user' || last.isComplete;
  }, [chatMessages]);

  // Delayed fade-in for post-chat buttons (same 500ms delay as initial buttons)
  const [showPostChatButtons, setShowPostChatButtons] = useState(false);
  useEffect(() => {
    if (chatMessages.length > 0 && lastAssistantDone) {
      const timer = setTimeout(() => setShowPostChatButtons(true), 500);
      return () => clearTimeout(timer);
    }
    setShowPostChatButtons(false);
  }, [chatMessages, lastAssistantDone]);

  // Reset chat when lesson changes
  // Reset to first group when lesson changes
  useEffect(() => {
    setCurrentGroupIndex(0);
    resetChat();
  }, [currentModule, currentLesson]);

  // Handle Continue — replace current group with the next one
  const handleContinue = useCallback(() => {
    setCompletedSections(0);
    setCurrentGroupIndex((prev) => prev + 1);
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    chatInputRef.current?.focus();
  }, []);

  // Handle Back — go to previous section group
  const handleBack = useCallback(() => {
    setCompletedSections(0);
    setCurrentGroupIndex((prev) => Math.max(prev - 1, 0));
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    chatInputRef.current?.focus();
  }, []);

  if (loading) {
    return <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />;
  }

  return (
    <div className="bg-white">
      {/* Main two-column layout — 100vh */}
      <div className="h-screen flex">
        {/* Left column — lesson content */}
        <div className="flex-[3] flex flex-col min-h-0 relative">
          {/* Fixed header — logo, lesson label, title, pink line */}
          <div className="px-10" style={{ paddingTop: '30px', paddingBottom: '15px' }}>
            <div className="max-w-2xl">
              <a href="/progress" style={{ marginBottom: '20px', display: 'block', width: 'fit-content', marginLeft: '-9px' }}>
                {lottieData && Object.keys(lottieData).length > 0 ? (
                  <Lottie
                    lottieRef={lottieRef}
                    animationData={lottieData}
                    loop={true}
                    autoplay={false}
                    onLoopComplete={() => {
                      loopCountRef.current += 1;
                      if (loopCountRef.current % 3 === 0 && lottieRef.current) {
                        lottieRef.current.pause();
                        setTimeout(() => {
                          lottieRef.current?.goToAndPlay(0);
                        }, 4000);
                      }
                    }}
                    style={{ width: 61, height: 61 }}
                  />
                ) : (
                  <div style={{ width: 61, height: 61 }} />
                )}
              </a>

              <LessonHeader
                globalLessonNumber={globalLessonNumber}
                lessonName={lessonName}
              />
            </div>
            <div className="rounded-full" style={{ backgroundColor: '#F0F0F0', height: '5px' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${lessonProgress}%`,
                  backgroundColor: '#EF0B72',
                  transition: 'width 0.6s ease-in-out',
                }}
              />
            </div>
          </div>

          {/* Scrollable content area */}
          <div
            ref={contentScrollRef}
            className="flex-1 overflow-y-auto pb-8 hide-scrollbar"
            style={{ paddingLeft: '40px', paddingRight: '70px' }}
          >
              {/* Render sections sequentially — each starts typing after the previous finishes */}
              <div key={currentGroupIndex}>
                {parentH2 && (
                  <div className="mt-0 mb-3">
                    <h2 className="text-xl" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                      {parentH2.content?.text || parentH2.title}
                    </h2>
                  </div>
                )}
                {activeGroup.slice(0, completedSections + 1).map((section, sIdx) => (
                  <div key={section.id || sIdx}>
                    <ContentRenderer
                      section={section}
                      sectionIdx={sIdx}
                      isActive={sIdx === completedSections}
                      prevSectionType={sIdx > 0 ? activeGroup[sIdx - 1]?.content_type : null}
                      onComplete={handleSectionComplete}
                    />
                  </div>
                ))}
              </div>

              {/* Action area — buttons crossfade with chat messages at the same position */}
              <div className="mt-4 mb-4">
                {/* Navigation buttons — fade out when chat is active */}
                {allTypingComplete && (!isLastGroup || currentGroupIndex > 0) && (
                  <div
                    className="flex items-center gap-2"
                    style={{
                      opacity: showButtons && chatMessages.length === 0 ? 1 : 0,
                      transition: 'opacity 0.25s ease-in',
                      height: chatMessages.length > 0 ? 0 : 'auto',
                      overflow: 'hidden',
                    }}
                  >
                    {!isLastGroup && (
                      <button
                        onClick={handleContinue}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        Continue
                      </button>
                    )}
                    <div className="flex items-center">
                      {currentGroupIndex > 0 && (
                        <button
                          onClick={handleBack}
                          className="p-2 text-black cursor-pointer transition-colors"
                          style={{ transition: 'color 0.15s' }}
                          aria-label="Back"
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => { /* TODO: Phase 4 — wire to narration */ }}
                        className="p-2 text-black cursor-pointer transition-colors"
                        style={{ transition: 'color 0.15s' }}
                        aria-label="Listen to lesson"
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat messages — fade in at the same position */}
                {chatMessages.length > 0 && (
                  <div>
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={`${idx}-${msg.text?.substring(0, 20)}`}
                        style={{
                          animation: msg.type === 'user' && idx === chatMessages.length - 1 && !msg._animated
                            ? 'chatFadeIn 0.3s ease-out' : undefined,
                        }}
                      >
                        <ChatMessage
                          message={msg}
                          displayedText={displayedText}
                          isCurrentlyTyping={typingMessageIndex === idx}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Purple typing cursor while waiting for API response */}
                {isTyping && (
                  <div className="mt-3 mb-3">
                    <span
                      className="inline-block"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: '#8200EA',
                        borderRadius: 1,
                        animation: 'purplePulse 1.2s ease-in-out infinite',
                      }}
                    />
                  </div>
                )}

                {/* Buttons reappear after assistant finishes typing */}
                {chatMessages.length > 0 && lastAssistantDone && !isTyping && allTypingComplete && (!isLastGroup || currentGroupIndex > 0) && (
                  <div
                    className="flex items-center gap-2 mt-3"
                    style={{ opacity: showPostChatButtons ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
                  >
                    {!isLastGroup && (
                      <button
                        onClick={handleContinue}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        Continue
                      </button>
                    )}
                    <div className="flex items-center">
                      {currentGroupIndex > 0 && (
                        <button
                          onClick={handleBack}
                          className="p-2 text-black cursor-pointer transition-colors"
                          style={{ transition: 'color 0.15s' }}
                          aria-label="Back"
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => { /* TODO: Phase 4 — wire to narration */ }}
                        className="p-2 text-black cursor-pointer transition-colors"
                        style={{ transition: 'color 0.15s' }}
                        aria-label="Listen to lesson"
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* White gradient fade above input */}
          <div className="absolute left-0 right-0 pointer-events-none" style={{ bottom: '64px', height: '60px', zIndex: 5 }}>
            <div className="absolute inset-0" style={{
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)',
            }} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white" />
          </div>

          {/* Chat input pinned at bottom */}
          <div className="px-10 py-5 bg-white relative" style={{ zIndex: 6 }}>
            <div
              style={{
                opacity: suggestedQuestion && allTypingComplete && showButtons && chatMessages.length === 0 ? 1 : 0,
                transition: 'opacity 0.25s ease-in',
                pointerEvents: suggestedQuestion && allTypingComplete && showButtons && chatMessages.length === 0 ? 'auto' : 'none',
                height: !suggestedQuestion || chatMessages.length > 0 ? 0 : 'auto',
                overflow: 'hidden',
              }}
            >
              {suggestedQuestion && (
                <button
                  onClick={() => {
                    setChatInput(suggestedQuestion);
                    handleChatSubmit(suggestedQuestion);
                    chatInputRef.current?.focus();
                  }}
                  className="text-left text-sm text-black mb-4 cursor-pointer px-4 py-2.5 rounded-lg"
                  style={{ backgroundColor: '#F0F0F0', letterSpacing: '-0.01em', fontWeight: 300 }}
                >
                  {suggestedQuestion}
                </button>
              )}
            </div>
            <ChatInput
              ref={chatInputRef}
              value={chatInput}
              onChange={setChatInput}
              onSubmit={handleChatSubmit}
            />
          </div>
        </div>

        {/* Right column — media panel */}
        <div className="flex-[2] overflow-y-auto p-8 flex flex-col items-center justify-center" style={{ backgroundColor: '#F0F0F0' }}>
          <div className="w-full">
            <MediaPanel sections={currentLessonSections} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LearningHubV2;
