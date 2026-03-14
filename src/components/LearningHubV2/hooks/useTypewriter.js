import { useState, useEffect, useRef } from 'react';

const PAUSE_CHARS = new Set(['.', ',', ';', ':', '!', '?']);
const PAUSE_DURATION = 400; // ms pause after punctuation

export default function useTypewriter(text, { speed = 33, delay = 0, enabled = true, onComplete } = {}) {
  const [revealedCount, setRevealedCount] = useState(enabled ? 0 : Infinity);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const totalChars = text ? text.length : 0;

  useEffect(() => {
    if (!enabled || !text) {
      setRevealedCount(Infinity);
      onCompleteRef.current?.();
      return;
    }

    setRevealedCount(0);
    let rafId = null;
    let lastTime = 0;
    let count = 0;
    let pauseUntil = 0;

    const tick = (timestamp) => {
      if (!lastTime) lastTime = timestamp;

      // If we're in a punctuation pause, wait it out
      if (timestamp < pauseUntil) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      // Reset lastTime after a pause so we don't "catch up" all missed chars
      if (pauseUntil > 0) {
        lastTime = timestamp;
        pauseUntil = 0;
      }

      const elapsed = timestamp - lastTime;
      // Reveal as many characters as time allows (multiple per frame for smooth movement)
      const charsToReveal = Math.floor(elapsed / speed);

      if (charsToReveal > 0) {
        // Advance one char at a time to check for pause triggers
        for (let i = 0; i < charsToReveal && count < totalChars; i++) {
          count++;
          const lastChar = text[count - 1];
          const nextChar = text[count];
          if (lastChar === '\n') {
            pauseUntil = timestamp + 500;
            break;
          } else if (PAUSE_CHARS.has(lastChar) && (nextChar === ' ' || nextChar === '\n' || count === totalChars)) {
            pauseUntil = timestamp + PAUSE_DURATION;
            break;
          }
        }
        setRevealedCount(count);
        // Carry over fractional remainder for precise timing
        lastTime = timestamp - (elapsed % speed);
      }

      if (count < totalChars) {
        rafId = requestAnimationFrame(tick);
      } else {
        setRevealedCount(Infinity);
        onCompleteRef.current?.();
      }
    };

    const timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [text, speed, delay, enabled, totalChars]);

  const isComplete = revealedCount >= totalChars;
  const revealedText = isComplete ? text : (text || '').slice(0, revealedCount);

  // Rest of current word (for layout stability — prevents word-wrap jumps)
  let lookaheadWord = '';
  if (!isComplete && text && revealedCount < totalChars) {
    const match = text.slice(revealedCount).match(/^\S*/);
    if (match && match[0]) lookaheadWord = match[0];
  }

  return { revealedText, isComplete, lookaheadWord };
}
