'use client'

interface CourseSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  showRequestButton?: boolean
  onRequestClick?: () => void
}

export default function CourseSearch({
  value,
  onChange,
  placeholder = '',
  autoFocus = true,
  showRequestButton = false,
  onRequestClick,
}: CourseSearchProps) {
  return (
    <div
      className="w-full max-w-[660px] mx-auto relative group"
      onMouseEnter={() => {
        const input = document.querySelector<HTMLInputElement>('.course-search-input')
        if (input) input.style.boxShadow = '0 0 10px rgba(103,103,103,0.75)'
      }}
      onMouseLeave={() => {
        const input = document.querySelector<HTMLInputElement>('.course-search-input')
        if (input) input.style.boxShadow = '0 0 10px rgba(103,103,103,0.6)'
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && showRequestButton && onRequestClick) {
            e.preventDefault()
            onRequestClick()
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="course-search-input w-full bg-white rounded-xl px-6 py-3 text-gray-900 caret-[#EF0B72] focus:outline-none transition-all"
        style={{
          boxShadow: '0 0 10px rgba(103,103,103,0.6)',
          paddingRight: showRequestButton ? '160px' : '24px',
        }}
      />
      <button
        type="button"
        onClick={onRequestClick}
        className="absolute right-1 top-0 bottom-0 my-auto flex items-center gap-2 bg-[#EBEBEB]/80 rounded-lg pl-3 pr-1.5 cursor-pointer"
        style={{
          height: 'fit-content',
          paddingTop: '6px',
          paddingBottom: '6px',
          opacity: showRequestButton ? 1 : 0,
          transform: showRequestButton ? 'scale(1)' : 'scale(0.9)',
          pointerEvents: showRequestButton ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span
          className="text-black font-semibold text-sm tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
        >
          Request
        </span>
        <div
          className="bg-white rounded-md flex items-center justify-center"
          style={{ width: '28px', height: '28px' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-black group-hover:text-[#EF0B72] transition-colors"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  )
}
