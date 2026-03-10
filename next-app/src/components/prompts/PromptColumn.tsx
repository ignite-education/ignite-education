'use client'

import { useAutoAnimate } from '@formkit/auto-animate/react'
import type { Prompt } from '@/data/placeholderPrompts'
import PromptCard from './PromptCard'

type ColumnType = 'most-used' | 'highly-rated' | 'most-recent'

const COLUMN_CONFIG: Record<ColumnType, { title: string; description: string }> = {
  'most-used': {
    title: 'Most Used',
    description: 'The top utilised LLM\nprompts from the Toolkit',
  },
  'highly-rated': {
    title: 'Highly Rated',
    description: 'The highest rated prompts\nas scored by Ignite users',
  },
  'most-recent': {
    title: 'Most Recent',
    description: 'The newest prompts\nfrom the community',
  },
}

interface PromptColumnProps {
  type: ColumnType
  prompts: Prompt[]
  columnIndex?: number
}

export default function PromptColumn({ type, prompts, columnIndex = 0 }: PromptColumnProps) {
  const config = COLUMN_CONFIG[type]
  const [animateRef] = useAutoAnimate({ duration: 150, easing: 'ease-out' })

  return (
    <div className="flex flex-col">
      <h2
        className="text-[22px] font-bold text-[#EF0B72] mb-1 text-center tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
      >
        {config.title}
      </h2>
      <p
        className="text-black text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
      >
        {config.description}
      </p>
      <div ref={animateRef} className="space-y-3">
        {prompts.map((prompt, index) => (
          <div
            key={prompt.id}
            style={{
              animation: 'fadeInUp 0.6s ease-out',
              animationDelay: `${index * 0.15}s`,
              opacity: 0,
              animationFillMode: 'forwards',
            }}
          >
            <PromptCard prompt={prompt} />
          </div>
        ))}
      </div>
    </div>
  )
}
