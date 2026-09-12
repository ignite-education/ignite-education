import React from 'react';
import useTypewriter from '@shared/lesson/hooks/useTypewriter';

/**
 * The content column of the end-of-lesson checkpoint: the intro, and a counter
 * once the questions start.
 *
 * The questions themselves, the answer box and the marked feedback are the
 * player's existing chat furniture. A checkpoint is a conversation, so it reuses
 * the conversation UI rather than building a second one beside it — which is the
 * one thing the per-section quiz flow got right and is worth carrying over.
 */

const TypedCursor = ({ pulse }) => (
  <span
    data-scroll-anchor
    className={pulse ? 'inline-block' : 'inline-block ml-1.5'}
    style={{
      width: 8,
      height: 8,
      backgroundColor: '#8200EA',
      verticalAlign: 'middle',
      position: 'relative',
      top: '-1px',
      ...(pulse ? { animation: 'purplePulse 1.2s ease-in-out infinite' } : {}),
    }}
  />
);

const LessonCheckpoint = ({
  questionNumber,
  totalQuestions,
  lessonTitle,
  firstName,
  introPhase,
  introFading,
  onIntroComplete,
}) => {
  const count = totalQuestions || 3;
  const introText = `${firstName ? `${firstName}, that` : 'That'}'s the end of ${lessonTitle || 'this lesson'}. I'll now ask you ${count} questions on what we've covered and mark each one.\nYou'll need to average half marks or better to complete the lesson, so take your time and answer as fully as you can.\nReady to begin?`;

  // Animated only while the intro is the whole screen. Once the questions start it
  // stays as static text, so the student can still see what was asked of them.
  const { revealedText, isComplete } = useTypewriter(introPhase ? introText : '', {
    speed: 38,
    delay: 1200,
    enabled: introPhase,
    onComplete: onIntroComplete,
  });

  const lines = (revealedText || '').split('\n');

  return (
    <div>
      <div
        className="text-base font-light leading-relaxed text-black"
        style={{ letterSpacing: '-0.01em', overflowWrap: 'normal' }}
      >
        {introPhase ? (
          <>
            {lines.map((line, li) => (
              <p
                key={li}
                className={li > 0 ? 'mt-3' : ''}
                style={li > 0 ? { opacity: introFading ? 0 : 1, transition: 'opacity 0.2s ease-out' } : undefined}
              >
                {line}
                {li === lines.length - 1 && !isComplete && revealedText && <TypedCursor />}
              </p>
            ))}
            {!isComplete && !revealedText && <p><TypedCursor pulse /></p>}
          </>
        ) : (
          introText
            .split('\n')
            .filter(line => line.trim() !== 'Ready to begin?')
            .map((line, li) => (
              <p key={li} className={li > 0 ? 'mt-3' : ''}>{line}</p>
            ))
        )}
      </div>

      {!introPhase && questionNumber > 0 && (
        <p
          style={{
            fontSize: '0.8rem',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: '#8A8A8A',
            margin: '16px 0 0',
          }}
        >
          Question {questionNumber} of {count}
        </p>
      )}
    </div>
  );
};

export default LessonCheckpoint;
