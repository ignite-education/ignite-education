import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAnimation } from '../../contexts/AnimationContext';
import { markLessonComplete, saveUserProgress, getUserProgress, saveSectionQuestionScore, submitSectionFeedback, getSectionFeedback, submitChatFeedback } from '../../lib/api';
import LoadingScreen from '../LoadingScreen';
import useFadeTransition from '../../hooks/useFadeTransition';
import useLessonData from './hooks/useLessonData';
import useLessonNavigation from './hooks/useLessonNavigation';
import useNarration from './hooks/useNarration';
import { normalizeTextForNarration, splitIntoWords } from '../../utils/textNormalization';
import LessonHeader from './components/LessonHeader';
import ContentRenderer from './components/ContentRenderer';
import MediaPanel from './components/MediaPanel';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import ThumbsFeedback from './components/ThumbsFeedback';
import useChat from './hooks/useChat';
import useTypewriter from './hooks/useTypewriter';
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
  useEffect(() => {
    document.title = `${firstName ? `${firstName}'s` : 'Your'} Learning | Ignite`;
  }, [firstName]);
  const [chatInput, setChatInput] = useState('');
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const [resetClicked, setResetClicked] = useState(false);
  const [restoringProgress, setRestoringProgress] = useState(true);
  // Scored question flow state
  const [showingScoredQuestion, setShowingScoredQuestion] = useState(false);
  const [scoredIntroPhase, setScoredIntroPhase] = useState(true); // true = intro, false = question
  const [scoredQuestionPool, setScoredQuestionPool] = useState([]);
  const [scoredQuestionIndex, setScoredQuestionIndex] = useState(0);
  const [scoredAttemptCount, setScoredAttemptCount] = useState(0);
  const [scoredResult, setScoredResult] = useState(null);
  const [scoredSectionContent, setScoredSectionContent] = useState('');
  const [scoredSectionNumber, setScoredSectionNumber] = useState(null);
  const [suggestedQuestionDismissed, setSuggestedQuestionDismissed] = useState(false);
  const [sectionFeedback, setSectionFeedback] = useState({});
  const [chatFeedbackRating, setChatFeedbackRating] = useState(null);
  const contentScrollRef = useRef(null);
  const contentInnerRef = useRef(null);
  const sectionRefs = useRef([]);
  const groupRefs = useRef([]);
  const lottieRef = useRef(null);
  const loopCountRef = useRef(0);
  const chatInputRef = useRef(null);
  const prevSuggestedQuestionRef = useRef(null);

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
    chatRemainingLine,
    typingMessageIndex,
    sendMessage,
    sendScoredMessage,
    addMessagePair,
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

    // Only trigger for selections within the lesson content area
    const isInContent = anchorNode && contentInnerRef.current?.contains(anchorNode);
    if (!isInContent) {
      // Clear "Explain" if selection moved outside content
      if (chatInput.startsWith('Explain \'')) {
        savedRangeRef.current = null;
        setChatInput('');
      }
      return;
    }

    if (text && text.length > 0) {
      setChatInput(`Explain '${text}'`);
    } else if (chatInput.startsWith('Explain \'')) {
      savedRangeRef.current = null;
      setChatInput('');
    }
  };

  const mouseUpRef = useRef(null);
  mouseUpRef.current = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const anchorNode = selection?.anchorNode;
    const isInContent = anchorNode && contentInnerRef.current?.contains(anchorNode);
    if (text && text.length > 0 && selection.rangeCount > 0 && isInContent) {
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

  // Section number of the H2 heading for the current group (for feedback key)
  const currentSectionNumber = useMemo(() => {
    const heading = activeGroup.find(s => s.content_type === 'heading');
    if (heading) return heading.section_number;
    // Fallback: use first section's section_number
    return activeGroup[0]?.section_number ?? null;
  }, [activeGroup]);

  // Effective media: empty during scored questions, otherwise the active group's media
  const effectiveMedia = showingScoredQuestion ? [] : activeGroupMedia;
  const effectiveMediaKey = showingScoredQuestion ? '' : activeGroupMedia.map(s => s.id).join('|');

  // Media crossfade: fade out old media, then fade in new media (700ms each)
  const [displayedMedia, setDisplayedMedia] = useState(effectiveMedia);
  const [mediaFadePhase, setMediaFadePhase] = useState('visible'); // 'visible' | 'fading-out' | 'fading-in'
  const mediaKeyRef = useRef(effectiveMediaKey);
  const pendingMediaRef = useRef(null);

  useEffect(() => {
    if (effectiveMediaKey === mediaKeyRef.current) return;

    // Store the new media for after fade-out completes
    pendingMediaRef.current = effectiveMedia;
    mediaKeyRef.current = effectiveMediaKey;

    // If there's nothing currently displayed, swap in immediately
    if (displayedMedia.length === 0) {
      setDisplayedMedia(effectiveMedia);
      setMediaFadePhase('visible');
      return;
    }

    // Start fade-out of current media
    setMediaFadePhase('fading-out');

    const fadeOutTimer = setTimeout(() => {
      // Swap to new media after fade-out completes
      const next = pendingMediaRef.current;
      setDisplayedMedia(next);
      setMediaFadePhase('visible');
    }, 700);

    return () => clearTimeout(fadeOutTimer);
  }, [effectiveMediaKey]);
  const targetProgress = totalGroups > 1 ? ((currentGroupIndex + 1) / totalGroups) * 100 : totalGroups === 1 ? 100 : 0;
  const [lessonProgress, setLessonProgress] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLessonProgress(targetProgress));
    return () => cancelAnimationFrame(frame);
  }, [targetProgress]);

  // Get suggested question — persists from parent H2 across H3 sub-sections
  const suggestedQuestion = useMemo(() => {
    // Check current group for its own H2
    const h2InGroup = activeGroup.find(
      s => s.content_type === 'heading' && (s.content?.level || 2) === 2
    );
    if (h2InGroup) {
      return h2InGroup.suggested_question?.trim() || null;
    }

    // H3 sub-group — walk backwards to find the parent H2's suggested question
    for (let i = currentGroupIndex - 1; i >= 0; i--) {
      const group = allGroups[i] || [];
      for (let j = group.length - 1; j >= 0; j--) {
        if (group[j].content_type === 'heading' && (group[j].content?.level || 2) === 2) {
          return group[j].suggested_question?.trim() || null;
        }
      }
    }
    return null;
  }, [activeGroup, allGroups, currentGroupIndex]);

  // Track whether the suggested question persisted unchanged across a group transition
  // so the chip doesn't flicker off and back on during H3 transitions
  const suggestedQuestionPersisted = suggestedQuestion && suggestedQuestion === prevSuggestedQuestionRef.current;
  useEffect(() => {
    // Reset dismissed state when the suggested question changes (new H2 section)
    if (suggestedQuestion !== prevSuggestedQuestionRef.current) {
      setSuggestedQuestionDismissed(false);
    }
    prevSuggestedQuestionRef.current = suggestedQuestion;
  }, [suggestedQuestion]);

  // Build lesson context from sections up to a given index (for scored question evaluation)
  const buildGroupContentUpTo = useCallback((sectionIndex) => {
    if (!activeGroup || activeGroup.length === 0) return '';
    return activeGroup
      .slice(0, sectionIndex)
      .filter(s => s.content_type === 'heading' || s.content_type === 'paragraph' || s.content_type === 'list' || s.content_type === 'bulletlist')
      .map(s => {
        const text = typeof s.content === 'string' ? s.content : s.content?.text || s.content_text || '';
        if (s.content_type === 'heading') return `## ${text}`;
        return text;
      })
      .join('\n\n');
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

  const [pendingUserQuestion, setPendingUserQuestion] = useState(null);
  const [pendingUserQuestionMeta, setPendingUserQuestionMeta] = useState(null);
  const userQuestionDisplayText = pendingUserQuestion
    ? pendingUserQuestion.replace(/\{\{firstName\}\}/g, firstName || 'there')
    : '';
  const { revealedText: userQuestionRevealed, isComplete: userQuestionTypingDone } = useTypewriter(
    userQuestionDisplayText,
    { speed: 45, delay: 1000, enabled: !!pendingUserQuestion }
  );

  const handleChatSubmit = useCallback(async (text) => {
    // Scored question mode — use /api/score-answer instead of regular chat
    if (showingScoredQuestion && !scoredIntroPhase) {
      const userMessage = text.trim();
      if (!userMessage) return;
      setChatInput('');
      savedRangeRef.current = null;
      window.getSelection()?.removeAllRanges();

      // Admin bypass: typing "skip" auto-passes with 10/10
      if (userMessage.toLowerCase() === 'skip' && user?.role === 'admin') {
        const bypassFeedback = 'Admin bypass — question skipped.';
        addMessagePair(userMessage, bypassFeedback);
        setScoredResult({ score: 10, feedback: bypassFeedback, passed: true });
        saveSectionQuestionScore({
          userId: user?.id,
          courseId: userCourseId,
          moduleNumber: currentModule,
          lessonNumber: currentLesson,
          sectionNumber: scoredSectionNumber,
          score: 10,
          questionText: scoredQuestionPool[scoredQuestionIndex],
          answerText: 'skip',
          feedback: bypassResult.feedback,
        }).catch(() => {});
        return;
      }

      const result = await sendScoredMessage(
        userMessage,
        scoredQuestionPool[scoredQuestionIndex],
        scoredSectionContent
      );
      if (result) {
        setScoredResult({ score: result.score, feedback: result.feedback, passed: result.score >= 5 });
        // Persist score (best-score upsert on server)
        saveSectionQuestionScore({
          userId: user?.id,
          courseId: userCourseId,
          moduleNumber: currentModule,
          lessonNumber: currentLesson,
          sectionNumber: scoredSectionNumber,
          score: result.score,
          questionText: scoredQuestionPool[scoredQuestionIndex],
          answerText: userMessage,
          feedback: result.feedback,
        }).catch(() => {});
      }
      return;
    }

    let lessonContext = buildLessonContext();
    // If answering a user question (ungraded, per-paragraph engagement question)
    if (pendingUserQuestion && chatMessages.length === 0) {
      lessonContext = `USER QUESTION: ${pendingUserQuestion}\n\nThe student is answering the above engagement question. This is not graded. Respond briefly and neutrally. Do not comment on or evaluate their experience level. Instead, acknowledge that the course is designed for learners at all levels and will build understanding from the ground up. Keep it conversational. Do not end your response with a question, call to action, or encouragement to continue.\n\n${lessonContext}`;
    }
    sendMessage(text, lessonContext);
    setChatInput('');
    setChatFeedbackRating(null);
    savedRangeRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, [buildLessonContext, sendMessage, sendScoredMessage, addMessagePair, pendingUserQuestion, chatMessages.length, showingScoredQuestion, scoredIntroPhase, scoredQuestionPool, scoredQuestionIndex, scoredSectionContent, user?.id, user?.role, userCourseId, currentModule, currentLesson, scoredSectionNumber]);

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

  // Get H2 section name for scored question intro
  const currentH2Name = useMemo(() => {
    const h2InGroup = activeGroup.find(
      s => s.content_type === 'heading' && (s.content?.level || 2) === 2
    );
    if (h2InGroup) return h2InGroup.content?.text || h2InGroup.title || '';
    if (parentH2) return parentH2.content?.text || parentH2.title || '';
    return '';
  }, [activeGroup, parentH2]);

  // Scored question intro text — persists across both phases so it stays visible when question appears
  const scoredIntroFullText = showingScoredQuestion
    ? `${firstName || 'there'}, I'll now ask you a question based on the content in ${currentH2Name || 'this section'} that we've reviewed together. Ensure your answer is thorough and you answer the question asked.\nReady to proceed?`
    : '';
  // Only animate during intro phase; once past intro, text is rendered statically
  const scoredIntroAnimateText = scoredIntroPhase ? scoredIntroFullText : '';
  const { revealedText: scoredIntroRevealed, isComplete: scoredIntroDone } = useTypewriter(
    scoredIntroAnimateText,
    { speed: 38, delay: 1200, enabled: !!scoredIntroAnimateText }
  );

  // Scored question text with typewriter animation (after intro phase)
  const scoredQuestionText = showingScoredQuestion && !scoredIntroPhase
    ? (scoredQuestionPool[scoredQuestionIndex] || '')
    : '';
  const { revealedText: scoredQuestionRevealed, isComplete: scoredQuestionDone } = useTypewriter(
    scoredQuestionText,
    { speed: 38, delay: 1200, enabled: !!scoredQuestionText }
  );

  // Sequential typing — track how many sections have finished animating
  const [completedSections, setCompletedSections] = useState(0);
  const activeGroupRef = useRef(activeGroup);
  activeGroupRef.current = activeGroup;
  const completedSectionsRef = useRef(completedSections);
  completedSectionsRef.current = completedSections;

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

  // Delayed show for scored intro Continue button (matches nav button timing)
  const [showScoredIntroButton, setShowScoredIntroButton] = useState(false);
  useEffect(() => {
    if (scoredIntroDone && scoredIntroPhase) {
      const timer = setTimeout(() => setShowScoredIntroButton(true), 500);
      return () => clearTimeout(timer);
    }
    setShowScoredIntroButton(false);
  }, [scoredIntroDone, scoredIntroPhase]);

  const handleSectionComplete = useCallback(() => {
    setCompletedSections((prev) => {
      const section = activeGroupRef.current?.[prev];

      // Scored question block — enter scored question flow
      if (section?.content_type === 'scored_question') {
        const questions = section.content?.questions?.filter(q => q?.trim()) || [];
        if (questions.length === 0) return prev + 1; // skip if no questions

        queueMicrotask(() => {
          setShowingScoredQuestion(true);
          setScoredIntroPhase(true);
          setScoredQuestionPool(questions);
          setScoredQuestionIndex(0);
          setScoredAttemptCount(0);
          setScoredResult(null);
          setScoredSectionContent(buildGroupContentUpTo(prev));
          setScoredSectionNumber(section.section_number);
          resetChat();
          userScrolledUpRef.current = false;
        });
        return prev; // Don't advance — wait for pass
      }

      // User question — gate progression until answered
      if (section?.user_question?.trim()) {
        queueMicrotask(() => {
          setPendingUserQuestion(section.user_question.trim());
          setPendingUserQuestionMeta({
            saveFeedback: section.save_feedback || false,
            courseId: section.course_id,
            moduleNumber: section.module_number,
            lessonNumber: section.lesson_number,
            sectionNumber: section.section_number,
          });
        });
        return prev; // Don't advance — wait for user to answer
      }

      return prev + 1;
    });
  }, [buildGroupContentUpTo, resetChat]);

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
  // Scrolls toward the typing cursor (data-scroll-anchor) rather than the full container bottom,
  // so hidden layout-reserve text doesn't cause premature scroll jumps.
  useEffect(() => {
    let rafId;
    const tick = () => {
      const el = contentScrollRef.current;
      if (el && !userScrolledUpRef.current) {
        const anchor = el.querySelector('[data-scroll-anchor]');
        let target;
        if (anchor) {
          const anchorRect = anchor.getBoundingClientRect();
          const containerRect = el.getBoundingClientRect();
          const anchorOffset = anchorRect.bottom - containerRect.top + el.scrollTop;
          target = anchorOffset - el.clientHeight + 80;
          target = Math.max(0, Math.min(target, el.scrollHeight - el.clientHeight));
        } else {
          target = el.scrollHeight - el.clientHeight;
        }
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

  // Free-form chat done — non-engagement chat where Claude has finished responding
  const freeFormChatDone = !pendingUserQuestion && chatMessages.length > 0
    && chatMessages[chatMessages.length - 1]?.type === 'assistant'
    && chatMessages[chatMessages.length - 1]?.isComplete && !isTyping;

  // Silently save user question response when save_feedback is enabled
  const savedResponseRef = useRef(false);
  useEffect(() => {
    if (!userQuestionAnswered) {
      savedResponseRef.current = false;
      return;
    }
    if (savedResponseRef.current || !pendingUserQuestionMeta?.saveFeedback) return;
    if (chatMessages.length < 2) return;

    const userMsg = chatMessages.find(m => m.type === 'user');
    const assistantMsg = chatMessages.find(m => m.type === 'assistant');
    if (!userMsg || !assistantMsg) return;

    savedResponseRef.current = true;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';
    fetch(`${apiUrl}/api/user-question-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        courseId: pendingUserQuestionMeta.courseId,
        moduleNumber: pendingUserQuestionMeta.moduleNumber,
        lessonNumber: pendingUserQuestionMeta.lessonNumber,
        sectionNumber: pendingUserQuestionMeta.sectionNumber,
        question: pendingUserQuestion,
        answer: userMsg.text,
        claudeFeedback: assistantMsg.text,
      }),
    }).catch(err => console.error('Failed to save question response:', err));
  }, [userQuestionAnswered, pendingUserQuestionMeta, pendingUserQuestion, chatMessages, user?.id]);

  // Delayed fade-in for post-chat buttons (same 500ms delay as initial buttons)
  const [showPostChatButtons, setShowPostChatButtons] = useState(false);
  useEffect(() => {
    if (chatMessages.length > 0 && lastAssistantDone) {
      const timer = setTimeout(() => setShowPostChatButtons(true), 500);
      return () => clearTimeout(timer);
    }
    setShowPostChatButtons(false);
  }, [chatMessages, lastAssistantDone]);

  // Reset to first group when lesson changes, restoring saved progress if available
  useEffect(() => {
    setCompletedSections(0);
    setPendingUserQuestion(null);
    setShowingScoredQuestion(false);
    setScoredResult(null);
    setScoredSectionNumber(null);
    resetChat();
    setRestoringProgress(true);

    if (user?.id && userCourseId) {
      getUserProgress(user.id, userCourseId).then((progress) => {
        if (
          progress &&
          progress.current_module === currentModule &&
          progress.current_lesson === currentLesson &&
          progress.current_section > 0
        ) {
          setCurrentGroupIndex(progress.current_section);
        } else {
          setCurrentGroupIndex(0);
        }
        setRestoringProgress(false);
      }).catch(() => {
        setCurrentGroupIndex(0);
        setRestoringProgress(false);
      });
    } else {
      setCurrentGroupIndex(0);
      setRestoringProgress(false);
    }
  }, [currentModule, currentLesson, user?.id, userCourseId]);

  // Load existing section feedback for this lesson
  useEffect(() => {
    if (user?.id && userCourseId && currentModule && currentLesson) {
      getSectionFeedback(user.id, userCourseId, currentModule, currentLesson)
        .then(setSectionFeedback)
        .catch(() => setSectionFeedback({}));
    }
  }, [currentModule, currentLesson, user?.id, userCourseId]);

  const handleSectionFeedback = useCallback((rating) => {
    const sn = currentSectionNumber;
    if (sn == null || !user?.id) return;
    const current = sectionFeedback[sn];
    const newRating = current === rating ? null : rating;
    setSectionFeedback(prev => {
      const next = { ...prev };
      if (newRating === null) delete next[sn];
      else next[sn] = newRating;
      return next;
    });
    submitSectionFeedback({
      userId: user.id, courseId: userCourseId,
      moduleNumber: currentModule, lessonNumber: currentLesson,
      sectionNumber: sn, rating: newRating,
    });
  }, [currentSectionNumber, sectionFeedback, user?.id, userCourseId, currentModule, currentLesson]);

  const handleChatFeedback = useCallback((rating, assistantMsg, userMsg) => {
    const newRating = chatFeedbackRating === rating ? null : rating;
    setChatFeedbackRating(newRating);
    submitChatFeedback({
      userId: user.id, courseId: userCourseId,
      moduleNumber: currentModule, lessonNumber: currentLesson,
      sectionNumber: currentSectionNumber,
      userMessage: userMsg, assistantMessage: assistantMsg, rating: newRating,
    });
  }, [chatFeedbackRating, user?.id, userCourseId, currentModule, currentLesson, currentSectionNumber]);

  // Handle Continue — advance to next group
  const handleContinue = useCallback(() => {
    setChatInput('');
    setCompletedSections(0);
    setPendingUserQuestion(null);
    setShowingScoredQuestion(false);
    setScoredResult(null);
    setScoredSectionNumber(null);
    setCurrentGroupIndex((prev) => {
      const next = prev + 1;
      // Fire-and-forget save
      if (user?.id && userCourseId) {
        saveUserProgress(user.id, userCourseId, currentModule, currentLesson, next).catch(() => {});
      }
      return next;
    });
    resetChat();
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    chatInputRef.current?.focus();
  }, [resetChat, user?.id, userCourseId, currentModule, currentLesson]);

  // Handle Back — go to previous section group
  const handleBack = useCallback(() => {
    setChatInput('');
    setCompletedSections(0);
    setPendingUserQuestion(null);
    setShowingScoredQuestion(false);
    setScoredResult(null);
    setScoredSectionNumber(null);
    setCurrentGroupIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (user?.id && userCourseId) {
        saveUserProgress(user.id, userCourseId, currentModule, currentLesson, next).catch(() => {});
      }
      return next;
    });
    resetChat();
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    chatInputRef.current?.focus();
  }, [resetChat, user?.id, userCourseId, currentModule, currentLesson]);

  // End Lesson — mark complete, reset section progress, and navigate to progress hub
  const handleEndLesson = useCallback(async () => {
    try {
      await markLessonComplete(user?.id, userCourseId, currentModule, currentLesson);
      // Reset section progress so reopening this lesson starts fresh
      await saveUserProgress(user?.id, userCourseId, currentModule, currentLesson, 0);
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    }
    navigate('/progress');
  }, [user?.id, userCourseId, currentModule, currentLesson, navigate]);

  const handleUserQuestionContinue = useCallback(() => {
    setChatInput('');
    setPendingUserQuestion(null);
    setPendingUserQuestionMeta(null);
    resetChat();

    const groupLen = activeGroupRef.current?.length || 0;
    const currentCompleted = completedSectionsRef.current;

    if (currentCompleted + 1 >= groupLen) {
      // Last section in group — advance to next group or end lesson
      if (isLastGroup) {
        handleEndLesson();
      } else {
        setCompletedSections(0);
        setCurrentGroupIndex((prev) => {
          const next = prev + 1;
          if (user?.id && userCourseId) {
            saveUserProgress(user.id, userCourseId, currentModule, currentLesson, next).catch(() => {});
          }
          return next;
        });
        requestAnimationFrame(() => {
          contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        });
        chatInputRef.current?.focus();
      }
    } else {
      // More sections remain — reveal the next one
      setCompletedSections((prev) => prev + 1);
    }
  }, [resetChat, isLastGroup, handleEndLesson, user?.id, userCourseId, currentModule, currentLesson]);

  // Scored question intro → show the actual question underneath
  const handleScoredIntroComplete = useCallback(() => {
    setScoredIntroPhase(false);
    userScrolledUpRef.current = false;
    // Focus chat input after question finishes typing — handled via effect
  }, []);

  // Scored question — pass (advance past the block)
  const handleScoredQuestionPass = useCallback(() => {
    setChatInput('');
    setShowingScoredQuestion(false);
    setScoredIntroPhase(true);
    setScoredResult(null);
    setScoredQuestionPool([]);
    setScoredSectionNumber(null);
    resetChat();

    const groupLen = activeGroupRef.current?.length || 0;
    const currentCompleted = completedSectionsRef.current;

    if (currentCompleted + 1 >= groupLen) {
      // Scored question was last section — advance to next group directly
      if (isLastGroup) {
        handleEndLesson();
      } else {
        setCompletedSections(0);
        setCurrentGroupIndex((prev) => {
          const next = prev + 1;
          if (user?.id && userCourseId) {
            saveUserProgress(user.id, userCourseId, currentModule, currentLesson, next).catch(() => {});
          }
          return next;
        });
        requestAnimationFrame(() => {
          contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        });
        chatInputRef.current?.focus();
      }
    } else {
      setCompletedSections((prev) => prev + 1);
    }
  }, [resetChat, isLastGroup, handleEndLesson, user?.id, userCourseId, currentModule, currentLesson]);

  // Scored question — retry same question
  const handleScoredQuestionRetry = useCallback(() => {
    setScoredAttemptCount((prev) => prev + 1);
    setScoredResult(null);
    resetChat();
    userScrolledUpRef.current = false;
  }, [resetChat]);

  // Scored question — move to next question in pool (after 2 failed attempts)
  const handleScoredQuestionNext = useCallback(() => {
    const nextIndex = scoredQuestionIndex + 1;
    if (nextIndex >= scoredQuestionPool.length) {
      // Pool exhausted — let them pass gracefully
      handleScoredQuestionPass();
      return;
    }
    setScoredQuestionIndex(nextIndex);
    setScoredAttemptCount(0);
    setScoredResult(null);
    setScoredIntroPhase(false); // skip intro for subsequent questions
    resetChat();
    userScrolledUpRef.current = false;
  }, [resetChat, scoredQuestionIndex, scoredQuestionPool.length, handleScoredQuestionPass]);

  // Auto-focus chat input when scored question finishes typing
  useEffect(() => {
    if (showingScoredQuestion && !scoredIntroPhase && scoredQuestionDone) {
      chatInputRef.current?.focus();
    }
  }, [showingScoredQuestion, scoredIntroPhase, scoredQuestionDone]);

  // Determine scored question button state
  const scoredQuestionAnswered = showingScoredQuestion && scoredResult && lastAssistantDone && !isTyping;

  // Delayed show for scored answer buttons (matches nav button timing)
  const [showScoredAnswerButton, setShowScoredAnswerButton] = useState(false);
  useEffect(() => {
    if (scoredQuestionAnswered) {
      const timer = setTimeout(() => setShowScoredAnswerButton(true), 500);
      return () => clearTimeout(timer);
    }
    setShowScoredAnswerButton(false);
  }, [scoredQuestionAnswered]);

  const { showLoading, showContent, loadingClassName, contentClassName } = useFadeTransition(loading);

  if (!showContent) {
    return <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />;
  }

  return (
    <div className={`bg-white ${contentClassName}`}>
      {showLoading && (
        <div className={`fixed inset-0 z-50 ${loadingClassName}`}>
          <LoadingScreen autoRefresh={true} autoRefreshDelay={30000} />
        </div>
      )}
      {/* Main two-column layout — 100vh */}
      <div className="h-dvh flex">
        {/* Left column — lesson content */}
        <div className="flex-[3] flex flex-col min-h-0 relative">
          {/* Fixed header — logo, lesson label, title, pink line */}
          <div className="px-10" style={{ paddingTop: '30px', paddingBottom: '10px' }}>
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
            <div className="flex items-center gap-3">
              <div className="rounded-full flex-1" style={{ backgroundColor: '#F0F0F0', height: '5px' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${lessonProgress}%`,
                    backgroundColor: '#EF0B72',
                    transition: 'width 1s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  }}
                />
              </div>
              <button
                className="group cursor-pointer flex-shrink-0"
                title="Restart lesson"
                onClick={() => {
                  if (user?.id && userCourseId) {
                    saveUserProgress(user.id, userCourseId, currentModule, currentLesson, 0).catch(() => {});
                  }
                  // Reset all section/typing state
                  setCompletedSections(0);
                  setPendingUserQuestion(null);
                  setShowingScoredQuestion(false);
                  setScoredResult(null);
                  setScoredSectionNumber(null);
                  resetChat();
                  setChatInput('');
                  setCurrentGroupIndex(0);
                  // Bump key to force remount of content (re-triggers typewriter)
                  setResetKey(k => k + 1);
                  // Scroll content back to top
                  contentScrollRef.current?.scrollTo({ top: 0 });
                  setResetClicked(true);
                }}
                onMouseLeave={() => setResetClicked(false)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`transition-transform duration-300 ease-in-out ${resetClicked ? '' : 'group-hover:-rotate-45'}`}
                >
                  <path
                    d="M12 4a8 8 0 1 1-6.3 3.1"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className={`transition-colors duration-300 ${resetClicked ? '' : 'group-hover:stroke-[#EF0B72]'}`}
                  />
                  <polygon
                    points="12,1 12,7 6,4"
                    fill="#000000"
                    className={`transition-colors duration-300 ${resetClicked ? '' : 'group-hover:fill-[#EF0B72]'}`}
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable content area wrapper */}
          <div className="flex-1 min-h-0 relative">
            {/* White gradient fade below progress bar */}
            <div className="absolute pointer-events-none" style={{ top: '0px', height: '10px', zIndex: 5, left: '40px', right: '40px' }}>
              <div className="absolute inset-0" style={{
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                maskImage: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,1) 100%)',
              }} />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/70 to-white" />
            </div>
            <div
              ref={contentScrollRef}
              className="h-full overflow-y-auto hide-scrollbar"
              style={{ paddingLeft: '40px', paddingRight: '70px' }}
            >
            <div ref={(el) => { contentInnerRef.current = el; contentContainerRef.current = el; }}>
              {restoringProgress ? null : <>
              {/* Scored question screen — intro text, then question types underneath */}
              {showingScoredQuestion && scoredQuestionPool.length > 0 ? (
                <div key={`scored-${scoredQuestionIndex}`}>
                  {/* H2 heading persists at top */}
                  {currentH2Name && (
                    <div className="mt-[5px] mb-3">
                      <h2 className="text-xl" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                        {currentH2Name}
                      </h2>
                    </div>
                  )}
                  {/* Intro text */}
                  <div
                    className="text-base font-light leading-relaxed text-black"
                    style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}
                  >
                    {scoredIntroPhase ? (
                      <>
                        {(() => {
                          const text = scoredIntroRevealed || '';
                          const lines = text.split('\n');
                          return lines.map((line, li) => (
                            <p key={li} className={li > 0 ? 'mt-3' : ''}>
                              {line}
                              {li === lines.length - 1 && !scoredIntroDone && scoredIntroRevealed && (
                                <span
                                  data-scroll-anchor
                                  className="inline-block ml-1.5"
                                  style={{
                                    width: 8,
                                    height: 8,
                                    backgroundColor: '#8200EA',
                                    verticalAlign: 'middle',
                                    position: 'relative',
                                    top: '-1px',
                                  }}
                                />
                              )}
                            </p>
                          ));
                        })()}
                        {!scoredIntroDone && !scoredIntroRevealed && (
                          <p>
                            <span
                              data-scroll-anchor
                              className="inline-block"
                              style={{
                                width: 8,
                                height: 8,
                                backgroundColor: '#8200EA',
                                verticalAlign: 'middle',
                                position: 'relative',
                                top: '-1px',
                                animation: 'purplePulse 1.2s ease-in-out infinite',
                              }}
                            />
                          </p>
                        )}
                      </>
                    ) : (
                      /* Static intro text after intro phase — omit "Ready to proceed?" line */
                      scoredIntroFullText.split('\n').filter(line => line.trim() !== 'Ready to proceed?').map((line, li) => (
                        <p key={li} className={li > 0 ? 'mt-3' : ''}>{line}</p>
                      ))
                    )}
                  </div>

                  {/* Question text — types where "Ready to proceed?" was after Continue is clicked */}
                  {!scoredIntroPhase && (
                    <p
                      className="text-base font-semibold leading-relaxed text-black mt-3"
                      style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}
                    >
                      {scoredQuestionRevealed}
                      {!scoredQuestionDone && scoredQuestionRevealed && (
                        <span
                          data-scroll-anchor
                          className="inline-block ml-1.5"
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: '#8200EA',
                            verticalAlign: 'middle',
                            position: 'relative',
                            top: '-1px',
                          }}
                        />
                      )}
                      {!scoredQuestionDone && !scoredQuestionRevealed && (
                        <span
                          data-scroll-anchor
                          className="inline-block"
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: '#8200EA',
                            verticalAlign: 'middle',
                            position: 'relative',
                            top: '-1px',
                            animation: 'purplePulse 1.2s ease-in-out infinite',
                          }}
                        />
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Render sections sequentially — each starts typing after the previous finishes */}
                  <div key={`${currentGroupIndex}-${resetKey}`}>
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
                  {pendingUserQuestion && (
                    <div className="mt-1 mb-4">
                      <p
                        className="text-base font-medium leading-relaxed text-black"
                        style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}
                      >
                        {chatMessages.length > 0
                          ? userQuestionDisplayText
                          : (
                            <>
                              {userQuestionRevealed}
                              {!userQuestionTypingDone && (
                                <span
                                  data-scroll-anchor
                                  className="inline-block ml-1.5"
                                  style={{
                                    width: 8,
                                    height: 8,
                                    backgroundColor: '#8200EA',
                                    verticalAlign: 'middle',
                                    position: 'relative',
                                    top: '-1px',
                                  }}
                                />
                              )}
                              <span style={{ color: 'transparent', pointerEvents: 'none', userSelect: 'none' }} aria-hidden="true">{userQuestionDisplayText.slice(userQuestionRevealed.length)}</span>
                            </>
                          )
                        }
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Action area — buttons crossfade with chat messages at the same position */}
              <div className="mt-3 mb-4">
                {/* Navigation buttons — hidden when chat is active */}
                {allTypingComplete && !showingScoredQuestion && chatMessages.length === 0 && (
                  <div
                    className="flex items-center gap-2"
                    style={{
                      opacity: showButtons ? 1 : 0,
                      transition: 'opacity 0.25s ease-in',
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
                        <button
                          onClick={handleBack}
                          className="p-2 cursor-pointer transition-colors"
                          style={{ transition: 'color 0.15s', display: currentGroupIndex > 0 ? '' : 'none' }}
                          aria-label="Back"
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                          </svg>
                        </button>
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
                        <span style={{ display: 'grid' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"
                            style={{ gridArea: '1 / 1', transition: 'opacity 0.2s ease', opacity: isReading && !isPaused ? 1 : 0 }}
                          >
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ gridArea: '1 / 1', transition: 'opacity 0.2s ease', opacity: isReading && !isPaused ? 0 : 1 }}
                          >
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                          </svg>
                        </span>
                      </button>
                      <ThumbsFeedback
                        rating={sectionFeedback[currentSectionNumber] ?? null}
                        onRate={handleSectionFeedback}
                      />
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
                          remainingLine={typingMessageIndex === idx ? chatRemainingLine : ''}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Purple typing cursor while waiting for API response */}
                {isTyping && (
                  <div className="mt-3 mb-3">
                    <span
                      data-scroll-anchor
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

                {/* Free-form chat done — Continue, back, thumbs below the response */}
                {freeFormChatDone && !showingScoredQuestion && (
                  <div
                    className="flex items-center gap-2 mt-3"
                    style={{ animation: 'chatFadeIn 0.3s ease-out' }}
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
                    <button
                      onClick={handleBack}
                      className="p-2 cursor-pointer transition-colors"
                      style={{ transition: 'color 0.15s', display: currentGroupIndex > 0 ? '' : 'none' }}
                      aria-label="Back"
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {(() => {
                      const lastMsg = chatMessages[chatMessages.length - 1];
                      const lastUser = chatMessages[chatMessages.length - 2];
                      return (
                        <ThumbsFeedback
                          rating={chatFeedbackRating}
                          onRate={(rating) => handleChatFeedback(rating, lastMsg.text, lastUser?.text || '')}
                        />
                      );
                    })()}
                  </div>
                )}

                {/* User question answered — Continue button to advance to next section */}
                {userQuestionAnswered && !showingScoredQuestion && (
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
                    <button
                      onClick={handleBack}
                      className="p-2 text-black cursor-pointer transition-colors"
                      style={{ transition: 'color 0.15s', display: currentGroupIndex > 0 ? '' : 'none' }}
                      aria-label="Back"
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {(() => {
                      const lastAssistant = [...chatMessages].reverse().find(m => m.type === 'assistant' && m.isComplete);
                      const lastUser = lastAssistant ? chatMessages[chatMessages.indexOf(lastAssistant) - 1] : null;
                      return lastAssistant ? (
                        <ThumbsFeedback
                          rating={chatFeedbackRating}
                          onRate={(rating) => handleChatFeedback(rating, lastAssistant.text, lastUser?.text || '')}
                        />
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Scored question intro phase — Continue to proceed to the question */}
                {showingScoredQuestion && scoredIntroPhase && scoredIntroDone && (
                  <div
                    className="flex items-center gap-2 mt-3"
                    style={{
                      opacity: showScoredIntroButton ? 1 : 0,
                      transition: 'opacity 0.25s ease-in',
                    }}
                  >
                    <button
                      onClick={handleScoredIntroComplete}
                      className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                      style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      Continue
                    </button>
                    <button
                      onClick={handleBack}
                      className="p-2 text-black cursor-pointer transition-colors"
                      style={{ transition: 'color 0.15s', display: currentGroupIndex > 0 ? '' : 'none' }}
                      aria-label="Back"
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Scored question answered — show Continue, Try Again, or auto-advance */}
                {scoredQuestionAnswered && (
                  <div
                    className="flex items-center gap-2 mt-3"
                    style={{
                      opacity: showScoredAnswerButton ? 1 : 0,
                      transition: 'opacity 0.25s ease-in',
                    }}
                  >
                    {scoredResult.passed ? (
                      <button
                        onClick={handleScoredQuestionPass}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        Continue
                      </button>
                    ) : scoredAttemptCount === 0 ? (
                      <button
                        onClick={handleScoredQuestionRetry}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        Try Again
                      </button>
                    ) : (
                      <button
                        onClick={handleScoredQuestionNext}
                        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
                        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {scoredQuestionIndex + 1 >= scoredQuestionPool.length ? 'Continue' : 'Try Another Question'}
                      </button>
                    )}
                  </div>
                )}

                {/* Buttons reappear after assistant finishes typing (not during scored question flow or free-form/engagement chat) */}
                {chatMessages.length > 0 && lastAssistantDone && !isTyping && allTypingComplete && !showingScoredQuestion && !freeFormChatDone && !userQuestionAnswered && (
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
                    <button
                      onClick={handleBack}
                      className="p-2 cursor-pointer transition-colors"
                      style={{ transition: 'color 0.15s, opacity 0.15s', color: currentGroupIndex > 0 ? '#000' : '#9CA3AF', opacity: currentGroupIndex > 0 ? 1 : 0.4 }}
                      aria-label="Back"
                      disabled={currentGroupIndex === 0}
                      onMouseEnter={(e) => { if (currentGroupIndex > 0) e.currentTarget.style.color = '#EF0B72'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = currentGroupIndex > 0 ? '' : '#9CA3AF'; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              </>}
            </div>
            {/* Bottom spacer — smaller when suggested question takes up space below */}
            <div style={{ height: suggestedQuestion && !suggestedQuestionDismissed && !showingScoredQuestion ? '8px' : '40px' }} />
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
                opacity: suggestedQuestion && !suggestedQuestionDismissed && !showingScoredQuestion && (suggestedQuestionPersisted || (allTypingComplete && showButtons) || userQuestionTypingDone) ? 1 : 0,
                transition: 'opacity 0.25s ease-in',
                pointerEvents: suggestedQuestion && !suggestedQuestionDismissed && !showingScoredQuestion && ((allTypingComplete && showButtons) || userQuestionTypingDone) ? 'auto' : 'none',
                height: !suggestedQuestion || suggestedQuestionDismissed || showingScoredQuestion ? 0 : 'auto',
                overflow: 'hidden',
              }}
            >
              {suggestedQuestion && (
                <button
                  onClick={() => {
                    setSuggestedQuestionDismissed(true);
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
          <div
            key={displayedMedia.map(s => s.id).join('|')}
            className="w-full"
            style={{
              opacity: mediaFadePhase === 'fading-out' ? 0 : 1,
              transition: 'opacity 700ms ease-in-out',
            }}
          >
            <MediaPanel sections={displayedMedia} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LearningHubV2;
