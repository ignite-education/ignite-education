import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for typing animations using requestAnimationFrame.
 * This prevents Chrome's timer throttling issues that cause glitchy animations.
 *
 * @param {string} fullText - The complete text to animate
 * @param {Object} config - Configuration options
 * @param {number} config.charDelay - Delay between characters in ms (default: 75)
 * @param {number} config.startDelay - Initial delay before typing starts in ms (default: 0)
 * @param {Array} config.pausePoints - Array of {after: number, duration: number} for pauses
 * @param {boolean} config.enabled - Whether the animation should run (default: true)
 * @param {Function} config.onComplete - Callback when animation completes
 * @returns {{displayText: string, isComplete: boolean}}
 */
const useTypingAnimation = (fullText, config = {}) => {
  const {
    charDelay = 75,
    startDelay = 0,
    pausePoints = [],
    enabled = true,
    onComplete = null
  } = config;

  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef(null);
  const stateRef = useRef({
    startTime: null,
    currentIndex: 0,
    totalPauseTime: 0,
    activePauseEnd: 0
  });

  useEffect(() => {
    if (!enabled || !fullText) {
      return;
    }

    // Reset state when enabled or text changes
    stateRef.current = {
      startTime: null,
      currentIndex: 0,
      totalPauseTime: 0,
      activePauseEnd: 0
    };
    setDisplayText('');
    setIsComplete(false);

    const animate = (timestamp) => {
      const state = stateRef.current;

      if (!state.startTime) {
        state.startTime = timestamp;
      }

      const elapsed = timestamp - state.startTime;

      // Handle start delay
      if (elapsed < startDelay) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Handle active pause
      if (state.activePauseEnd > 0 && timestamp < state.activePauseEnd) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate target index based on elapsed time minus pauses
      const typingElapsed = elapsed - startDelay - state.totalPauseTime;
      const targetIndex = Math.min(
        Math.floor(typingElapsed / charDelay),
        fullText.length
      );

      // Update if we've advanced
      if (targetIndex > state.currentIndex) {
        state.currentIndex = targetIndex;
        setDisplayText(fullText.substring(0, targetIndex));

        // Check for pause point at this position
        const pausePoint = pausePoints.find(p => p.after === targetIndex);
        if (pausePoint) {
          state.activePauseEnd = timestamp + pausePoint.duration;
          state.totalPauseTime += pausePoint.duration;
        }
      }

      // Check if complete
      if (state.currentIndex >= fullText.length) {
        setIsComplete(true);
        if (onComplete) onComplete();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fullText, charDelay, startDelay, JSON.stringify(pausePoints), enabled]);

  return { displayText, isComplete };
};

export default useTypingAnimation;
