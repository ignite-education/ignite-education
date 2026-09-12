import React, { useState } from 'react';
import useTypewriter from '@shared/lesson/hooks/useTypewriter';


const getFirstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
};

const TypedCursor = () => (
  <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />
);

const QuestionResult = ({ heading, scoreLine, score, enabled, onComplete }) => {
  const [headingDone, setHeadingDone] = useState(false);

  const { revealedText: headingRevealed, isComplete: headingComplete } = useTypewriter(heading, {
    speed: 55,
    delay: 200,
    enabled,
    onComplete: enabled ? () => setHeadingDone(true) : undefined,
  });

  const { revealedText: scoreRevealed, isComplete: scoreComplete } = useTypewriter(scoreLine, {
    speed: 38,
    delay: 100,
    enabled: headingDone,
    onComplete: headingDone ? onComplete : undefined,
  });

  if (!enabled) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontWeight: 500, fontSize: '1rem', marginBottom: 4, letterSpacing: '-0.01em' }}>
        {headingRevealed}
        {enabled && !headingComplete && <TypedCursor />}
      </h3>
      {headingDone && (
        <div style={{ height: 3, marginBottom: 8, borderRadius: 2, backgroundColor: '#E0E0E0', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(score / 10) * 100}%`, backgroundColor: '#8200EA', borderRadius: 2 }} />
        </div>
      )}
      {headingDone && (
        <p className="text-base font-light leading-relaxed text-black" style={{ letterSpacing: '-0.01em', margin: 0 }}>
          {scoreRevealed}
          {!scoreComplete && <TypedCursor />}
        </p>
      )}
    </div>
  );
};

/**
 * The marked checkpoint, question by question.
 *
 * `checkpoint` is the best completed attempt — either handed straight over when the
 * student has just passed, or read back from the server on a resumed session. It is
 * null only when the lesson had no question bank and the checkpoint was skipped, in
 * which case there is nothing to score and the screen is just a sign-off.
 */
const LessonSummary = ({ checkpoint, lessonTitle, firstName, onEndLesson }) => {
  const results = (checkpoint?.results || []).filter(r => r.score != null);
  const percentage = checkpoint?.percentage ?? 0;

  const congratsText = results.length > 0
    ? `Congratulations${firstName ? ` ${firstName}` : ''}, you scored ${percentage}% on ${lessonTitle}.`
    : `Nicely done${firstName ? ` ${firstName}` : ''}, that's the end of ${lessonTitle}.`;

  const [congratsDone, setCongratsDone] = useState(false);
  // Track which questions have finished typing (index-based)
  const [completedResults, setCompletedResults] = useState(0);

  const { revealedText, isComplete } = useTypewriter(congratsText, {
    speed: 55,
    delay: 400,
    onComplete: () => setCongratsDone(true),
  });

  return (
    <div style={{ maxWidth: 640, paddingTop: 8 }}>
      <p style={{ fontWeight: 500, fontSize: '1.05rem', marginBottom: 24 }}>
        {revealedText}
        {!isComplete && <TypedCursor />}
      </p>

      {results.map((result, i) => {
        const feedbackSentence = getFirstSentence(result.feedback);
        let scoreLine = `You scored ${result.score}/10${feedbackSentence ? ` and ${feedbackSentence.charAt(0).toLowerCase()}${feedbackSentence.slice(1)}` : '.'}`;
        if (scoreLine.length > 150) scoreLine = scoreLine.slice(0, 147) + '...';

        // First question enabled after congrats, subsequent after previous completes
        const enabled = congratsDone && i <= completedResults;

        return (
          <QuestionResult
            key={i}
            heading={result.questionText || `Question ${i + 1}`}
            scoreLine={scoreLine}
            score={result.score}
            enabled={enabled}
            onComplete={() => setCompletedResults(prev => prev + 1)}
          />
        );
      })}

      {congratsDone && completedResults >= results.length && (
        <button
          onClick={onEndLesson}
          className="px-4 py-1.5 text-white transition-colors cursor-pointer"
          style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          End Lesson
        </button>
      )}
    </div>
  );
};

export default LessonSummary;
