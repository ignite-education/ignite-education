'use client'

import { SENIORITY_LEVELS, SENIORITY_LABELS } from '@/lib/seniorityLabels'
import type { Seniority } from '@/data/jobsData'

/**
 * Left-column filter panel.
 *
 * A sidebar wants its options open and countable at a glance, so these are
 * expanded checkbox groups rather than the hover-dropdown chips the Prompts
 * toolkit uses — the same controls, laid out for a column instead of a bar.
 * Purple accent and checkbox styling are kept identical to PromptFilters so the
 * two tools still feel like one product.
 */

export const WORK_TYPES = ['Remote', 'On-site / hybrid'] as const

interface JobFilterPanelProps {
  professions: string[]
  selectedProfessions: string[]
  selectedSeniorities: string[]
  selectedWorkTypes: string[]
  onProfessionsChange: (value: string[]) => void
  onSeniorityChange: (value: string[]) => void
  onWorkTypesChange: (value: string[]) => void
  onResetAll: () => void
  /** True on /jobs/[professionSlug], where the URL already pins the profession. */
  hideProfession?: boolean
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

function FilterGroup({
  label,
  options,
  selected,
  onChange,
  renderLabel,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (value: string[]) => void
  renderLabel?: (option: string) => string
}) {
  if (options.length === 0) return null

  return (
    <div className="mb-7">
      {/* Group heading and options below take the course pages' module title and
          module description styles verbatim (CourseCurriculum) — the board's
          sidebar reads as the same kind of content as a curriculum column. */}
      <h3
        className="font-semibold mb-2.5"
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '18px', color: '#7714E0', letterSpacing: '-0.01em' }}
      >
        {label}
      </h3>
      <div className="flex flex-col gap-1.5">
        {options.map(option => {
          const isChecked = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(toggle(selected, option))}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <span
                className="shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: '16px',
                  height: '16px',
                  // No border: the box is a solid white tile against the
                  // section's grey band when empty, purple when ticked. The
                  // contrast with the band is what makes it a box.
                  backgroundColor: isChecked ? '#8200EA' : '#FFFFFF',
                  borderRadius: '4px',
                }}
              >
                {isChecked && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span
                className="text-gray-900 font-normal transition-colors"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em' }}
              >
                {renderLabel ? renderLabel(option) : option}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function JobFilterPanel({
  professions,
  selectedProfessions,
  selectedSeniorities,
  selectedWorkTypes,
  onProfessionsChange,
  onSeniorityChange,
  onWorkTypesChange,
  onResetAll,
  hideProfession,
}: JobFilterPanelProps) {
  const hasAnyFilter =
    (!hideProfession && selectedProfessions.length > 0) ||
    selectedSeniorities.length > 0 ||
    selectedWorkTypes.length > 0

  return (
    <div>
      {/* No "Filter" heading, and nothing above the first group: the column's
          first heading has to start on the same line as the first card's top
          edge, so anything here would push it down. "Clear all" moved below the
          groups for the same reason. */}
      {!hideProfession && (
        <FilterGroup
          label="Profession"
          options={professions}
          selected={selectedProfessions}
          onChange={onProfessionsChange}
        />
      )}

      <FilterGroup
        label="Experience"
        options={SENIORITY_LEVELS}
        selected={selectedSeniorities}
        onChange={onSeniorityChange}
        renderLabel={option => SENIORITY_LABELS[option as Seniority] || option}
      />

      <FilterGroup
        label="Work type"
        options={WORK_TYPES}
        selected={selectedWorkTypes}
        onChange={onWorkTypesChange}
      />

      {/* Held in the layout even while invisible, so clearing or setting a
          filter never makes the column above it move. */}
      <button
        type="button"
        onClick={onResetAll}
        className={`text-[#EF0B72] hover:underline transition-opacity ${hasAnyFilter ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.78rem', letterSpacing: '-0.01em' }}
      >
        Clear all
      </button>
    </div>
  )
}
