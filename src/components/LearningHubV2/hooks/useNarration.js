import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { normalizeTextForNarration, splitIntoWords } from '../../../utils/textNormalization';

/**
 * Hook for narration with word-by-word highlighting in LearningHubV2.
 *
 * Uses pre-generated audio from the lesson_audio table (ElevenLabs).
 * Narrates only the current section group, highlighting words via DOM
 * data-word-index attributes using requestAnimationFrame.
 */
export default function useNarration({
  courseId,
  currentModule,
  currentLesson,
  allGroups,
  currentGroupIndex,
  allTypingComplete,
}) {
  // --- State ---
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // --- Refs ---
  const audioRef = useRef(null);
  const wordTimestampsRef = useRef(null); // full lesson timestamps
  const titleWordCountRef = useRef(0);
  const currentHighlightRef = useRef(null);
  const contentContainerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isPausedRef = useRef(false);
  const audioDataRef = useRef(null); // cached audio data
  const debounceRef = useRef(0);

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

  // --- Stop narration (cleanup) ---
  const stopNarration = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (currentHighlightRef.current) {
      currentHighlightRef.current.style.backgroundColor = '';
      currentHighlightRef.current.style.padding = '';
      currentHighlightRef.current.style.margin = '';
      currentHighlightRef.current.style.borderRadius = '';
      currentHighlightRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    isPausedRef.current = false;
    setIsReading(false);
    setIsPaused(false);
  }, []);

  // --- Stop narration when group changes ---
  useEffect(() => {
    stopNarration();
  }, [currentGroupIndex, currentModule, currentLesson]);

  // --- Highlight loop ---
  const startHighlightLoop = useCallback((audio, groupRange) => {
    const wordTimestamps = wordTimestampsRef.current;
    if (!wordTimestamps || wordTimestamps.length === 0) return;

    const { startIndex, endIndex } = groupRange;
    let lastHighlightedWord = -1;

    const updateHighlight = () => {
      if (!audio || audio.paused || audio.ended) return;

      const currentTime = audio.currentTime;

      let wordToHighlight = lastHighlightedWord;

      // Search within group range
      for (let i = startIndex; i <= endIndex && i < wordTimestamps.length; i++) {
        const ts = wordTimestamps[i];
        if (currentTime >= ts.start && currentTime < ts.end) {
          wordToHighlight = i;
          break;
        }
        // Anti-flicker: keep current word in gaps
        if (i < endIndex && i + 1 < wordTimestamps.length) {
          const next = wordTimestamps[i + 1];
          if (currentTime >= ts.end && currentTime < next.start) {
            wordToHighlight = i;
            break;
          }
        }
      }

      if (wordToHighlight !== lastHighlightedWord) {
        lastHighlightedWord = wordToHighlight;

        // Clear previous highlight
        if (currentHighlightRef.current) {
          currentHighlightRef.current.style.backgroundColor = '';
          currentHighlightRef.current.style.padding = '';
          currentHighlightRef.current.style.margin = '';
          currentHighlightRef.current.style.borderRadius = '';
        }

        // Find word span — local index (relative to group)
        if (contentContainerRef.current) {
          const localIndex = wordToHighlight - startIndex;
          const wordSpan = contentContainerRef.current.querySelector(
            `[data-word-index="${localIndex}"]`
          );

          if (wordSpan) {
            wordSpan.style.backgroundColor = '#fde7f4';
            wordSpan.style.padding = '2px';
            wordSpan.style.margin = '-2px';
            wordSpan.style.borderRadius = '2px';
            currentHighlightRef.current = wordSpan;
          } else {
            currentHighlightRef.current = null;
          }
        }
      }

      // Stop if past group range
      if (endIndex < wordTimestamps.length && currentTime >= wordTimestamps[endIndex].end) {
        // Clear final highlight
        if (currentHighlightRef.current) {
          currentHighlightRef.current.style.backgroundColor = '';
          currentHighlightRef.current.style.padding = '';
          currentHighlightRef.current.style.margin = '';
          currentHighlightRef.current.style.borderRadius = '';
          currentHighlightRef.current = null;
        }
        // Stop audio and reset
        audio.pause();
        setIsReading(false);
        setIsPaused(false);
        isPausedRef.current = false;
        audioRef.current = null;
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(updateHighlight);
    };

    animationFrameRef.current = requestAnimationFrame(updateHighlight);
  }, []);

  // --- Toggle narration ---
  const toggleNarration = useCallback(() => {
    // Debounce
    const now = Date.now();
    if (now - debounceRef.current < 500) return;
    debounceRef.current = now;

    // Don't start if typing animation isn't done
    if (!allTypingComplete) return;

    const groupRange = groupWordRanges[currentGroupIndex];
    if (!groupRange) return;

    const wordTimestamps = wordTimestampsRef.current;
    if (!wordTimestamps || wordTimestamps.length === 0) return;

    // Case 1: Currently reading, not paused → pause
    if (isReading && !isPausedRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isPausedRef.current = true;
      setIsPaused(true);
      return;
    }

    // Case 2: Paused → resume
    if (isReading && isPausedRef.current) {
      if (audioRef.current) {
        audioRef.current.play();
        startHighlightLoop(audioRef.current, groupRange);
      }
      isPausedRef.current = false;
      setIsPaused(false);
      return;
    }

    // Case 3: Not reading → start from beginning of group
    const audioData = audioDataRef.current;
    if (!audioData) return;

    const { startIndex } = groupRange;
    const startTime = startIndex < wordTimestamps.length
      ? wordTimestamps[startIndex].start
      : 0;

    const audio = new Audio(audioData.audio_url);
    audioRef.current = audio;

    audio.onended = () => {
      if (currentHighlightRef.current) {
        currentHighlightRef.current.style.backgroundColor = '';
        currentHighlightRef.current.style.padding = '';
        currentHighlightRef.current.style.margin = '';
        currentHighlightRef.current.style.borderRadius = '';
        currentHighlightRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsReading(false);
      setIsPaused(false);
      isPausedRef.current = false;
      audioRef.current = null;
    };

    audio.onerror = () => {
      console.error('Audio playback error');
      stopNarration();
    };

    isPausedRef.current = false;
    setIsReading(true);
    setIsPaused(false);

    // Seek to group start and play
    audio.currentTime = startTime;
    audio.play().then(() => {
      // Double RAF to ensure React has rendered word spans
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          startHighlightLoop(audio, groupRange);
        });
      });
    }).catch((err) => {
      console.error('Failed to play audio:', err);
      stopNarration();
    });
  }, [isReading, allTypingComplete, currentGroupIndex, groupWordRanges, startHighlightLoop, stopNarration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopNarration();
  }, [stopNarration]);

  // Whether narration mode is active (reading or paused — word spans should be rendered)
  const narrationActive = isReading || isPaused;

  return {
    isReading,
    isPaused,
    audioReady,
    narrationActive,
    toggleNarration,
    contentContainerRef,
  };
}
