import { useState } from 'react';

export default function ThumbsFeedback({ rating, onRate, size = 16 }) {
  const [hovered, setHovered] = useState(null); // 'up' | 'down' | null

  const activeColor = '#EF0B72';
  const inactiveColor = '#000000';

  const handleClick = (value) => {
    // Toggle: clicking the same thumb clears it
    onRate(rating === value ? null : value);
  };

  return (
    <span className="inline-flex items-center gap-0.5" style={{ marginLeft: 2 }}>
      {/* Thumbs up */}
      <button
        onClick={() => handleClick(true)}
        onMouseEnter={() => setHovered('up')}
        onMouseLeave={() => setHovered(null)}
        className="p-1.5 cursor-pointer transition-colors"
        style={{ lineHeight: 0 }}
        aria-label={rating === true ? 'Remove thumbs up' : 'Thumbs up'}
        title={rating === true ? 'Remove thumbs up' : 'Thumbs up'}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={rating === true ? activeColor : hovered === 'up' ? activeColor : inactiveColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.15s, fill 0.15s' }}
        >
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </button>

      {/* Thumbs down */}
      <button
        onClick={() => handleClick(false)}
        onMouseEnter={() => setHovered('down')}
        onMouseLeave={() => setHovered(null)}
        className="p-1.5 cursor-pointer transition-colors"
        style={{ lineHeight: 0 }}
        aria-label={rating === false ? 'Remove thumbs down' : 'Thumbs down'}
        title={rating === false ? 'Remove thumbs down' : 'Thumbs down'}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={rating === false ? activeColor : hovered === 'down' ? activeColor : inactiveColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.15s, fill 0.15s' }}
        >
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </button>
    </span>
  );
}
