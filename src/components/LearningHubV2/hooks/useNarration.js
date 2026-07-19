import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { normalizeTextForNarration, splitIntoWords } from '../../../utils/textNormalization';

/**
 * Hook for voice-driven narration in LearningHubV2.
 *
 * Uses pre-generated audio from the lesson_audio table (ElevenLabs). When a
 * group is in "audio mode" (audio available, not muted, no interactive gate),
 * the audio DRIVES the on-screen text reveal: each word appears exactly when
 * the voice speaks it, with the current word highlighted. Reveal + highlight
 * are driven by React state (`revealIndex`, group-local) that the RAF loop
 * updates at word-rate — no imperative DOM mutation, so LearningHubV2
 * re-renders never fight the reveal.
 *
 * When muted (or a lesson has no audio), the caller falls back to the
 * fixed-speed typewriter and this hook only powers on-demand replay via the
 * bottom speaker button (`toggleNarration`).
 */
export default function useNarration({
  courseId,
  currentModule,
  currentLesson,
  allGroups,
  currentGroupIndex,
  resetKey,
  muted,
  groupHasGate,
  restoringProgress,
  progressBarDone,
}) {
  // --- State ---
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  // Latched per group: does this group use audio-driven reveal? (mute toggled
  // mid-group does NOT change this — it only takes effect from the next group.)
  const [groupAudioMode, setGroupAudioMode] = useState(false);
  // Group-local index of the current/last spoken word (-1 = nothing revealed yet).
  const [revealIndex, setRevealIndex] = useState(-1);
  // True once the group's audio has fully played (or reveal was force-completed).
  const [revealComplete, setRevealComplete] = useState(false);

  // --- Refs ---
  const audioRef = useRef(null);
  const wordTimestampsRef = useRef(null); // full lesson timestamps
  const titleWordCountRef = useRef(0);
  const contentContainerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isPausedRef = useRef(false);
  const audioDataRef = useRef(null); // cached audio data
  const debounceRef = useRef(0);
  const awaitingGestureRef = useRef(false); // autoplay blocked → waiting for first interaction
  const pendingStartRef = useRef(null); // fn to run on the next user interaction
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const revealIndexRef = useRef(-1);
  revealIndexRef.current = revealIndex;

  // --- Fetch audio on lesson change ---
  useEffect(() => {
    setAudioReady(false);
    audioDataRef.current = null;
    wordTimestampsRef.current = null;
    titleWordCountRef.current = 0;

    if (!courseId || !currentModule || !currentLesson) return;

    const fetchAudio = async () => {
      try {
        const { data, error } = await supabase
          .from('lesson_audio')
          .select('audio_url, word_timestamps, title_word_count')
          .eq('course_id', courseId)
          .eq('module_number', currentModule)
          .eq('lesson_number', currentLesson)
          .maybeSingle();

        if (error || !data?.audio_url || !data?.word_timestamps) return;

        audioDataRef.current = data;
        wordTimestampsRef.current = data.word_timestamps;
        titleWordCountRef.current = data.title_word_count || 0;
        setAudioReady(true);

        // Preload audio into browser cache
        const preload = new Audio();
        preload.preload = 'auto';
        preload.src = data.audio_url;
      } catch (err) {
        console.error('Error fetching lesson audio:', err);
      }
    };

    fetchAudio();
  }, [courseId, currentModule, currentLesson]);

  // --- Compute word ranges per group ---
  // Returns { startIndex, endIndex } into the full wordTimestamps array for each group
  const groupWordRanges = useMemo(() => {
    if (!allGroups || allGroups.length === 0) return [];

    const titleWordCount = titleWordCountRef.current;
    let cursor = titleWordCount; // skip title words
    const ranges = [];

    for (const group of allGroups) {
      const textSections = group.filter(
        s => s.content_type === 'heading' || s.content_type === 'paragraph' || s.content_type === 'list' || s.content_type === 'bulletlist'
      );

      let groupWordCount = 0;
      for (const section of textSections) {
        const rawText = typeof section.content === 'string'
          ? section.content
          : section.content?.text || section.content_text || '';

        // For list sections, concatenate items
        let text = rawText;
        if ((section.content_type === 'list' || section.content_type === 'bulletlist') && section.content?.items) {
          text = section.content.items.join(' ');
        }

        const normalized = normalizeTextForNarration(text);
        const words = splitIntoWords(normalized);
        groupWordCount += words.length;
      }

      ranges.push({ startIndex: cursor, endIndex: cursor + groupWordCount - 1 });
      cursor += groupWordCount;
    }

    return ranges;
  }, [allGroups, titleWordCountRef.current]);

  // --- Stop audio + RAF (does not touch reveal state) ---
  const stopNarration = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isPausedRef.current = false;
    setIsReading(false);
    setIsPaused(false);
  }, []);

  // --- Mark the current group's reveal finished (all words visible, no highlight) ---
  const finishGroupReveal = useCallback((groupRange) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const total = groupRange ? (groupRange.endIndex - groupRange.startIndex + 1) : 0;
    // revealIndex past the last word → every word visible, none highlighted
    setRevealIndex(total);
    setRevealComplete(true);
    isPausedRef.current = false;
    setIsReading(false);
    setIsPaused(false);
  }, []);

  // --- Reveal loop: audio time → current group-local word index (React state) ---
  const startRevealLoop = useCallback((audio, groupRange) => {
    const wordTimestamps = wordTimestampsRef.current;
    if (!wordTimestamps || wordTimestamps.length === 0) return;

    const { startIndex, endIndex } = groupRange;

    const tick = () => {
      if (!audio || audio.paused || audio.ended) return;
      const currentTime = audio.currentTime;

      // Largest index in the group whose start time has passed = current word.
      let wordIdx = startIndex - 1;
      for (let i = startIndex; i <= endIndex && i < wordTimestamps.length; i++) {
        if (currentTime >= wordTimestamps[i].start) wordIdx = i;
        else break;
      }
      const local = wordIdx - startIndex; // -1 before the first word is spoken
      if (local !== revealIndexRef.current) setRevealIndex(local);

      // Stop at the group boundary (audio is one continuous file for the lesson)
      if (endIndex < wordTimestamps.length && currentTime >= wordTimestamps[endIndex].end) {
        finishGroupReveal(groupRange);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [finishGroupReveal]);

  // --- Start (or replay) narration for the current group ---
  // fromLocalIndex lets callers resume; 0 = from the group's first word.
  // resetReveal=true hides the text and re-reveals it (initial voice-driven pass);
  // resetReveal=false keeps the text visible and only moves the highlight (replay).
  const startNarration = useCallback((fromLocalIndex = 0, { onBlocked, resetReveal = true } = {}) => {
    const groupRange = groupWordRanges[currentGroupIndex];
    const wordTimestamps = wordTimestampsRef.current;
    const audioData = audioDataRef.current;
    if (!groupRange || !wordTimestamps || wordTimestamps.length === 0 || !audioData) return;

    const startWord = Math.min(groupRange.startIndex + fromLocalIndex, wordTimestamps.length - 1);
    const startTime = wordTimestamps[startWord]?.start ?? 0;

    const audio = new Audio(audioData.audio_url);
    audioRef.current = audio;
    audio.muted = mutedRef.current;
    audio.onended = () => finishGroupReveal(groupRange);
    audio.onerror = () => { stopNarration(); };

    isPausedRef.current = false;
    if (resetReveal) {
      setRevealComplete(false);
      setRevealIndex(fromLocalIndex > 0 ? fromLocalIndex - 1 : -1);
    }
    audio.currentTime = startTime;

    audio.play().then(() => {
      setIsReading(true);
      setIsPaused(false);
      startRevealLoop(audio, groupRange);
    }).catch((err) => {
      // Autoplay blocked (no user gesture yet) or playback failed. The caller
      // arms a first-interaction listener to start it.
      console.warn('Narration playback blocked/failed:', err?.message || err);
      audioRef.current = null;
      onBlocked?.();
    });
  }, [groupWordRanges, currentGroupIndex, startRevealLoop, finishGroupReveal, stopNarration]);

  // --- On group / lesson change: reset reveal, stop audio, re-latch audio mode ---
  useEffect(() => {
    stopNarration();
    setRevealIndex(-1);
    setRevealComplete(false);
    awaitingGestureRef.current = false;
    pendingStartRef.current = null;
    // Audio mode (the line/word highlight animation) runs whenever the lesson has
    // audio — even when muted. Mute only silences the voiceover, not the animation.
    setGroupAudioMode(audioReady && !groupHasGate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupIndex, currentModule, currentLesson, resetKey, audioReady, groupHasGate]);

  // --- One persistent listener: start pending narration on first interaction ---
  // Kept separate from the auto-start effect so its cleanup never races with
  // auto-start re-runs (which previously could drop the listener).
  useEffect(() => {
    const onGesture = () => {
      const fn = pendingStartRef.current;
      if (fn) { pendingStartRef.current = null; fn(); }
    };
    document.addEventListener('pointerdown', onGesture, true);
    document.addEventListener('keydown', onGesture, true);
    return () => {
      document.removeEventListener('pointerdown', onGesture, true);
      document.removeEventListener('keydown', onGesture, true);
    };
  }, []);

  // --- Auto-start narration when a group enters audio mode ---
  // If the browser blocks autoplay, queue a start for the first interaction.
  // groupWordRanges is a dep so this retries once ranges finish computing.
  useEffect(() => {
    if (!groupAudioMode || restoringProgress || !progressBarDone || revealComplete || isReading) return;
    if (animationFrameRef.current || audioRef.current || awaitingGestureRef.current) return;

    startNarration(0, {
      onBlocked: () => {
        awaitingGestureRef.current = true;
        pendingStartRef.current = () => {
          awaitingGestureRef.current = false;
          startNarration(0);
        };
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupAudioMode, restoringProgress, progressBarDone, revealComplete, isReading, currentGroupIndex, groupWordRanges]);

  // --- Toggle narration (bottom speaker button: pause / resume / replay) ---
  const toggleNarration = useCallback(() => {
    const now = Date.now();
    if (now - debounceRef.current < 400) return;
    debounceRef.current = now;

    const groupRange = groupWordRanges[currentGroupIndex];
    if (!groupRange || !wordTimestampsRef.current?.length || !audioDataRef.current) return;

    // Currently playing → pause
    if (isReading && !isPausedRef.current) {
      audioRef.current?.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isPausedRef.current = true;
      setIsPaused(true);
      return;
    }

    // Paused → resume from where we left off
    if (isReading && isPausedRef.current) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        startRevealLoop(audioRef.current, groupRange);
      }
      isPausedRef.current = false;
      setIsPaused(false);
      return;
    }

    // Not reading → replay this group from the start (user gesture, so play() is allowed).
    // Keep the text visible; a replay just moves the highlight.
    startNarration(0, { resetReveal: false });
  }, [isReading, groupWordRanges, currentGroupIndex, startRevealLoop, startNarration]);

  // --- Keep the live audio's muted state in sync with the mute toggle ---
  // Toggling the button silences/re-enables the voiceover without stopping the
  // highlight animation (the click is a user gesture, so unmuting is allowed).
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopNarration();
  }, [stopNarration]);

  // --- Sentence ranges for the current group (group-local word indices) ---
  // Used to light-highlight the whole sentence currently being narrated, with a
  // darker highlight on the current word.
  const sentenceRanges = useMemo(() => {
    const wt = wordTimestampsRef.current;
    const range = groupWordRanges[currentGroupIndex];
    if (!wt || !range) return [];
    const { startIndex, endIndex } = range;
    const lastLocal = endIndex - startIndex;
    const ranges = [];
    let sentStart = 0;
    for (let i = startIndex; i <= endIndex && i < wt.length; i++) {
      const local = i - startIndex;
      // Strip trailing quotes/brackets, then check for sentence-ending punctuation.
      const word = (wt[i]?.word || '').replace(/[)"'\]’”]+$/, '');
      if (/[.!?]$/.test(word)) {
        ranges.push({ start: sentStart, end: local });
        sentStart = local + 1;
      }
    }
    if (sentStart <= lastLocal) ranges.push({ start: sentStart, end: lastLocal });
    return ranges;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroupIndex, groupWordRanges, audioReady]);

  const currentSentence = useMemo(() => {
    if (revealIndex < 0) return null;
    return sentenceRanges.find(r => revealIndex >= r.start && revealIndex <= r.end) || null;
  }, [sentenceRanges, revealIndex]);

  // Render word-index spans whenever we're in audio mode OR manually reading.
  const narrationActive = groupAudioMode || isReading || isPaused;

  return {
    isReading,
    isPaused,
    audioReady,
    groupAudioMode,
    narrationActive,
    revealIndex,
    revealComplete,
    sentenceStart: currentSentence ? currentSentence.start : -1,
    sentenceEnd: currentSentence ? currentSentence.end : -1,
    toggleNarration,
    stopNarration,
    contentContainerRef,
  };
}
