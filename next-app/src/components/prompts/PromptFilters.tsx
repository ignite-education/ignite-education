'use client'

import { useState, useRef, useEffect } from 'react'
import { LLM_TOOLS, COMPLEXITIES } from '@/data/placeholderPrompts'

interface PromptFiltersProps {
  professions: string[]
  selectedProfessions: string[]
  selectedTools: string[]
  selectedComplexities: string[]
  onProfessionsChange: (value: string[]) => void
  onToolsChange: (value: string[]) => void
  onComplexitiesChange: (value: string[]) => void
  onResetAll?: () => void
}

type FilterType = 'profession' | 'tool' | 'complexity'

const FILTER_LABELS: Record<FilterType, string> = {
  profession: 'Profession',
  tool: 'AI Tool',
  complexity: 'Complexity',
}

export default function PromptFilters({
  professions,
  selectedProfessions,
  selectedTools,
  selectedComplexities,
  onProfessionsChange,
  onToolsChange,
  onComplexitiesChange,
  onResetAll,
}: PromptFiltersProps) {
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null)

  const filterOptions: Record<FilterType, readonly string[]> = {
    profession: professions,
    tool: LLM_TOOLS,
    complexity: COMPLEXITIES,
  }
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

  const filterTypes: FilterType[] = ['profession', 'tool', 'complexity']
  const hasAnyFilter = selectedProfessions.length > 0 || selectedTools.length > 0 || selectedComplexities.length > 0

  const handleResetAll = () => {
    onProfessionsChange([])
    onToolsChange([])
    onComplexitiesChange([])
    onResetAll?.()
  }

  return (
    <div ref={containerRef} className="flex items-center justify-center gap-4 flex-wrap">
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
              className="text-white text-sm font-semibold rounded-[7px] transition-all cursor-pointer"
              style={{
                backgroundColor: '#8200EA',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                letterSpacing: '-0.01em',
                padding: '5px 10px',
              }}
            >
              <span className="flex items-center gap-2">
                {FILTER_LABELS[type]}
                {hasSelection ? (
                  <span
                    className="inline-flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#8200EA',
                      width: '16px',
                      height: '16px',
                      fontSize: '12px',
                      borderRadius: '3px',
                    }}
                  >
                    {selected.length}
                  </span>
                ) : (
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
                )}
              </span>
            </button>

            {isOpen && (
              <div
                className="absolute top-full left-1/2 pt-2 z-50 animate-fadeIn"
                style={{
                  transform: 'translateX(-50%)',
                  minWidth: '100%',
                  width: 'max-content',
                }}
              >
                <div
                  className="bg-white rounded-lg py-1"
                  style={{
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  }}
                >
                {filterOptions[type].map((option) => {
                  const isChecked = selected.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleToggle(type, option)}
                      className="w-full text-left px-[10px] py-1 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-3 cursor-pointer whitespace-nowrap"
                      style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.01em' }}
                    >
                      <span
                        className="shrink-0 flex items-center justify-center rounded"
                        style={{
                          width: '16px',
                          height: '16px',
                          border: isChecked ? 'none' : '1px solid #D1D5DB',
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
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={handleResetAll}
        className={`group cursor-pointer transition-opacity duration-200 ${hasAnyFilter ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        title="Reset all filters"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="transition-transform duration-300 ease-in-out group-hover:rotate-90"
        >
          <path
            d="M18.3 7.7A8 8 0 1 1 16.9 18.3"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="group-hover:stroke-[#EF0B72] transition-colors duration-300"
          />
          <polygon
            points="20,15.5 15,21 14,17"
            fill="#9CA3AF"
            className="group-hover:fill-[#EF0B72] transition-colors duration-300"
          />
        </svg>
      </button>
    </div>
  )
}
