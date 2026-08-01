import React from 'react';
import { HelpCircle } from 'lucide-react';

const DIFFICULTY_COLOURS = {
  easy: '#2E9E5B',
  medium: '#C77700',
  hard: '#EF0B72',
};

/**
 * Scored questions render as `null` in ContentRenderer — the player takes over
 * the whole screen with an intro phase, then the question, then pass/fail.
 * There is no student markup to mirror, so the canvas shows the authored pool.
 */
const QuizCard = ({ block }) => {
  const content = block.content || {};
  const questions = content.questions || [];
  const difficulties = content.difficulties || [];
  const authored = questions.filter((q) => q && q.trim());

  return (
    <div
      style={{
        border: '1px solid #F7C3DA',
        background: '#FFF7FB',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
        <HelpCircle size={13} style={{ color: '#EF0B72' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#EF0B72', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Scored question
        </span>
        <span style={{ fontSize: '0.7rem', color: '#B0768F' }}>
          · one of {authored.length || 0} asked at random · pass mark 5/10
        </span>
      </div>

      {authored.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: '#B0768F', fontStyle: 'italic' }}>
          No questions written yet — students would be shown a blank screen.
        </p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {questions.map((q, i) =>
            q && q.trim() ? (
              <li key={i} className="flex items-start gap-2" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.02em', marginTop: 3, minWidth: 46,
                    color: DIFFICULTY_COLOURS[difficulties[i]] || '#8A8A8A',
                  }}
                >
                  {difficulties[i] || 'medium'}
                </span>
                <span className="text-base font-light leading-relaxed text-black" style={{ letterSpacing: '-0.01em' }}>
                  {q}
                </span>
              </li>
            ) : null
          )}
        </ol>
      )}
    </div>
  );
};

export default QuizCard;
