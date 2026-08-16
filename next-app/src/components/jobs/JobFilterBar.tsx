'use client'

import { useState, useRef, useEffect } from 'react'
import { SENIORITY_LEVELS, SENIORITY_LABELS } from '@/lib/seniorityLabels'
import type { Seniority } from '@/data/jobsData'

/**
 * The board's controls, in a row above the two panes.
 *
 * This replaces the left-hand JobFilterPanel, which had to go when the list and
 * the detail pane took both columns. The controls did not simply rotate: a
 * sidebar can afford to hold every option open and countable, and a bar cannot,
 * so each group collapses to a chip that opens on hover — the same hover-
 * dropdown pattern PromptFilters uses on /prompts, down to the purple chip, the
 * count badge that replaces the glyph once something is picked, and the
 * spring-loaded reset arrow. Two tools, one bar; a visitor who has used the
 * prompt toolkit already knows how this works.
 *
 * The search box is new, and the reason the bar earns its place. Filters answer
 * "show me this kind of role"; search answers "show me THIS role", which is what
 * someone arriving from a Google result for a specific employer actually wants,
 * and no combination of three checkbox groups could do it.
 */

export const WORK_TYPES = ['Remote', 'On-site / hybrid'] as const

/**
 * Fixed width for the dropdown menus, and the margin they keep from the window.
 *
 * Fixed rather than `width: max-content`, which is what /prompts uses and what
 * this started as. max-content sizes to the longest option — "Digital Marketing
 * Specialist" comes out at 219px — and an absolutely positioned box that wide,
 * anchored to a chip near the right of a phone, hangs off the side of the
 * document. That widens the PAGE, not just the menu: these panels stay in the
 * layout when closed (they are faded out, not unmounted, so the fade has
 * something to run on), so every visitor got a horizontally scrolling board
 * whether or not they ever opened a filter.
 *
 * A known width also makes the flip below exact — there is nothing to measure
 * on a menu that has not been rendered yet.
 */
const MENU_WIDTH = 248
const VIEWPORT_MARGIN = 12

type FilterType = 'profession' | 'seniority' | 'workType'

const FILTER_LABELS: Record<FilterType, string> = {
  profession: 'Profession',
  seniority: 'Experience',
  workType: 'Work type',
}

interface JobFilterBarProps {
  professions: string[]
  selectedProfessions: string[]
  selectedSeniorities: string[]
  selectedWorkTypes: string[]
  search: string
  onProfessionsChange: (value: string[]) => void
  onSeniorityChange: (value: string[]) => void
  onWorkTypesChange: (value: string[]) => void
  onSearchChange: (value: string) => void
  onResetAll: () => void
  /** True on /jobs/[professionSlug], where the URL already pins the profession. */
  hideProfession?: boolean
  /** Shown at the end of the row — "12 roles". */
  resultCount: number
}

