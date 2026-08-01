import React, { useState } from 'react';
import { CircleSlash, Undo2 } from 'lucide-react';

/**
 * Marks the screen where an author ended a suggested-question chip early.
 *
 * Without this the chip runs until the next H2. The marker is stored on the
 * screen's first block, so it travels with that block if the lesson is
 * reordered — which is the behaviour you want, since the author chose "stop at
 * this piece of content", not "stop at position 7".
 */
const SuggestedQuestionStop = ({ onUndo }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="flex items-center gap-1.5 text-xs"
        style={{
          color: '#8A8A8A',
          border: '1px dashed #D8D8D8',
          borderRadius: 999,
          padding: '3px 10px',
        }}
      >
        <CircleSlash size={11} />
        suggested question ends here
      </span>
      <button
        onClick={onUndo}
        className="text-xs text-gray-400 hover:text-gray-800 transition flex items-center gap-1"
        style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s ease' }}
        title="Let the chip carry on to this screen again"
      >
        <Undo2 size={11} /> undo
      </button>
    </div>
  );
};

export default SuggestedQuestionStop;
