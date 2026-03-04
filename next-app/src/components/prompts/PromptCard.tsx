import Link from 'next/link'
import type { Prompt } from '@/data/placeholderPrompts'

interface PromptCardProps {
  prompt: Prompt
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const displayTool = prompt.llmTools[0]
  const extraTools = prompt.llmTools.length - 1

  return (
    <Link
      href={`/prompts/${prompt.slug}`}
      target="_blank"
      className="group block w-full text-left bg-[#F6F6F6] rounded-[8px] px-5 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-black font-semibold tracking-[-0.01em] mb-1"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.1rem' }}
          >
            {prompt.title}
          </h3>
          <p
            className="text-black text-sm font-light leading-snug mb-3 line-clamp-3"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em' }}
          >
            {prompt.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-block text-xs font-semibold px-2.5 py-1 rounded-[5px]"
              style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
            >
              {prompt.profession}
            </span>
            <span
              className="inline-block text-xs font-semibold px-2.5 py-1 rounded-[5px]"
              style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
            >
              {displayTool}{extraTools > 0 ? ` +${extraTools}` : ''}
            </span>
            <span
              className="inline-block text-xs font-semibold px-2.5 py-1 rounded-[5px]"
              style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
            >
              {prompt.complexity}
            </span>
          </div>
        </div>
        <div
          className="bg-white rounded-md flex items-center justify-center shrink-0"
          style={{ width: '35px', height: '35px' }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#D8D8D8] group-hover:text-[#EF0B72] transition-colors"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
