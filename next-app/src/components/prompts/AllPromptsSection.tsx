'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

import type { Prompt } from '@/data/placeholderPrompts'
import PromptListCard from './PromptListCard'

const PAGE_SIZE = 20

type SortOption = 'title' | 'profession' | 'complexity' | 'copies' | 'likes'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'profession', label: 'Profession' },
  { value: 'complexity', label: 'Complexity' },
  { value: 'copies', label: 'Usage' },
  { value: 'likes', label: 'Like' },
]

const COMPLEXITY_ORDER: Record<string, number> = { Low: 0, Mid: 1, High: 2 }

interface AllPromptsSectionProps {
  prompts: Prompt[]
}

export default function AllPromptsSection({ prompts }: AllPromptsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sortBy, setSortBy] = useState<SortOption>('title')
  const [sortAsc, setSortAsc] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc((prev) => !prev)
    } else {
      setSortBy(option)
      setSortAsc(true)
    }
  }

  const renderSortButton = (value: SortOption) => {
    const label = SORT_OPTIONS.find((o) => o.value === value)!.label
    const isActive = sortBy === value
    return (
      <button
        onClick={() => handleSort(value)}
        className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-[5px] transition-all duration-300 ${
          isActive
            ? 'bg-[#7500F1] text-white'
            : 'bg-[#F6F6F6] text-black hover:bg-[#EBEBEB]'
        }`}
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.01em' }}
      >
        <span
          className="inline-flex overflow-hidden shrink-0"
          style={{
            width: isActive ? '12px' : '0px',
            marginRight: isActive ? '6px' : '0px',
            opacity: isActive ? 1 : 0,
            transition: 'width 300ms ease-out, margin-right 300ms ease-out, opacity 200ms ease-out',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <line x1="7" y1="4" x2="7" y2="20" />
            <path d="M4 17l3 3 3-3" style={{ opacity: sortAsc ? 1 : 0, transition: 'opacity 300ms ease-out' }} />
            <path d="M4 7l3-3 3 3" style={{ opacity: sortAsc ? 0 : 1, transition: 'opacity 300ms ease-out' }} />
            <line x1="13" y1="6" x2="21" y2="6" style={{ transformOrigin: '13px 6px', transform: `scaleX(${sortAsc ? 1 : 0.375})`, transition: 'transform 300ms ease-out' }} />
            <line x1="13" y1="12" x2="21" y2="12" style={{ transformOrigin: '13px 12px', transform: 'scaleX(0.75)' }} />
            <line x1="13" y1="18" x2="21" y2="18" style={{ transformOrigin: '13px 18px', transform: `scaleX(${sortAsc ? 0.375 : 1})`, transition: 'transform 300ms ease-out' }} />
          </svg>
        </span>
        {label}
      </button>
    )
  }

  // Reset visible count when prompts or sort change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [prompts, sortBy, sortAsc])

  const sortedPrompts = useMemo(() => {
    const list = [...prompts]
    const dir = sortAsc ? 1 : -1
    switch (sortBy) {
      case 'title':
        return list.sort((a, b) => dir * a.title.localeCompare(b.title))
      case 'profession':
        return list.sort((a, b) => dir * (a.profession.localeCompare(b.profession) || a.title.localeCompare(b.title)))
      case 'complexity':
        return list.sort((a, b) => dir * ((COMPLEXITY_ORDER[b.complexity] ?? 0) - (COMPLEXITY_ORDER[a.complexity] ?? 0) || a.title.localeCompare(b.title)))
      case 'copies':
        return list.sort((a, b) => dir * (b.usageCount - a.usageCount || a.title.localeCompare(b.title)))
      case 'likes':
        return list.sort((a, b) => dir * (b.rating - a.rating || a.title.localeCompare(b.title)))
      default:
        return list
    }
  }, [prompts, sortBy, sortAsc])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, prompts.length))
        }
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [prompts.length, visibleCount])

  if (prompts.length === 0) return null

  const visiblePrompts = sortedPrompts.slice(0, visibleCount)
  const hasMore = visibleCount < sortedPrompts.length

  return (
    <div>
      <h2
        className="text-[22px] text-black tracking-[-0.01em] text-left"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', marginBottom: '10px', fontWeight: 600 }}
      >
        All Prompts
      </h2>
      <div className="flex items-center gap-2 mb-4">
        {renderSortButton('title')}
        {renderSortButton('profession')}
        {renderSortButton('complexity')}
        {renderSortButton('copies')}
        {renderSortButton('likes')}
      </div>
      <div className="space-y-3">
        {visiblePrompts.map((prompt) => (
          <PromptListCard key={prompt.id} prompt={prompt} />
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-10" />}
    </div>
  )
}
