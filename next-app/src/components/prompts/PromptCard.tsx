'use client'

import type { Prompt } from '@/data/placeholderPrompts'

interface PromptCardProps {
  prompt: Prompt
  onClick: (prompt: Prompt) => void
}

export default function PromptCard({ prompt, onClick }: PromptCardProps) {
  const displayTool = prompt.llmTools[0]
  const extraTools = prompt.llmTools.length - 1

  return (
    <button
      type="button"
      onClick={() => onClick(prompt)}
      className="group block w-full text-left bg-[#F8F8F8] rounded-xl px-5 py-3 cursor-pointer"
    >
      <h3
        className="text-black font-semibold tracking-[-0.01em] mb-1.5"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
      >
        {prompt.title}
      </h3>
      <p
        className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '13px' }}
      >
        {prompt.description}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
        >
          {prompt.profession}
        </span>
        <span
          className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
        >
          {displayTool}{extraTools > 0 ? ` +${extraTools}` : ''}
        </span>
        <span
          className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
        >
          {prompt.complexity}
        </span>
      </div>
    </button>
  )
}
