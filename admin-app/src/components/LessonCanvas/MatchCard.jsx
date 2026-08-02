import React from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { BOX_MATCH_MAX_PAIRS, BOX_MATCH_MIN_PAIRS, boxMatchPairs } from '@shared/lesson/blockTypes';

/**
 * Box-matching exercise authoring, on the canvas.
 *
 * One deliberate departure from the canvas's usual mirror-the-student rule: the
 * student sees the two columns shuffled and misaligned, which is precisely the
 * view an author cannot work in. Rows here are kept aligned so each name sits
 * beside the description it belongs to. Everything else — the two-column
 * proportions, the box treatment — matches what students get.
 *
 * Blank rows are dropped at render, so an author can leave the fourth pair empty
 * and ship three. Below two complete pairs the block renders nothing at all and
 * stops gating, which is what the warning is for.
 */
const MatchCard = ({ block, onUpdateContent }) => {
  const pairs = block.content?.pairs || [];
  const complete = boxMatchPairs(block.content).length;

  const write = (next) => onUpdateContent({ ...(block.content || {}), pairs: next });

  const setField = (idx, field, value) => {
    const next = pairs.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    write(next);
  };

  const addPair = () => {
    if (pairs.length >= BOX_MATCH_MAX_PAIRS) return;
    write([...pairs, { name: '', description: '' }]);
  };

  const removePair = (idx) => {
    if (pairs.length <= BOX_MATCH_MIN_PAIRS) return;
    write(pairs.filter((_, i) => i !== idx));
  };

  const fieldStyle = {
    width: '100%',
    border: '1px solid #F0D3E1',
    borderRadius: 6,
    background: '#FFFFFF',
    padding: '8px 10px',
    fontSize: '0.87rem',
    letterSpacing: '-0.01em',
    fontFamily: 'inherit',
    color: '#000000',
    outline: 'none',
    resize: 'none',
  };

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
        <ArrowLeftRight size={13} style={{ color: '#EF0B72' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#EF0B72', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Matching
        </span>
        <span style={{ fontSize: '0.7rem', color: '#B0768F' }}>
          · {complete} of {pairs.length} pairs written · all must be matched to continue
        </span>
      </div>

      {complete < BOX_MATCH_MIN_PAIRS && (
        <p style={{ fontSize: '0.8rem', color: '#B0768F', fontStyle: 'italic', marginBottom: 10 }}>
          Fewer than {BOX_MATCH_MIN_PAIRS} complete pairs — students would see nothing here and the screen
          would not gate.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pairs.map((pair, idx) => (
          <div key={idx} className="group/pair flex items-start gap-8" style={{ position: 'relative' }}>
            <div style={{ flex: '0 0 38%', minWidth: 0 }}>
              <input
                value={pair?.name || ''}
                onChange={(e) => setField(idx, 'name', e.target.value)}
                placeholder={`Name ${idx + 1}`}
                style={fieldStyle}
              />
            </div>
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <textarea
                value={pair?.description || ''}
                onChange={(e) => setField(idx, 'description', e.target.value)}
                placeholder={`Description ${idx + 1}`}
                rows={2}
                style={fieldStyle}
              />
            </div>
            {pairs.length > BOX_MATCH_MIN_PAIRS && (
              <button
                onClick={() => removePair(idx)}
                title="Remove this pair"
                className="opacity-0 group-hover/pair:opacity-100 transition p-0.5 rounded hover:bg-white text-gray-400 hover:text-red-600"
                style={{ position: 'absolute', top: 6, right: -20 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {pairs.length < BOX_MATCH_MAX_PAIRS && (
        <button
          onClick={addPair}
          className="text-xs transition"
          style={{ color: '#B0768F', marginTop: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF0B72'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#B0768F'; }}
        >
          + add pair
        </button>
      )}
    </div>
  );
};

export default MatchCard;
