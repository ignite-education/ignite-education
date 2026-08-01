import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * The marker that heads each student screen.
 *
 * Screens are not an editor invention — `groupSectionsByHeading` is what the
 * player paginates with, so every marker here is a real Continue press.
 * Warnings surface behaviour that is otherwise invisible until a student hits it.
 */
const ScreenBreak = ({ index, total, warnings = [], isFirst = false }) => {
  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  return (
    <div
      className="relative select-none"
      // Sits above its own screen; the cell below supplies the gap to the
      // content, so no bottom margin is needed here.
      style={{ marginTop: isFirst ? 18 : 34, marginBottom: 0 }}
    >
      <div style={{ borderTop: '1px solid #000000' }} />

      {/* Inset 40px to line up with the text column, while the rule itself runs
          the full width of the canvas behind it. */}
      <div
        className="absolute flex items-center gap-2"
        style={{ top: -11, left: 40 }}
      >
        <span
          className="whitespace-nowrap"
          style={{
            background: '#FFFFFF',
            border: '1px solid #000000',
            borderRadius: 999,
            padding: '2px 10px',
            fontSize: '0.7rem',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: '#000000',
          }}
        >
          Screen {index + 1} of {total} · {progress}%
        </span>

        {warnings.map((w) => (
          <span
            key={w}
            className="flex items-center gap-1 whitespace-nowrap"
            style={{
              background: '#FFFFFF',
              border: '1px solid #F7C3DA',
              borderRadius: 999,
              padding: '2px 10px',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: '#EF0B72',
            }}
          >
            <AlertTriangle size={11} />
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ScreenBreak;
