import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Check, X, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { TEXT_METRICS } from '@shared/lesson/textMetrics';
import { generateParagraph, fetchParagraphGuidance } from '../../../lib/claude';

const GUIDANCE_KEY = 'paragraphGuidance';
const field =
  'w-full px-2 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-gray-900 placeholder-gray-400 focus:border-pink-500 focus:outline-none';

/**
 * Write or rewrite one paragraph with AI, without touching the existing text
 * until the author accepts it.
 *
 * The proposal is held in local state and rendered beside the current text at
 * the real body metrics, so what you approve is what students read. Nothing is
 * written to the block until Accept — Discard leaves the original untouched.
 *
 * Guidance is editable and persisted to localStorage (same pattern as the SVG
 * rules), seeded from the server's house style so it starts useful rather than
 * blank.
 */
const ParagraphAI = ({ currentText, context, onAccept, onClose }) => {
  const [guidance, setGuidance] = useState(() => localStorage.getItem(GUIDANCE_KEY) || '');
  const [showGuidance, setShowGuidance] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const hasText = !!(currentText && currentText.trim());

  // Seed the box with the server's house style so it's visible and editable
  // rather than an empty field the author has to guess at.
  useEffect(() => {
    if (guidance) return;
    let cancelled = false;
    fetchParagraphGuidance()
      .then((g) => { if (!cancelled) setGuidance(g); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGuidance = (value) => {
    setGuidance(value);
    localStorage.setItem(GUIDANCE_KEY, value);
  };

  const run = async (mode) => {
    setBusy(true);
    setError(null);
    try {
      const { text } = await generateParagraph(mode, {
        existingText: currentText || '',
        instruction,
        guidance,
        ...context,
      });
      setProposal(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const metrics = TEXT_METRICS.paragraph;

  return (
    <div
      style={{
        marginTop: 8, marginBottom: 12, padding: 10,
        border: '1px solid #E6E6E6', borderRadius: 6, background: '#FCFCFC',
      }}
    >
      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 8 }}>
        <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <Sparkles size={12} style={{ color: '#8200EA' }} />
          {hasText ? 'Enhance this paragraph' : 'Write this paragraph'}
        </span>
        <div className="flex-1" />
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-900">
          Close
        </button>
      </div>

      <div className="flex gap-1.5" style={{ marginBottom: 8 }}>
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy) run(hasText ? 'enhance' : 'generate'); }}
          placeholder={hasText
            ? 'Optional: what to change — e.g. "shorter, add an example"'
            : 'Optional: what this paragraph should cover'}
          className={field}
        />
        <button
          onClick={() => run(hasText ? 'enhance' : 'generate')}
          disabled={busy}
          className="flex-shrink-0 px-2.5 py-1.5 border border-purple-200 bg-purple-50 rounded-md hover:bg-purple-100 text-xs text-purple-700 flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {busy ? 'Writing…' : hasText ? 'Enhance' : 'Generate'}
        </button>
      </div>

      {/* Guidance — visible and editable, not hidden in a prompt somewhere */}
      <div style={{ marginBottom: proposal ? 10 : 0 }}>
        <button
          onClick={() => setShowGuidance((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          {showGuidance ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Rules &amp; guidance
          <span className="text-gray-400">
            ({guidance ? `${guidance.split('\n').filter(Boolean).length} rules` : 'loading…'})
          </span>
        </button>
        {showGuidance && (
          <>
            <textarea
              value={guidance}
              onChange={(e) => saveGuidance(e.target.value)}
              rows={9}
              spellCheck={false}
              className={`${field} font-mono`}
              style={{ marginTop: 6, resize: 'vertical', lineHeight: 1.5 }}
            />
            <p className="text-xs text-gray-400" style={{ marginTop: 4 }}>
              Applies to every paragraph you generate. Saved in this browser.
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#EF0B72', marginTop: 6 }}>{error}</p>
      )}

      {proposal && (
        <div style={{ marginTop: 10 }}>
          <div className="grid gap-3" style={{ gridTemplateColumns: hasText ? '1fr 1fr' : '1fr' }}>
            {hasText && (
              <div>
                <span className="block text-xs font-medium text-gray-400 mb-1">Current</span>
                <div
                  style={{
                    ...metrics, marginTop: 0, marginBottom: 0, opacity: 0.5,
                    padding: 8, border: '1px solid #EDEDED', borderRadius: 4, background: '#FFFFFF',
                  }}
                >
                  {currentText}
                </div>
              </div>
            )}
            <div>
              <span className="block text-xs font-medium mb-1" style={{ color: '#8200EA' }}>
                Proposed
              </span>
              {/* Editable before accepting — usually it needs one small tweak,
                  not a full regenerate. */}
              <textarea
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                rows={6}
                style={{
                  ...metrics, marginTop: 0, marginBottom: 0, width: '100%',
                  padding: 8, border: '1px solid #D9BBF5', borderRadius: 4,
                  background: '#FFFFFF', outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
            <button
              onClick={() => { onAccept(proposal); setProposal(null); onClose(); }}
              className="px-2.5 py-1.5 bg-gray-900 text-white rounded-md hover:bg-black text-xs font-medium flex items-center gap-1.5"
            >
              <Check size={12} /> {hasText ? 'Replace paragraph' : 'Use this'}
            </button>
            <button
              onClick={() => run(hasText ? 'enhance' : 'generate')}
              disabled={busy}
              className="px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 text-xs text-gray-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw size={12} /> Try again
            </button>
            <button
              onClick={() => setProposal(null)}
              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 flex items-center gap-1.5"
            >
              <X size={12} /> Discard
            </button>
            {hasText && (
              <span className="text-xs text-gray-400">
                Your current text is untouched until you replace it.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParagraphAI;
