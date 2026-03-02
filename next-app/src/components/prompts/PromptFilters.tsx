'use client'

import { useState, useRef, useEffect } from 'react'
import { PROFESSIONS, LLM_TOOLS, COMPLEXITIES } from '@/data/placeholderPrompts'

interface PromptFiltersProps {
  selectedProfessions: string[]
  selectedTools: string[]
  selectedComplexities: string[]
  onProfessionsChange: (value: string[]) => void
  onToolsChange: (value: string[]) => void
  onComplexitiesChange: (value: string[]) => void
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
  selectedProfessions,
  selectedTools,
  selectedComplexities,
  onProfessionsChange,
  onToolsChange,
  onComplexitiesChange,
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

  const getSelectedValues = (type: FilterType): string[] => {
    switch (type) {
      case 'profession': return selectedProfessions
      case 'tool': return selectedTools
      case 'complexity': return selectedComplexities
    }
  }

  const getOnChange = (type: FilterType) => {
    switch (type) {
      case 'profession': return onProfessionsChange
      case 'tool': return onToolsChange
      case 'complexity': return onComplexitiesChange
    }
  }

  const handleToggle = (type: FilterType, value: string) => {
    const onChange = getOnChange(type)
    const current = getSelectedValues(type)
    if (current.includes(value)) {
      onChange(current.filter(v => v !== value))
    } else {
      onChange([...current, value])
    }
  }

  const handleClear = (type: FilterType) => {
    getOnChange(type)([])
  }

  const filterTypes: FilterType[] = ['profession', 'tool', 'complexity']

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-3 flex-wrap">
      {filterTypes.map((type) => {
        const selected = getSelectedValues(type)
        const hasSelection = selected.length > 0
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
              className="text-white text-sm font-semibold px-5 py-2 rounded-[7px] transition-all cursor-pointer"
              style={{
                backgroundColor: hasSelection ? '#6600BB' : '#8200EA',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7000C9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = hasSelection ? '#6600BB' : '#8200EA'
              }}
            >
              <span className="flex items-center gap-2">
                {FILTER_LABELS[type]}
                {hasSelection && (
                  <span
                    className="inline-flex items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      width: '20px',
                      height: '20px',
                      fontSize: '11px',
                    }}
                  >
                    {selected.length}
                  </span>
                )}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
                {FILTER_OPTIONS[type].map((option) => {
                  const isChecked = selected.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleToggle(type, option)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer"
                      style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                    >
                      <span
                        className="shrink-0 flex items-center justify-center rounded"
                        style={{
                          width: '16px',
                          height: '16px',
                          border: isChecked ? 'none' : '2px solid #D1D5DB',
                          backgroundColor: isChecked ? '#8200EA' : 'transparent',
                          borderRadius: '4px',
                        }}
                      >
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="text-black">{option}</span>
                    </button>
                  )
                })}
                {hasSelection && (
                  <button
                    type="button"
                    onClick={() => handleClear(type)}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                    style={{
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      color: '#8200EA',
                      borderTop: '1px solid #E5E7EB',
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
