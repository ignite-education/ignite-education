import React, { useState } from 'react';
import useTypewriter from '../hooks/useTypewriter';


const getFirstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
};

const TypedCursor = () => (
  <span className="inline-block ml-1.5" style={{ width: 8, height: 8, backgroundColor: '#8200EA', verticalAlign: 'middle', position: 'relative', top: '-1px' }} />
);

const SectionResult = ({ heading, scoreLine, score, enabled, onComplete }) => {
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

const LessonSummary = ({ sectionScores, scoredQuestionHeadings, lessonTitle, firstName, onEndLesson }) => {
  const validScores = scoredQuestionHeadings
    ? sectionScores.filter(s => s.section_number in scoredQuestionHeadings)
    : sectionScores;

  const totalScore = validScores.reduce((sum, s) => sum + s.score, 0);
  const maxScore = validScores.length * 10;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const congratsText = `Congratulations${firstName ? ` ${firstName}` : ''}, you scored ${percentage}% on ${lessonTitle}.`;

  const [congratsDone, setCongratsDone] = useState(false);
  // Track which sections have finished typing (index-based)
  const [completedSections, setCompletedSections] = useState(0);

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

      {validScores.map((sectionScore, i) => {
        const heading = scoredQuestionHeadings?.[sectionScore.section_number] || `Section ${sectionScore.section_number}`;
        const feedbackSentence = getFirstSentence(sectionScore.feedback);
        let scoreLine = `You scored ${sectionScore.score}/10${feedbackSentence ? ` and ${feedbackSentence.charAt(0).toLowerCase()}${feedbackSentence.slice(1)}` : '.'}`;
        if (scoreLine.length > 150) scoreLine = scoreLine.slice(0, 147) + '...';

        // First section enabled after congrats, subsequent after previous completes
        const sectionEnabled = congratsDone && i <= completedSections;

        return (
          <SectionResult
            key={sectionScore.section_number}
            heading={heading}
            scoreLine={scoreLine}
            score={sectionScore.score}
            enabled={sectionEnabled}
            onComplete={() => setCompletedSections(prev => prev + 1)}
          />
        );
      })}

      {congratsDone && completedSections >= validScores.length && (
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
