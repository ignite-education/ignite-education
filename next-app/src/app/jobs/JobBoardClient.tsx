'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobSourceAttribution } from '@/data/jobsData'
import { seniorityOrder } from '@/lib/seniorityLabels'
import JobFilterPanel, { WORK_TYPES } from '@/components/jobs/JobFilterPanel'
import JobCard from '@/components/jobs/JobCard'
import JobAuthCTA from '@/components/jobs/JobAuthCTA'

/**
 * The board. All filtering is client-side over a capped result set — the same
 * approach as PromptToolkitClient, and safe here because jobsData.ts limits the
 * payload to 300 rows and ships snippets rather than full descriptions.
 */

const INITIAL_VISIBLE = 12
const LOAD_MORE_STEP = 10
const FILTER_STORAGE_KEY = 'ignite_job_filters'

interface JobBoardClientProps {
  jobs: Job[]
  professions: string[]
  sources: Record<string, JobSourceAttribution>
  /** Set on /jobs/[professionSlug] — pins the profession and hides its filter. */
  initialProfession?: string
  heading: string
  subheading: string
  /** Short line in Ignite pink under the title, matching the course hero. */
  tagline?: string
}

export default function JobBoardClient({
  jobs,
  professions,
  sources,
  initialProfession,
  heading,
  subheading,
  tagline = 'Updated daily · Reviewed by hand',
}: JobBoardClientProps) {
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>(
    initialProfession ? [initialProfession] : []
  )
  const [selectedSeniorities, setSelectedSeniorities] = useState<string[]>([])
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([])
  // How many of the sorted results are on show. Grows only — there is no way
  // back to a shorter list except changing a filter, which resets it.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  // Set from ?job=<id>. Not a selection — just the listing to bring back into
  // view, once, on arrival.
  const [focusJobId, setFocusJobId] = useState<string | null>(null)

  // null until the auth check resolves, so ApplyGate can avoid flashing the
  // signed-out copy at a signed-in visitor.
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect --
     ?job=<id> deep-links a single listing. Read from window after hydration
     rather than via useSearchParams: that hook opts the whole subtree out of
     static prerendering, which would leave the board (and every job title on
     it) absent from the server-rendered HTML — exactly the content the
     profession pages exist to rank for. */
  useEffect(() => {
    const jobParam = new URLSearchParams(window.location.search).get('job')
    if (jobParam) setFocusJobId(jobParam)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setIsSignedIn(Boolean(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsSignedIn(Boolean(session)))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Restore saved filters AFTER hydration. This has to be an effect: reading
  // localStorage during render would make the server and client markup differ.
  // Skipped on profession pages, where the URL is the filter.
  /* eslint-disable react-hooks/set-state-in-effect --
     Unavoidable here: localStorage does not exist during the server render, so
     the restore has to happen after hydration. Runs once on mount. */
  useEffect(() => {
    if (initialProfession) return
    try {
      const saved = localStorage.getItem(FILTER_STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed.professions)) setSelectedProfessions(parsed.professions)
      if (Array.isArray(parsed.seniorities)) setSelectedSeniorities(parsed.seniorities)
      if (Array.isArray(parsed.workTypes)) setSelectedWorkTypes(parsed.workTypes)
    } catch {
      /* corrupt value — fall back to no filters */
    }
  }, [initialProfession])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (initialProfession) return
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          professions: selectedProfessions,
          seniorities: selectedSeniorities,
          workTypes: selectedWorkTypes,
        })
      )
    } catch {
      /* private mode / quota — filters simply do not persist */
    }
  }, [selectedProfessions, selectedSeniorities, selectedWorkTypes, initialProfession])


  /* Changing a filter must collapse the list back to its first screenful —
     someone who loaded 60 roles and then narrows to one profession is starting
     a new search, not continuing the old one. Done here, alongside the change,
     rather than in an effect that watches the filters: an effect would render
     the long list once at the old length and then immediately re-render it. */
  const resetPaging = useCallback(<T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setVisibleCount(INITIAL_VISIBLE)
  }, [])

  const changeProfessions = useMemo(() => resetPaging(setSelectedProfessions), [resetPaging])
  const changeSeniorities = useMemo(() => resetPaging(setSelectedSeniorities), [resetPaging])
  const changeWorkTypes = useMemo(() => resetPaging(setSelectedWorkTypes), [resetPaging])

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (selectedProfessions.length > 0 && !selectedProfessions.includes(job.profession)) return false
      if (selectedSeniorities.length > 0 && !selectedSeniorities.includes(job.seniority)) return false
      if (selectedWorkTypes.length > 0) {
        const type = job.isRemote ? WORK_TYPES[0] : WORK_TYPES[1]
        if (!selectedWorkTypes.includes(type)) return false
      }
      return true
    })
  }, [jobs, selectedProfessions, selectedSeniorities, selectedWorkTypes])

  // Entry-level first within each date bucket would be arbitrary; date order is
  // what people scan for, so seniority only breaks ties.
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0
      if (dateB !== dateA) return dateB - dateA
      return seniorityOrder(a.seniority) - seniorityOrder(b.seniority)
    })
  }, [filteredJobs])



  // Clamped because sortedJobs shrinks as filters narrow: without this, "showing
  // 22 of 6" once a filter cuts the list below what was already revealed.
  const shownCount = Math.min(visibleCount, sortedJobs.length)
  const remaining = sortedJobs.length - shownCount

  const loadMore = useCallback(() => {
    setVisibleCount(count => count + LOAD_MORE_STEP)
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect --
     Bring the ?job= listing back into view. This is the landing after an OAuth
     round trip from the Apply gate, which returns to /jobs?job=<id>: the visitor
     came back to click Apply, and hunting for the role by scrolling is a poor
     reward for signing up.

     It has to be an effect because it depends on the sorted list, which depends
     on filters restored from localStorage after hydration. Guarded by a ref so
     it fires once — after that, the list length is the visitor's again. */
  const focusedRef = useRef(false)
  useEffect(() => {
    if (!focusJobId || focusedRef.current) return
    const index = sortedJobs.findIndex(job => job.id === focusJobId)
    if (index === -1) return   // filtered out, or no longer on the board
    focusedRef.current = true
    // Reveal far enough down the list to include it.
    setVisibleCount(count => Math.max(count, index + 1))
    // Every card is in the DOM, but ones past the cut are display:none — so the
    // scroll waits for the reveal above to be committed and painted.
    requestAnimationFrame(() => {
      document.getElementById(`job-${focusJobId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [focusJobId, sortedJobs])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleResetAll = () => {
    if (!initialProfession) changeProfessions([])
  }

  return (
    <>
      {/* ---------------------------------------------------------------------
          Black hero band. Uses CourseHero's exact grid — max-w-4xl / 762px /
          lg:-mx-24 — so the title starts on the same left edge as a course page
          hero. The listings section below repeats the same wrapper, which is how
          the course pages keep every heading on one left edge.
          --------------------------------------------------------------------- */}
      <div className="bg-black">
        <div className="max-w-4xl mx-auto px-6 pb-[38px] flex justify-center pt-[25px] md:pt-[60px]">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <div className="lg:-mx-24 text-left flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="min-w-0">
          <h1
            className="text-[2rem] md:text-[40px] font-semibold text-white mb-[23px] leading-tight"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.02em' }}
          >
            {heading}
          </h1>

          {tagline && (
            <p
              className="text-xl text-[#EF0B72] font-semibold leading-normal max-w-[560px]"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.01em', marginBottom: '8px' }}
            >
              {tagline}
            </p>
          )}

          <p
            className="text-white text-[1.1rem] md:text-lg leading-normal md:leading-relaxed font-light max-w-[560px]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.02em' }}
          >
            {subheading}
          </p>
              </div>

              {/* Signed-out visitors get the same two OAuth buttons the course
                  and profile pages use. Offered up front rather than only behind
                  the Apply gate: someone who signs up here never meets the
                  modal. isSignedIn is null until the auth check resolves, so
                  nothing flashes at an already-signed-in visitor. */}
              {isSignedIn === false && (
                <div className="lg:pt-2">
                  <JobAuthCTA />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          Listings section. Repeats the hero's wrapper verbatim so the filters
          and every job card share the hero title's left edge — the same reason
          the course pages reuse this grid for their content sections.

          #F6F6F6 is the course pages' content-band grey (CourseCurriculum,
          FeedbackSection); the cards sit on it in white, so the band and the
          rows are the inverse of what they were.
          --------------------------------------------------------------------- */}
      <div className="bg-[#F6F6F6]">
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-12 flex justify-center">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <div className="lg:-mx-24">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
                {/* Left column: filters. Sticky on desktop so they stay reachable
                    while scrolling; a plain block on mobile, above the list.

                    Width is the only lever on this row: the list beside it is
                    flex-1, so every pixel added here comes off the cards. Sized
                    to hold the longest profession on one line now that the
                    labels take the course pages' 0.9rem. */}
                <aside className="lg:w-[228px] shrink-0">
                  <div className="lg:sticky lg:top-24">
                    <JobFilterPanel
                      professions={professions}
                      selectedProfessions={selectedProfessions}
                      selectedSeniorities={selectedSeniorities}
                      selectedWorkTypes={selectedWorkTypes}
                      onProfessionsChange={changeProfessions}
                      onSeniorityChange={changeSeniorities}
                      onWorkTypesChange={changeWorkTypes}
                      onResetAll={handleResetAll}
                      hideProfession={Boolean(initialProfession)}
                    />
                  </div>
                </aside>

                {/* Right column: the listings revealed so far. */}
                <div className="flex-1 min-w-0">
                  {/* EVERY listing is rendered into the markup; "Load more"
                      only controls which are displayed.

                      The point is search. Rendering a screenful at a time would
                      put 12 of ~36 roles in the server HTML and leave the rest
                      reachable only through client-side state with no URL —
                      invisible to a crawler. Here the full set is in the DOM
                      for everyone, and `hidden` (display:none) just windows it.
                      That is the same mechanism a tab or accordion uses; the
                      content is not being shown to crawlers and withheld from
                      users, which is what would make it cloaking.

                      Cost is payload: ~36 cards of markup. jobsData.ts caps the
                      query at 300 rows and ships snippets rather than full
                      descriptions, so this stays reasonable. If the board ever
                      outgrows that cap, move to real paginated URLs rather than
                      simply raising it. */}
                  <div className="flex flex-col gap-3">
                    {sortedJobs.map((job, index) => (
                      <div
                        key={job.id}
                        id={`job-${job.id}`}
                        className={index < shownCount ? undefined : 'hidden'}
                      >
                        <JobCard
                          job={job}
                          sources={sources}
                          isSignedIn={isSignedIn}
                          index={index}
                        />
                      </div>
                    ))}
                  </div>

                  {sortedJobs.length === 0 && (
                    <div className="text-center py-20">
                      <p
                        className="text-black font-medium"
                        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '1.05rem', letterSpacing: '-0.01em' }}
                      >
                        {jobs.length === 0 ? 'New roles are on their way' : 'No roles match those filters'}
                      </p>
                      <p
                        className="text-black/55 font-light mt-2 mx-auto"
                        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em', maxWidth: '440px' }}
                      >
                        {jobs.length === 0
                          ? 'We review every listing by hand before it appears here. Check back shortly.'
                          : 'Try widening the experience level or clearing the filters.'}
                      </p>
                    </div>
                  )}

                  {/* One way forward, no way back — the list only grows, so the
                      role you just scrolled past is still above you. */}
                  {remaining > 0 && (
                    <div className="flex justify-center mt-7">
                      <button
                        type="button"
                        onClick={loadMore}
                        className="inline-flex items-center justify-center gap-1 bg-[#F6F6F6] text-black hover:text-[#EF0B72] rounded-[6px] transition-colors duration-200 cursor-pointer font-medium"
                        style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.875rem', letterSpacing: '-0.01em', padding: '9px 18px' }}
                      >
                        Load more
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
