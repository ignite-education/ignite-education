import React from 'react';
import { Pin } from 'lucide-react';

/**
 * The headings still pinned above a screen that doesn't declare its own.
 *
 * In the player, headings don't scroll away — the active H2 and H3 render as
 * fixed section headers, so a heading authored on screen 3 is still on screen
 * for screens 4, 5, 6… The old editor showed a heading exactly once, in the
 * flat list, which gave authors no way to see how far its reach extended.
 *
 * Rendered at the real H2/H3 metrics but muted, so a screen reads correctly
 * without the carried heading being mistaken for content authored here.
 */
const InheritedHeadings = ({ h2, h2Inherited, h2FromGroupIndex, h3, h3Inherited, h3FromGroupIndex }) => {
  const showH2 = h2 && h2Inherited;
  const showH3 = h3 && h3Inherited;
  if (!showH2 && !showH3) return null;

  const from = showH2 ? h2FromGroupIndex : h3FromGroupIndex;

  return (
    <div
      style={{
        marginBottom: 14,
        paddingLeft: 12,
        borderLeft: '2px solid #E6E6E6',
        opacity: 0.55,
      }}
    >
      {showH2 && (
        <div className="mb-1" style={{ marginTop: 0 }}>
          <h2 className="text-xl" style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
            {h2.content?.text || h2.title}
          </h2>
        </div>
      )}
      {showH3 && (
        <h3 className="text-lg mb-1" style={{ fontWeight: 500, letterSpacing: '-0.01em', marginTop: showH2 ? 8 : 0 }}>
          {h3.content?.text || h3.title}
        </h3>
      )}
      <span
        className="flex items-center gap-1 text-xs"
        style={{ color: '#8A8A8A', marginTop: 2 }}
      >
        <Pin size={10} />
        still showing from screen {from + 1}
      </span>
    </div>
  );
};

export default InheritedHeadings;
