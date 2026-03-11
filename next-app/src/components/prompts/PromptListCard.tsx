import Link from 'next/link'
import type { Prompt } from '@/data/placeholderPrompts'
import ComplexityIcon from './ComplexityIcon'

interface PromptListCardProps {
  prompt: Prompt
}

export default function PromptListCard({ prompt }: PromptListCardProps) {
  const displayTool = prompt.llmTools[0]
  const extraTools = prompt.llmTools.length - 1

  return (
    <Link
      href={`/prompts/${prompt.professionSlug}/${prompt.slug}`}
      target="_blank"
      className="group block w-full text-left bg-[#F6F6F6] rounded-[8px] pl-5 py-3"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Title */}
        <h3
          className="text-black font-semibold tracking-[-0.01em] shrink-0 truncate"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1rem', width: '25%', minWidth: '150px' }}
        >
          {prompt.title}
        </h3>

        {/* Description */}
        <p
          className="text-black font-light leading-snug line-clamp-2 min-w-0 hidden md:block shrink-0 overflow-hidden"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.8rem', letterSpacing: '-0.01em', width: '40%', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
        >
          {prompt.description}
        </p>

        {/* Tags */}
        <div className="flex items-center justify-center gap-2 shrink-0" style={{ width: '20%' }}>
          <span
            className="inline-block text-xs font-semibold px-2.5 py-1 rounded-[5px] whitespace-nowrap"
            style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
          >
            {prompt.profession}
          </span>
          {/* Complexity — hidden md→lg, visible below md (stacked) and lg+ */}
          <span
            className="inline-flex md:hidden lg:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-[5px]"
            style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
          >
            <ComplexityIcon level={prompt.complexity as 'Low' | 'Mid' | 'High'} />
          </span>
          {/* Tool — hidden md→xl, visible below md (stacked) and xl+ */}
          <span
            className="inline-block md:hidden xl:inline-block text-xs font-semibold px-2.5 py-1 rounded-[5px] whitespace-nowrap"
            style={{ backgroundColor: '#FFFFFF', color: '#7500F1', fontSize: '0.8rem', letterSpacing: '-0.01em' }}
          >
            {displayTool}{extraTools > 0 ? ` +${extraTools}` : ''}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-3 shrink-0" style={{ width: '8%' }}>
          {/* Usage — hidden md→lg, visible below md (stacked) and lg+ */}
          <span className="flex md:hidden lg:flex items-center gap-1 text-xs text-black" style={{ letterSpacing: '-0.02em' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {prompt.usageCount}
          </span>
          {/* Rating — hidden lg→xl, visible below lg and xl+ */}
          <span className="flex lg:hidden xl:flex items-center gap-1 text-xs text-black" style={{ letterSpacing: '-0.02em' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 22V11l5-9 1.5.5c1 .33 1.5 1.5 1 2.5L13 11h7a2 2 0 012 2v2a6 6 0 01-.34 2l-1.42 4.27A2 2 0 0118.36 23H9a2 2 0 01-2-1z" />
              <path d="M2 13h2v8H2z" />
            </svg>
            {prompt.rating}
          </span>
        </div>

        {/* Arrow */}
        <div className="flex items-center shrink-0 ml-auto pr-5">
          <div
            className="bg-white rounded-md flex items-center justify-center"
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
      </div>
    </Link>
  )
}
