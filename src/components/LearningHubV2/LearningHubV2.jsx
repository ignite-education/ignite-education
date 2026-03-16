import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAnimation } from '../../contexts/AnimationContext';
import { markLessonComplete } from '../../lib/api';
import LoadingScreen from '../LoadingScreen';
import useLessonData from './hooks/useLessonData';
import useLessonNavigation from './hooks/useLessonNavigation';
import useNarration from './hooks/useNarration';
import { normalizeTextForNarration, splitIntoWords } from '../../utils/textNormalization';
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
  const { user, firstName } = useAuth();
  const navigate = useNavigate();
  const { lottieData } = useAnimation();
  const [chatInput, setChatInput] = useState('');
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const contentScrollRef = useRef(null);
  const contentInnerRef = useRef(null);
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

  // Text selection → "Explain '...'" in chat input
  // selectionchange updates live as user drags; mouseup saves range, focuses input, then restores highlight
  const savedRangeRef = useRef(null);
  const restoringSelectionRef = useRef(false);
  const selectionChangeRef = useRef(null);
  selectionChangeRef.current = () => {
    if (restoringSelectionRef.current) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const anchorNode = selection?.anchorNode;
    const isInputSelection = anchorNode?.parentElement?.tagName === 'INPUT' ||
      anchorNode?.parentElement?.tagName === 'TEXTAREA' ||
      anchorNode?.parentElement?.isContentEditable;
    if (isInputSelection) return;

    if (text && text.length > 0) {
      setChatInput(`Explain '${text}'`);
    } else if (chatInput.startsWith('Explain \'') && !savedRangeRef.current) {
      setChatInput('');
    }
  };

  const mouseUpRef = useRef(null);
  mouseUpRef.current = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 0 && selection.rangeCount > 0) {
      // Save the selection range before focus collapses it
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      restoringSelectionRef.current = true;
      chatInputRef.current?.focus();
      // Restore the highlight after focus
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
        restoringSelectionRef.current = false;
      });
    }
  };

  useEffect(() => {
    const onSelectionChange = () => selectionChangeRef.current?.();
    const onMouseUp = () => mouseUpRef.current?.();
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Group ALL sections (including media) by h2 headings
  const allGroups = useMemo(() => {
    if (!Array.isArray(currentLessonSections)) return [];
    return groupSectionsByHeading(currentLessonSections);
  }, [currentLessonSections]);

  const totalGroups = allGroups.length;
  const isLastGroup = currentGroupIndex >= totalGroups - 1;
  const activeGroupAll = allGroups[currentGroupIndex] || [];

  // Text sections for left column (typing animation)
  const activeGroup = useMemo(() => {
    return activeGroupAll.filter(s => s.content_type !== 'image' && s.content_type !== 'youtube' && s.content_type !== 'svg');
  }, [activeGroupAll]);

  // Media sections for right column (with persistent media support)
  const activeGroupMedia = useMemo(() => {
    const MEDIA_TYPES = ['image', 'youtube', 'svg'];

    // Walk groups 0..currentGroupIndex to find the latest persistent media set
    let persistentMedia = [];
    for (let i = 0; i <= currentGroupIndex; i++) {
      const group = allGroups[i] || [];
      const persistentInGroup = group.filter(
        s => MEDIA_TYPES.includes(s.content_type) && s.content?.persist
      );
      if (persistentInGroup.length > 0) {
        persistentMedia = persistentInGroup;
      }
    }

    // Current group's own media (persistent or not)
    const currentMedia = activeGroupAll.filter(s => MEDIA_TYPES.includes(s.content_type));

    // Merge: persistent first, then current (excluding duplicates)
    const currentIds = new Set(currentMedia.map(s => s.id));
    const carried = persistentMedia.filter(s => !currentIds.has(s.id));

    return [...carried, ...currentMedia];
  }, [activeGroupAll, allGroups, currentGroupIndex]);
  const targetProgress = totalGroups > 1 ? ((currentGroupIndex + 1) / totalGroups) * 100 : totalGroups === 1 ? 100 : 0;
  const [lessonProgress, setLessonProgress] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLessonProgress(targetProgress));
    return () => cancelAnimationFrame(frame);
  }, [targetProgress]);

  // Get suggested question from the current group's H2 heading
  const suggestedQuestion = useMemo(() => {
    const h2Section = activeGroup.find(
      s => s.content_type === 'heading' && (s.content?.level || 2) === 2
    );
    return h2Section?.suggested_question?.trim() || null;
  }, [activeGroup]);

  // Get section question (gating question) from the current group's H2 heading
  // Supports both legacy single string and new JSON array of 3 questions (picks one randomly)
  const sectionQuestion = useMemo(() => {
    const h2Section = activeGroup.find(
      s => s.content_type === 'heading' && (s.content?.level || 2) === 2
    );
    const raw = h2Section?.section_question?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(q => q && q.trim());
        if (valid.length === 0) return null;
        return valid[Math.floor(Math.random() * valid.length)];
      }
    } catch {}
    return raw; // Legacy single question string
  }, [activeGroup]);

  // Build lesson context for AI chat — only visible section group (headings + body text)
  const buildLessonContext = useCallback(() => {
    if (!activeGroup || activeGroup.length === 0) return '';
    const visibleText = activeGroup
      .filter(s => s.content_type === 'heading' || s.content_type === 'paragraph' || s.content_type === 'list' || s.content_type === 'bulletlist')
      .map(s => {
        const text = typeof s.content === 'string' ? s.content : s.content?.text || s.content_text || '';
        if (s.content_type === 'heading') return `## ${text}`;
        return text;
      })
      .join('\n\n');
    return `Lesson: ${lessonName}\nModule: ${currentModule}\n\n${visibleText}`.trim();
  }, [activeGroup, lessonName, currentModule]);

  const handleChatSubmit = useCallback((text) => {
    let lessonContext = buildLessonContext();
    // If answering a section question, prepend it to context so Claude can evaluate
    if (sectionQuestion && chatMessages.length === 0) {
      lessonContext = `SECTION QUESTION: ${sectionQuestion}\n\nThe student is answering the above question. Evaluate their answer based on the lesson content below. Give brief, encouraging feedback. If correct, confirm and add a small insight. If incorrect or incomplete, gently guide them toward the right answer.\n\n${lessonContext}`;
    }
    // If answering a user question (ungraded, per-paragraph engagement question)
    if (pendingUserQuestion && chatMessages.length === 0) {
      lessonContext = `USER QUESTION: ${pendingUserQuestion}\n\nThe student is answering the above engagement question. This is not graded. Give brief, encouraging feedback that contextualises their answer within the lesson. Keep it conversational and supportive.\n\n${lessonContext}`;
    }
    sendMessage(text, lessonContext);
    setChatInput('');
    savedRangeRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, [buildLessonContext, sendMessage, sectionQuestion, pendingUserQuestion, chatMessages.length]);

  const handleUserQuestionContinue = useCallback(() => {
    setPendingUserQuestion(null);
    setCompletedSections((prev) => prev + 1);
    resetChat();
  }, [resetChat]);

  // If current group starts with H3, find the parent H2 to display above it
  const parentH2 = useMemo(() => {
    const firstSection = activeGroup[0];
    if (!firstSection) return null;
    const level = firstSection.content?.level || 2;
    if (firstSection.content_type !== 'heading' || level === 2) return null;
    // Look backwards through previous groups for the most recent H2
    for (let i = currentGroupIndex - 1; i >= 0; i--) {
      const group = allGroups[i];
      for (let j = group.length - 1; j >= 0; j--) {
        if (group[j].content_type === 'heading' && (group[j].content?.level || 2) === 2) {
          return group[j];
        }
      }
    }
    return null;
  }, [allGroups, currentGroupIndex, activeGroup]);

  // Sequential typing — track how many sections have finished animating
  const [completedSections, setCompletedSections] = useState(0);
  const [pendingUserQuestion, setPendingUserQuestion] = useState(null);
  const activeGroupRef = useRef(activeGroup);
  activeGroupRef.current = activeGroup;

  const allTypingComplete = completedSections >= activeGroup.length && !pendingUserQuestion;

  // Narration — word highlighting & audio playback
  const {
    isReading,
    isPaused,
    audioReady,
    narrationActive,
    toggleNarration,
    contentContainerRef,
  } = useNarration({
    courseId: userCourseId,
    currentModule,
    currentLesson,
    allGroups,
    currentGroupIndex,
    allTypingComplete,
  });

  // Compute per-section word index offsets within the active group (for narration)
  const sectionWordOffsets = useMemo(() => {
    if (!narrationActive) return [];
    const offsets = [];
    let cursor = 0;
    for (const section of activeGroup) {
      offsets.push(cursor);
      const rawText = typeof section.content === 'string'
        ? section.content
        : section.content?.text || section.content_text || '';
      let text = rawText;
      if ((section.content_type === 'list' || section.content_type === 'bulletlist') && section.content?.items) {
        text = section.content.items.join(' ');
      }
      const normalized = normalizeTextForNarration(text);
      cursor += splitIntoWords(normalized).length;
    }
    return offsets;
  }, [narrationActive, activeGroup]);

  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    if (allTypingComplete) {
      const timer = setTimeout(() => setShowButtons(true), 500);
      return () => clearTimeout(timer);
    }
    setShowButtons(false);
  }, [allTypingComplete, currentGroupIndex]);

  const handleSectionComplete = useCallback(() => {
    setCompletedSections((prev) => {
      const section = activeGroupRef.current?.[prev];
      if (section?.user_question?.trim()) {
        queueMicrotask(() => setPendingUserQuestion(section.user_question.trim()));
        return prev; // Don't advance — wait for user to answer
      }
      return prev + 1;
    });
  }, []);

  // Auto-scroll: continuously lerp toward bottom of content
  const userScrolledUpRef = useRef(false);

  // Detect manual scroll-up via wheel events
  useEffect(() => {
    const onWheel = (e) => {
      if (contentScrollRef.current?.contains(e.target) && e.deltaY < 0) {
        userScrolledUpRef.current = true;
      }
    };
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    userScrolledUpRef.current = false;
  }, [currentGroupIndex]);

  // Continuous scroll loop — runs for lifetime of component
  useEffect(() => {
    let rafId;
    const tick = () => {
      const el = contentScrollRef.current;
      if (el && !userScrolledUpRef.current) {
        const target = el.scrollHeight - el.clientHeight;
        const diff = target - el.scrollTop;
        if (diff > 0.5) {
          el.scrollTop += diff * 0.08;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Check if the last assistant message just finished typing
  const lastAssistantDone = useMemo(() => {
    if (chatMessages.length === 0) return true;
    const last = chatMessages[chatMessages.length - 1];
    return last.type === 'user' || last.isComplete;
  }, [chatMessages]);

  // User question answered — Claude has responded, show Continue button
  const userQuestionAnswered = pendingUserQuestion && chatMessages.length >= 2 && lastAssistantDone && !isTyping;

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
    setPendingUserQuestion(null);
    resetChat();
  }, [currentModule, currentLesson]);

  // Handle Continue — replace current group with the next one
  const handleContinue = useCallback(() => {
    setCompletedSections(0);
    setPendingUserQuestion(null);
    setCurrentGroupIndex((prev) => prev + 1);
    resetChat();
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    chatInputRef.current?.focus();
  }, [resetChat]);

  // Handle Back — go to previous section group
  const handleBack = useCallback(() => {
    setCompletedSections(0);
    setPendingUserQuestion(null);
    setCurrentGroupIndex((prev) => Math.max(prev - 1, 0));
    resetChat();
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    chatInputRef.current?.focus();
  }, [resetChat]);

  // End Lesson — mark complete and navigate to progress hub
  const handleEndLesson = useCallback(async () => {
    try {
      await markLessonComplete(user?.id, userCourseId, currentModule, currentLesson);
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    }
    navigate('/progress');
  }, [user?.id, userCourseId, currentModule, currentLesson, navigate]);

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
                  transition: 'width 1s cubic-bezier(0.25, 0.1, 0.25, 1)',
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
            <div ref={(el) => { contentInnerRef.current = el; contentContainerRef.current = el; }}>
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
                      narrationActive={narrationActive}
                      wordIndexOffset={sectionWordOffsets[sIdx] || 0}
                    />
                  </div>
                ))}
              </div>

              {/* User question — shown after a paragraph section finishes typing, gates next section */}
              {pendingUserQuestion && chatMessages.length === 0 && (
                <div className="mt-2 mb-4" style={{ animation: 'chatFadeIn 0.3s ease-out' }}>
                  <p
                    className="text-base font-medium leading-relaxed text-black"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {pendingUserQuestion}
                  </p>
                </div>
              )}

              {/* Action area — buttons crossfade with chat messages at the same position */}
              <div className="mt-3 mb-4">
                {/* Section question prompt — shown after content finishes typing */}
                {allTypingComplete && sectionQuestion && chatMessages.length === 0 && (
                  <div
                    className="mt-2 mb-4"
                    style={{
                      opacity: showButtons ? 1 : 0,
                      transition: 'opacity 0.25s ease-in',
                    }}
                  >
                    <p
                      className="text-base font-medium leading-relaxed text-black"
                      style={{ letterSpacing: '-0.01em' }}
                    >
                      {sectionQuestion}
                    </p>
                  </div>
                )}

                {/* Navigation buttons — fade out when chat is active, hidden when section question is unanswered */}
                {allTypingComplete && !sectionQuestion && (
                  <div
                    className="flex items-center gap-2"
                    style={{
                      opacity: showButtons && chatMessages.length === 0 ? 1 : 0,
                      transition: 'opacity 0.25s ease-in',
                      height: chatMessages.length > 0 ? 0 : 'auto',
                      overflow: 'hidden',
                    }}
                  >
                    {isLastGroup ? (
                      <button
                        onClick={handleEndLesson}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        End Lesson
                      </button>
                    ) : (
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
                        onClick={toggleNarration}
                        className="p-2 cursor-pointer transition-colors"
                        style={{
                          transition: 'color 0.15s',
                          color: isReading && !isPaused ? '#EF0B72' : audioReady ? '#000' : '#9CA3AF',
                          opacity: audioReady ? 1 : 0.4,
                        }}
                        disabled={!audioReady}
                        aria-label={isReading && !isPaused ? 'Pause narration' : audioReady ? 'Listen to lesson' : 'Audio not available'}
                        title={isReading && !isPaused ? 'Pause narration' : audioReady ? 'Listen to lesson' : 'Audio not available for this lesson'}
                        onMouseEnter={(e) => { if (audioReady) e.currentTarget.style.color = '#EF0B72'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = isReading && !isPaused ? '#EF0B72' : audioReady ? '#000' : '#9CA3AF'; }}
                      >
                        {isReading && !isPaused ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          </svg>
                        )}
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

                {/* User question answered — Continue button to advance to next section */}
                {userQuestionAnswered && (
                  <div
                    className="flex items-center gap-2 mt-3"
                    style={{ animation: 'chatFadeIn 0.3s ease-out' }}
                  >
                    <button
                      onClick={handleUserQuestionContinue}
                      className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                      style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Buttons reappear after assistant finishes typing */}
                {chatMessages.length > 0 && lastAssistantDone && !isTyping && allTypingComplete && (
                  <div
                    className="flex items-center gap-2 mt-3"
                    style={{ opacity: showPostChatButtons ? 1 : 0, transition: 'opacity 0.25s ease-in' }}
                  >
                    {isLastGroup ? (
                      <button
                        onClick={handleEndLesson}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        End Lesson
                      </button>
                    ) : (
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
                  </div>
                )}
              </div>
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
                opacity: suggestedQuestion && !sectionQuestion && allTypingComplete && showButtons && chatMessages.length === 0 ? 1 : 0,
                transition: 'opacity 0.25s ease-in',
                pointerEvents: suggestedQuestion && !sectionQuestion && allTypingComplete && showButtons && chatMessages.length === 0 ? 'auto' : 'none',
                height: !suggestedQuestion || sectionQuestion || chatMessages.length > 0 ? 0 : 'auto',
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
          <div key={activeGroupMedia.map(s => s.id).join('|')} className="w-full" style={{ animation: 'mediaFadeIn 500ms ease-in-out' }}>
            <MediaPanel sections={activeGroupMedia} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LearningHubV2;
