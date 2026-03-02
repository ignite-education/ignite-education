'use client'

import { useState, useRef, useEffect } from 'react'
import { PROFESSIONS, LLM_TOOLS, COMPLEXITIES } from '@/data/placeholderPrompts'

interface PromptFiltersProps {
  selectedProfession: string | null
  selectedTool: string | null
  selectedComplexity: string | null
  onProfessionChange: (value: string | null) => void
  onToolChange: (value: string | null) => void
  onComplexityChange: (value: string | null) => void
}

type FilterType = 'profession' | 'tool' | 'complexity'

const FILTER_OPTIONS: Record<FilterType, readonly string[]> = {
  profession: PROFESSIONS,
  tool: LLM_TOOLS,
  complexity: COMPLEXITIES,
}

const FILTER_LABELS: Record<FilterType, string> = {
  profession: 'Profession',
  tool: 'LLM Tool',
  complexity: 'Complexity',
}

export default function PromptFilters({
  selectedProfession,
  selectedTool,
  selectedComplexity,
  onProfessionChange,
  onToolChange,
  onComplexityChange,
}: PromptFiltersProps) {
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getSelectedValue = (type: FilterType): string | null => {
    switch (type) {
      case 'profession': return selectedProfession
      case 'tool': return selectedTool
      case 'complexity': return selectedComplexity
    }
  }

  const getOnChange = (type: FilterType) => {
    switch (type) {
      case 'profession': return onProfessionChange
      case 'tool': return onToolChange
      case 'complexity': return onComplexityChange
    }
  }

  const handleSelect = (type: FilterType, value: string) => {
    const onChange = getOnChange(type)
    const current = getSelectedValue(type)
    onChange(current === value ? null : value)
    setOpenFilter(null)
  }

  const filterTypes: FilterType[] = ['profession', 'tool', 'complexity']

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-3 flex-wrap">
      {filterTypes.map((type) => {
        const selected = getSelectedValue(type)
        const isOpen = openFilter === type

        return (
          <div
            key={type}
            className="relative"
            onMouseEnter={() => setOpenFilter(type)}
            onMouseLeave={() => setOpenFilter(null)}
          >
            <button
              type="button"
              onClick={() => setOpenFilter(isOpen ? null : type)}
              className="text-white text-sm font-semibold px-5 py-2 rounded-[5px] transition-all cursor-pointer"
              style={{
                backgroundColor: selected ? '#6600BB' : '#8200EA',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7000C9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selected ? '#6600BB' : '#8200EA'
              }}
            >
              <span className="flex items-center gap-2">
                {selected || FILTER_LABELS[type]}
                {selected && (
                  <span className="opacity-70">&times;</span>
                )}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="shrink-0"
                >
                  <line x1="3" y1="8" x2="21" y2="8" />
                  <circle cx="16" cy="8" r="3" fill="currentColor" stroke="currentColor" className="filter-knob-top" />
                  <line x1="3" y1="16" x2="21" y2="16" />
                  <circle cx="8" cy="16" r="3" fill="currentColor" stroke="currentColor" className="filter-knob-bottom" />
                </svg>
              </span>
            </button>

            {isOpen && (
              <div
                className="absolute top-full left-1/2 mt-2 bg-white rounded-lg py-1 z-50 animate-fadeIn"
                style={{
                  transform: 'translateX(-50%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  minWidth: '180px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {FILTER_OPTIONS[type].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(type, option)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                  >
                    <span className="text-black">{option}</span>
                    {getSelectedValue(type) === option && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8200EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
