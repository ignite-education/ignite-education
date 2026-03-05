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
}

export default function PromptColumn({ type, prompts }: PromptColumnProps) {
  const config = COLUMN_CONFIG[type]
  const [animateRef] = useAutoAnimate((el, action, oldCoords, newCoords) => {
    const duration = 150
    const easing = 'ease-out'

    if (action === 'add') {
      return new KeyframeEffect(el, [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration, easing })
    }
    if (action === 'remove') {
      return new KeyframeEffect(el, [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-8px)' },
      ], { duration, easing })
    }
    // remain — slide into new position
    const deltaY = (oldCoords?.top ?? 0) - (newCoords?.top ?? 0)
    return new KeyframeEffect(el, [
      { transform: `translateY(${deltaY}px)` },
      { transform: 'translateY(0)' },
    ], { duration, easing })
  })

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
        {prompts.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} />
        ))}
      </div>
    </div>
  )
}
