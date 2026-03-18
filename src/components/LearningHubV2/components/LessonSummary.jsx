import React from 'react';

const SECTION_COLORS = ['#EF0B72', '#8200EA', '#8200EA', '#EF0B72', '#8200EA', '#8200EA'];

const getFirstSentence = (text) => {
  if (!text) return '';
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.trim();
};

const LessonSummary = ({ sectionScores, sectionHeadings, lessonTitle, firstName, onEndLesson }) => {
  const totalScore = sectionScores.reduce((sum, s) => sum + s.score, 0);
  const maxScore = sectionScores.length * 10;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return (
    <div style={{ maxWidth: 640, paddingTop: 8 }}>
      <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 24 }}>
        Congratulations {firstName}, you scored {percentage}% on {lessonTitle}.
      </p>

      {sectionScores.map((sectionScore, i) => {
        const heading = sectionHeadings[sectionScore.section_number - 1] || `Section ${sectionScore.section_number}`;
        const color = SECTION_COLORS[i % SECTION_COLORS.length];
        const feedbackSentence = getFirstSentence(sectionScore.feedback);

        return (
          <div key={sectionScore.section_number} style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 500, fontSize: '1rem', marginBottom: 4, letterSpacing: '-0.01em' }}>
              Section {sectionScore.section_number}: {heading}
            </h3>
            <div style={{ height: 3, backgroundColor: color, marginBottom: 8, borderRadius: 2 }} />
            <p style={{ fontSize: '0.92rem', color: '#333', lineHeight: 1.5, margin: 0 }}>
              You scored {sectionScore.score}/10{feedbackSentence ? ` and ${feedbackSentence.charAt(0).toLowerCase()}${feedbackSentence.slice(1)}` : '.'}
            </p>
          </div>
        );
      })}

      <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: 1.5, marginTop: 8, marginBottom: 32 }}>
        In the future if you retake a lesson, we will always save and use your highest question score for each section.
      </p>

      <button
        onClick={onEndLesson}
        className="px-4 py-1.5 text-white transition-colors cursor-pointer"
        style={{ borderRadius: 6, backgroundColor: '#EF0B72', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '-0.01em' }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        End Lesson
      </button>
    </div>
  );
};

export default LessonSummary;