export default function JobFilterBar({
  professions,
  selectedProfessions,
  selectedSeniorities,
  selectedWorkTypes,
  search,
  onProfessionsChange,
  onSeniorityChange,
  onWorkTypesChange,
  onSearchChange,
  onResetAll,
  hideProfession,
  resultCount,
}: JobFilterBarProps) {
  const [openFilter, setOpenFilter] = useState<FilterType | null>(null)
  const [hoveredFilter, setHoveredFilter] = useState<FilterType | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* Put the caret in the search box on arrival, so the board can be searched by
     typing rather than by aiming first. CourseSearch autoFocuses too, but it can
     use the React prop because it IS the /welcome hero — there is nothing above
     it to scroll past.

     Here there is: the black hero band with the heading and the sign-in
     buttons. React's autoFocus, and a bare .focus(), both scroll the field into
     view, which would land every visitor below the hero having seen none of it.
     preventScroll is the whole reason this is an effect and a ref.

     Only where a pointer is fine — a mouse or trackpad implies a keyboard
     already attached. On a phone, focusing an input summons the on-screen
     keyboard, and a browse page that opens with half the screen taken by a
     keyboard nobody asked for is worse than one you have to tap to search. */
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  /* Which edge the open menu hangs from. See MENU_WIDTH.
     One flag rather than one per chip, because only one menu is ever open. */
  const [alignRight, setAlignRight] = useState(false)

  /* Open a menu, choosing the edge it grows from by what is actually beside it.
     Left-anchored by default, which reads better under a chip; flipped when
     that would put the menu past the right of the window. Measured on open
     rather than guessed from a breakpoint, because the chips wrap — the same
     chip is on the right of the row at one width and the left at another. */
  const openMenu = (type: FilterType, chip: HTMLElement | null) => {
    if (chip) {
      const { left, right } = chip.getBoundingClientRect()
      setAlignRight(left + MENU_WIDTH > window.innerWidth - VIEWPORT_MARGIN && right - MENU_WIDTH > VIEWPORT_MARGIN)
    }
    setOpenFilter(type)
  }

  // Hover opens these, but a tap has no hover to end — so on a touchscreen the
  // menu would stay open until something else was tapped. Closing on any press
  // outside is what makes the chips usable with a finger.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options: Record<FilterType, readonly string[]> = {
    profession: professions,
    seniority: SENIORITY_LEVELS,
    workType: WORK_TYPES,
  }
  const selections: Record<FilterType, string[]> = {
    profession: selectedProfessions,
    seniority: selectedSeniorities,
    workType: selectedWorkTypes,
  }
  const setters: Record<FilterType, (value: string[]) => void> = {
    profession: onProfessionsChange,
    seniority: onSeniorityChange,
    workType: onWorkTypesChange,
  }
  const labelFor = (type: FilterType, option: string) =>
    type === 'seniority' ? SENIORITY_LABELS[option as Seniority] || option : option

  const types: FilterType[] = hideProfession
    ? ['seniority', 'workType']
    : ['profession', 'seniority', 'workType']

  const hasAnyFilter =
    (!hideProfession && selectedProfessions.length > 0) ||
    selectedSeniorities.length > 0 ||
    selectedWorkTypes.length > 0 ||
    search.trim().length > 0

  const toggle = (type: FilterType, option: string) => {
    const current = selections[type]
    setters[type](current.includes(option) ? current.filter(v => v !== option) : [...current, option])
  }

  return (
    <div ref={containerRef} className="flex items-center gap-3 flex-wrap">
      {/* Search first and widest — it is the control most likely to be the
          reason someone came to this page, and reading order should say so.
          flex-1 with a floor rather than a fixed width so it gives way to the
          chips as the row narrows instead of pushing them onto a second line.

          Dressed as CourseSearch on /welcome: rounded-xl, the same soft glow
          rather than a border, the pink caret, and the icon on the right in
          #C5C5C5 at stroke 3. Height and type size are this bar's, not that
          one's — /welcome's is a 660px hero control and this is one field in a
          row of chips.

          The hover glow is a CSS class here. CourseSearch does the same lift by
          reaching for the input with document.querySelector on mouseenter and
          assigning style.boxShadow, which also means every one of them on a
          page would answer to the first. Same two values, no DOM poking. */}
      <div className="relative flex-1" style={{ minWidth: '210px' }}>
        {/* No placeholder and no icon — an empty white field, exactly as
            CourseSearch renders on /welcome above md. What identifies it is the
            caret sitting in it on arrival, and the row of labelled chips beside
            it. aria-label stays: with the placeholder gone there is nothing
            left for a screen reader to announce this field by. */}
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          aria-label="Search roles or employers"
          className="w-full bg-white rounded-xl text-gray-900 caret-[#EF0B72] focus:outline-none shadow-[0_0_10px_rgba(103,103,103,0.6)] hover:shadow-[0_0_10px_rgba(103,103,103,0.75)] transition-shadow duration-200"
          style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: '0.875rem',
            letterSpacing: '-0.01em',
            // The right inset is permanent, reserved for the reset control
            // below whether or not it is showing — so a query appearing never
            // shunts the text the visitor is still typing.
            padding: '8px 38px 8px 14px',
          }}
        />

        {/* Reset, inside the field rather than at the end of the row.
            It sat last in the flex line, and because it is held in the layout
            while inactive — the chips must not jump 30px sideways the moment a
            filter is set — those 30px came off the right end of the row. The
            chips stopped short of the detail pane's edge while an invisible
            button owned the gap. In here it costs the row nothing, and the
            chips finish flush with the cards below.

            It reads honestly in this position too: onResetAll clears the search
            as well as the three filter groups, so this is the "start over"
            control for everything in the bar, and the field is where starting
            over begins. */}
        <button
          type="button"
          onClick={onResetAll}
          className={`group absolute right-3 top-0 bottom-0 my-auto flex items-center cursor-pointer transition-opacity duration-200 ${hasAnyFilter ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          title="Reset all filters"
          aria-label="Reset all filters"
          aria-hidden={!hasAnyFilter}
          tabIndex={hasAnyFilter ? 0 : -1}
          style={{ height: '18px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 ease-in-out group-hover:-rotate-45">
            <path d="M12 4a8 8 0 1 1-6.3 3.1" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" className="group-hover:stroke-[#EF0B72] transition-colors duration-300" />
            <polygon points="12,1 12,7 6,4" fill="#000000" className="group-hover:fill-[#EF0B72] transition-colors duration-300" />
          </svg>
        </button>
      </div>

      {types.map(type => {
        const selected = selections[type]
        const isOpen = openFilter === type

        return (
          <div
            key={type}
            className="relative"
            onMouseEnter={event => { openMenu(type, event.currentTarget); setHoveredFilter(type) }}
            onMouseLeave={() => { setOpenFilter(null); setHoveredFilter(null) }}
          >
            <button
              type="button"
              onClick={event => {
                if (isOpen) setOpenFilter(null)
                else openMenu(type, event.currentTarget)
              }}
              aria-expanded={isOpen}
              className="text-white font-medium rounded-[6px] cursor-pointer"
              style={{
                backgroundColor: '#8200EA',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontSize: '0.875rem',
                letterSpacing: '-0.01em',
                padding: '8px 12px',
              }}
            >
              <span className="flex items-center gap-2">
                {FILTER_LABELS[type]}
                {selected.length > 0 ? (
                  <span
                    className="inline-flex items-center justify-center font-bold"
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
                  /* PromptFilters' slider glyph: two rails whose handles slide
                     past each other on hover. Lifted verbatim, spring easing
                     included — it is the same control doing the same job. */
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                    <line x1="3" y1="8" x2="21" y2="8" />
                    <circle cx="16" cy="8" r="3" fill="currentColor" stroke="currentColor" style={{ transform: hoveredFilter === type ? 'translateX(-8px)' : 'translateX(0)', transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                    <line x1="3" y1="16" x2="21" y2="16" />
                    <circle cx="8" cy="16" r="3" fill="currentColor" stroke="currentColor" style={{ transform: hoveredFilter === type ? 'translateX(8px)' : 'translateX(0)', transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                  </svg>
                )}
              </span>
            </button>

            {/* Mounted only while open, where /prompts keeps its panel in the
                DOM at opacity 0. That difference is the fix for the overflow
                described on MENU_WIDTH: a faded-out panel is still laid out,
                and an absolutely positioned box hanging off the right of a
                phone screen widens the document whether or not anyone can see
                it. Unmounting costs the fade-out — there is nothing left to
                fade — so the way in is a keyframe rather than a transition.

                pt-2 on the wrapper rather than a margin on the panel: the gap
                has to be part of the hover target, or the pointer crossing it
                leaves the chip and shuts the menu it is travelling towards. */}
            {isOpen && (
            <div
              className={`absolute top-full pt-2 z-50 ${alignRight ? 'right-0' : 'left-0'}`}
              style={{
                width: `${MENU_WIDTH}px`,
                maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
                animation: 'fadeIn 0.18s ease both',
              }}
            >
              <div className="bg-white rounded-[8px] py-1" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                {options[type].map(option => {
                  const isChecked = selected.includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggle(type, option)}
                      /* No whitespace-nowrap, unlike /prompts. The panel has a
                         fixed width now, so a label longer than it would spill
                         out of the white box instead of widening it — wrapping
                         is the only way a future profession name stays inside. */
                      className="w-full text-left px-[10px] py-1 text-sm font-normal hover:bg-[#F6F6F6] transition-colors flex items-center gap-3 cursor-pointer"
                      style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.01em' }}
                    >
                      <span
                        className="shrink-0 flex items-center justify-center"
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
                      <span className="text-black">{labelFor(type, option)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            )}
          </div>
        )
      })}

      {/* The count is announced but not shown. It used to sit under the chips
          as "107 roles"; the list itself says how many there are, and a running
          total above it was a number to read rather than a thing to act on.

          It stays in the accessibility tree because for a screen reader the
          list does NOT say how many there are — filtering silently reshapes a
          region further down the page that nobody is pointed at. sr-only and
          aria-live is what turns that into "30 roles" spoken after the
          keystroke, which is all the visible line was ever doing for them. */}
      <p className="sr-only" aria-live="polite">
        {resultCount === 1 ? '1 role' : `${resultCount} roles`}
      </p>
    </div>
  )
}
