import Link from 'next/link'
import type { Prompt } from '@/data/placeholderPrompts'
import ComplexityIcon from './ComplexityIcon'

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
      className="group block w-full text-left bg-[#F6F6F6] rounded-[8px] px-5 py-4"
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
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-[5px]"
              style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
            >
              <ComplexityIcon level={prompt.complexity as 'Low' | 'Mid' | 'High'} />
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-black" style={{ letterSpacing: '-0.02em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {prompt.usageCount}
            </span>
            <span className="flex items-center gap-1 text-xs text-black" style={{ letterSpacing: '-0.02em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 22V11l5-9 1.5.5c1 .33 1.5 1.5 1 2.5L13 11h7a2 2 0 012 2v2a6 6 0 01-.34 2l-1.42 4.27A2 2 0 0118.36 23H9a2 2 0 01-2-1z" />
                <path d="M2 13h2v8H2z" />
              </svg>
              {prompt.rating}
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
