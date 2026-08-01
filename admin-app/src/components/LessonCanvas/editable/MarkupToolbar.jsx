import React, { useState } from 'react';
import { Bold, Italic, Underline, Link2, List, User } from 'lucide-react';

const btn = {
  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 4, color: '#6B6B6B', background: 'transparent', border: 0, cursor: 'pointer',
};

/**
 * Formatting toolbar for a focused text block.
 *
 * The critical detail is `onMouseDown={preventDefault}` on the container: it
 * stops the browser moving focus, so the textarea keeps both focus AND its
 * selection when a button is pressed. That removes the need for the
 * focus/setTimeout/scrollY restoration dance the old editor repeats seven times.
 */
const MarkupToolbar = ({ onMarker, onLink, onBullet, onToken, showToken = false }) => {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('');

  const submitLink = () => {
    const trimmed = url.trim();
    if (trimmed) onLink(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    setUrl('');
    setLinkOpen(false);
  };

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="absolute flex items-center gap-0.5"
      style={{
        // Left-aligned: the block's own controls pill sits top-right.
        top: -30, left: 0, zIndex: 20,
        background: '#FFFFFF', border: '1px solid #E6E6E6', borderRadius: 6,
        padding: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <button style={btn} title="Bold  **text**" onClick={() => onMarker('**')}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2F2')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <Bold size={13} />
      </button>
      <button style={btn} title="Italic  *text*" onClick={() => onMarker('*')}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2F2')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <Italic size={13} />
      </button>
      <button style={btn} title="Underline  __text__" onClick={() => onMarker('__')}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2F2')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <Underline size={13} />
      </button>

      <div style={{ width: 1, height: 16, background: '#E6E6E6', margin: '0 2px' }} />

      <div className="relative">
        <button style={{ ...btn, background: linkOpen ? '#F2F2F2' : 'transparent' }} title="Link"
          onClick={() => setLinkOpen((v) => !v)}>
          <Link2 size={13} />
        </button>
        {linkOpen && (
          <div
            className="absolute flex items-center gap-1"
            style={{
              // Opens rightward — the toolbar is now left-aligned, so a
              // right-anchored popover would run off the canvas edge.
              top: 28, left: 0, background: '#FFFFFF', border: '1px solid #E6E6E6',
              borderRadius: 6, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 30,
            }}
          >
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitLink(); }
                if (e.key === 'Escape') { setLinkOpen(false); setUrl(''); }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="paste or type a URL"
              style={{
                width: 210, fontSize: '0.75rem', padding: '4px 6px',
                border: '1px solid #E6E6E6', borderRadius: 4, outline: 'none',
              }}
            />
            <button
              onClick={submitLink}
              style={{ fontSize: '0.7rem', fontWeight: 500, color: '#FFFFFF', background: '#EF0B72',
                       border: 0, borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      <button style={btn} title="Bullet line" onClick={onBullet}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2F2')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
        <List size={13} />
      </button>

      {showToken && (
        <button style={btn} title="Insert the student's first name" onClick={onToken}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F2F2')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          <User size={13} />
        </button>
      )}
    </div>
  );
};

export default MarkupToolbar;
