'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobSourceAttribution } from '@/data/jobsData'
import { seniorityOrder } from '@/lib/seniorityLabels'
import JobFilterBar, { WORK_TYPES } from '@/components/jobs/JobFilterBar'
import JobCard from '@/components/jobs/JobCard'
import JobDetailPane from '@/components/jobs/JobDetailPane'
import JobAuthCTA from '@/components/jobs/JobAuthCTA'

/**
 * The board: controls across the top, the list on the left, the chosen role on
 * the right.
 *
 * All filtering and searching is client-side over a capped result set — the
 * same approach as PromptToolkitClient, and safe here because jobsData.ts
 * limits the payload to 300 rows and ships two-sentence summaries rather than
 * full descriptions. The full advert for the ONE selected role is fetched
 * separately by the pane; see lib/jobDescription.ts.
 *
 * Below `lg` there is no room for two columns, so the pane stops being a column
 * and becomes the screen: the list fills the width, and choosing a role covers
 * it with the detail and a way back. One component either way — what changes is
 * where it is mounted, not what it renders.
 */

/**
 * Rows on show before "Load more", and how many each press adds.
 *
 * The initial figure costs nothing to raise: every matching role is already in
 * the DOM either way — see the note on the rendering loop — so this only moves
 * which of them are collapsed. It is a reading decision, not a payload one.
 */
const INITIAL_VISIBLE = 25
const LOAD_MORE_STEP = 10
const FILTER_STORAGE_KEY = 'ignite_job_filters'

/**
 * How a row collapses in or out as the filters and the search change.
 *
 * Lifted from CourseTypeColumn, which /welcome drives from the same kind of
 * search box — 420ms and this easing rather than that component's 300ms
 * default, which is the value /welcome opts into and the Progress Hub's course
 * selector uses. Two searches on one site should not move at two speeds.
 *
 * Opacity runs at 5/6 of the collapse for the reason given there: a row
 * finishes fading before it finishes flattening, so the last frame is empty
 * rather than a squashed sliver of a job title.
 */
const FILTER_MS = 420
const FILTER_OPACITY_MS = Math.round((FILTER_MS * 5) / 6)
const FILTER_EASE = 'cubic-bezier(0.33, 1, 0.68, 1)'

/**
 * The hero copy, identical on /jobs and on every /jobs/[professionSlug].
 *
 * Constants rather than props on purpose. The profession pages are meant to BE
 * the main board with one filter pre-selected, and they briefly each carried
 * their own headline ("Product Manager jobs", "Live UK Product Manager
 * vacancies…"). Holding the strings here means the two cannot drift apart
 * again: there is no prop to pass, so there is nothing to pass differently.
 *
 * What stays bespoke per profession is everything the visitor does not see in
 * the layout — <title>, meta description, canonical, Open Graph and the
 * CollectionPage/BreadcrumbList names. Those live in each page's
 * generateMetadata and structured data, not here.
 */
const HEADING = 'Job Board'
const TAGLINE = 'Handpicked and updated daily'
const SUBHEADING =
  'Discover the top entry-level and graduate jobs in the UK. Every vacancy is hand-picked and ready for you to directly apply.'

interface JobBoardClientProps {
  jobs: Job[]
  professions: string[]
  sources: Record<string, JobSourceAttribution>
  /**
   * Set on /jobs/[professionSlug] — the profession that page is for.
   *
   * It seeds the profession filter so the board arrives already narrowed, and
   * that is now ALL it does to the controls: the filter bar renders the same
   * three chips here as it does on /jobs, with this one showing as selected.
   * It still suppresses filter persistence below, which is a storage decision
   * rather than a visual one.
   */
  initialProfession?: string
}

export default function JobBoardClient({
  jobs,
  professions,
  sources,
  initialProfession,
}: JobBoardClientProps) {
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>(
    initialProfession ? [initialProfession] : []
  )
  const [selectedSeniorities, setSelectedSeniorities] = useState<string[]>([])
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([])
  const [search, setSearch] = useState('')
  // How many of the sorted results are on show. Grows only — there is no way
  // back to a shorter list except changing a filter, which resets it.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  // Set from ?job=<id>. Not a selection — just the listing to bring back into
  // view, once, on arrival.
  const [focusJobId, setFocusJobId] = useState<string | null>(null)

  /* Which role the pane is showing — at most one, which is why this lives here
     rather than in each card. Set by clicking a row, and by nothing else. */
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  /* Whether the phone is showing the detail instead of the list.
     Separate from selectedJobId on purpose. Desktop always has a job in the
     pane, including the one auto-selected on arrival — but a phone must open on
     the list, or a visitor who came to browse lands inside a single advert they
     never asked for. So the id says WHAT the pane shows and this says whether
     the narrow layout is showing it at all, and only a deliberate tap sets it. */
  const [detailOpenOnMobile, setDetailOpenOnMobile] = useState(false)

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

  /* The search term is deliberately NOT persisted alongside the filters.
     A saved filter is a standing preference — "I am looking for entry-level
     remote work" survives a week. A saved search is a half-finished sentence,
     and coming back to a board mysteriously showing four roles because you
     typed "Monzo" on Tuesday is a bug as far as anyone can tell. */
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
  const changeSearch = useMemo(() => resetPaging(setSearch), [resetPaging])

  /* Title, employer and place, and nothing else.
     Not the summary: searching it sounds generous and reads as broken, because
     "remote" or "team" appears in half the adverts on the board and the results
     stop resembling the query. These three are the fields someone is actually
     naming when they type — the role, who it is for, where it is.

     Every term must match, in any of the three. That makes "monzo product" find
     the Monzo product role rather than every job at Monzo plus every product
     job anywhere, which is what a plain substring match on the whole string
     could never do. */
  const searchTerms = useMemo(
    () => search.toLowerCase().split(/\s+/).filter(Boolean),
    [search]
  )

  const matchesFilters = useCallback((job: Job) => {
    if (selectedProfessions.length > 0 && !selectedProfessions.includes(job.profession)) return false
    if (selectedSeniorities.length > 0 && !selectedSeniorities.includes(job.seniority)) return false
    if (selectedWorkTypes.length > 0) {
      const type = job.isRemote ? WORK_TYPES[0] : WORK_TYPES[1]
      if (!selectedWorkTypes.includes(type)) return false
    }
    if (searchTerms.length > 0) {
      const haystack = `${job.title} ${job.company} ${job.locationCity || job.location || ''}`.toLowerCase()
      if (!searchTerms.every(term => haystack.includes(term))) return false
    }
    return true
  }, [selectedProfessions, selectedSeniorities, selectedWorkTypes, searchTerms])

  /* EVERY job, in display order, whatever the filters say.
     This list is what gets rendered, and it never changes as someone types —
     which is the whole point. A filtered list would unmount the rows that stop
     matching, and an unmounted row cannot animate away; it just blinks out and
     drags the rest of the column up after it. Keeping the list stable lets each
     row collapse and fade in place, the same way the course columns behave
     under /welcome's search (CourseTypeColumn).

     Entry-level first within each date bucket would be arbitrary; date order is
     what people scan for, so seniority only breaks ties. */
  const orderedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0
      if (dateB !== dateA) return dateB - dateA
      return seniorityOrder(a.seniority) - seniorityOrder(b.seniority)
    })
  }, [jobs])

  // The matching subset, still in display order. Everything that counts rows —
  // the total, paging, which role the pane falls back to — reads this; only the
  // rendering loop reads orderedJobs.
  const matchedJobs = useMemo(
    () => orderedJobs.filter(matchesFilters),
    [orderedJobs, matchesFilters]
  )

  /* Job id → its place among the matches, which is what paging counts.
     A row's position in the rendered list is not its position in the results
     once anything is filtered out, and "the first twelve" has to mean the first
     twelve MATCHES or "Load more" would reveal rows that are still collapsed. */
  const rankById = useMemo(() => {
    const ranks = new Map<string, number>()
    matchedJobs.forEach((job, index) => ranks.set(job.id, index))
    return ranks
  }, [matchedJobs])

  // Clamped because matchedJobs shrinks as filters narrow: without this, "showing
  // 22 of 6" once a filter cuts the list below what was already revealed.
  const shownCount = Math.min(visibleCount, matchedJobs.length)
  const remaining = matchedJobs.length - shownCount

  const loadMore = useCallback(() => {
    setVisibleCount(count => count + LOAD_MORE_STEP)
  }, [])

  /* The role the pane is showing. Falls back to the first result whenever the
     selected one is not in the list — a filter that excluded it, a search that
     no longer matches it, or the very first render, where nothing is selected
     yet. Derived rather than stored, so the pane can never point at a job the
     list no longer contains, and no effect has to chase the filters to keep the
     two in step. */
  const selectedJob = useMemo(
    () => matchedJobs.find(job => job.id === selectedJobId) || matchedJobs[0] || null,
    [matchedJobs, selectedJobId]
  )

  const handleSelect = useCallback((jobId: string) => {
    setSelectedJobId(jobId)
    setDetailOpenOnMobile(true)
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect --
     Bring the ?job= listing back into view. This is the landing after an OAuth
     round trip from the Apply gate, which returns to /jobs?job=<id>: the visitor
     came back to click Apply, and hunting for the role by scrolling is a poor
     reward for signing up. It now also opens the role in the pane, which is
     where Apply lives — so they land on the button they left for.

     It has to be an effect because it depends on the sorted list, which depends
     on filters restored from localStorage after hydration. Guarded by a ref so
     it fires once — after that, the list length and the selection are the
     visitor's again. */
  const focusedRef = useRef(false)
  useEffect(() => {
    if (!focusJobId || focusedRef.current) return
    const index = matchedJobs.findIndex(job => job.id === focusJobId)
    if (index === -1) return   // filtered out, or no longer on the board
    focusedRef.current = true
    setSelectedJobId(focusJobId)
    setDetailOpenOnMobile(true)
    // Reveal far enough down the list to include it.
    setVisibleCount(count => Math.max(count, index + 1))
    // Every card is in the DOM, but ones past the cut are display:none — so the
    // scroll waits for the reveal above to be committed and painted.
    requestAnimationFrame(() => {
      document.getElementById(`job-${focusJobId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [focusJobId, matchedJobs])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Clears the profession too, including the one a profession page arrived
     with. It is an ordinary selected filter now — a visible chip that Reset
     visibly refuses to clear would read as a broken control. Note this can
     leave /jobs/product-manager showing every profession; the heading and the
     URL are about what the page IS, and the filters are the visitor's to move.
     Nothing about the served HTML or its canonical changes. */
  const handleResetAll = () => {
    changeProfessions([])
    changeSeniorities([])
    changeWorkTypes([])
    changeSearch('')
  }

  const emptyState = (
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
          : 'Try a different search, or widen the experience level.'}
      </p>
    </div>
  )

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
                  {HEADING}
                </h1>

                <p
                  className="text-xl text-[#EF0B72] font-semibold leading-normal max-w-[560px]"
                  style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.01em', marginBottom: '8px' }}
                >
                  {TAGLINE}
                </p>

                <p
                  className="text-white text-[1.1rem] md:text-lg leading-normal md:leading-relaxed font-light max-w-[560px]"
                  style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.02em' }}
                >
                  {SUBHEADING}
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
          The board. Repeats the hero's wrapper verbatim so the filter bar and
          the list share the hero title's left edge — the same reason the course
          pages reuse this grid for their content sections.

          #F6F6F6 is the course pages' content-band grey (CourseCurriculum,
          FeedbackSection); the cards and the pane sit on it in white, so the
          band and everything on it are the inverse of each other.
          --------------------------------------------------------------------- */}
      <div className="bg-[#F6F6F6]">
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-12 flex justify-center">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <div className="lg:-mx-24">
              {/* Hidden on the phone's detail view: those controls act on the
                  list, and the list is not what is on screen. */}
              <div className={detailOpenOnMobile ? 'hidden lg:block' : ''}>
                <JobFilterBar
                  professions={professions}
                  selectedProfessions={selectedProfessions}
                  selectedSeniorities={selectedSeniorities}
                  selectedWorkTypes={selectedWorkTypes}
                  search={search}
                  onProfessionsChange={changeProfessions}
                  onSeniorityChange={changeSeniorities}
                  onWorkTypesChange={changeWorkTypes}
                  onSearchChange={changeSearch}
                  onResetAll={handleResetAll}
                  resultCount={matchedJobs.length}
                />
              </div>

              <div className="flex gap-6 mt-5 items-start">
                {/* ----------------------------------------------------------
                    Left: the list.
                    Fixed 380px at lg so the pane beside it gets the rest of the
                    954px this grid opens up to — a list column that flexed would
                    take its width from the longest job title, and the pane is
                    the half that has to hold a paragraph.
                    ---------------------------------------------------------- */}
                <div
                  className={`w-full lg:w-[380px] lg:shrink-0 ${detailOpenOnMobile ? 'hidden lg:block' : ''}`}
                >
                  {/* EVERY listing is rendered into the markup; the filters and
                      "Load more" only control which are displayed.

                      The point is search. Rendering a screenful at a time would
                      put 12 of ~36 roles in the server HTML and leave the rest
                      reachable only through client-side state with no URL —
                      invisible to a crawler. Here the full set is in the DOM
                      for everyone, and the collapse below just windows it. That
                      is the same mechanism a tab or accordion uses; the content
                      is not being shown to crawlers and withheld from users,
                      which is what would make it cloaking.

                      Cost is payload: ~36 cards of markup. jobsData.ts caps the
                      query at 300 rows and ships summaries rather than full
                      descriptions, so this stays reasonable. If the board ever
                      outgrows that cap, move to real paginated URLs rather than
                      simply raising it.

                      No `gap` on this column, deliberately: a collapsed row
                      still gets its share of a flex gap, so twelve filtered-out
                      roles would leave twelve stripes of empty space behind
                      them. The spacing is the wrapper's own padding instead,
                      which collapses with it.

                      -mt-4 cancels the first row's share of that padding, so
                      the top of the first card lands on the top of the detail
                      pane beside it rather than 16px below. It holds however
                      the list is filtered: a collapsed row has no height and no
                      margin, so whichever row is first is the one sitting on
                      this edge. */}
                  <div className="flex flex-col -mt-4">
                    {orderedJobs.map((job, index) => {
                      const rank = rankById.get(job.id)
                      const isShown = rank !== undefined && rank < shownCount

                      return (
                        /* 0fr → 1fr, opacity and margin together, straight off
                           CourseTypeColumn on /welcome — same durations, same
                           easing, opacity at 5/6 of the collapse so a row has
                           finished fading before it finishes flattening and no
                           squashed sliver of a job title shows at the end.

                           The -mx/padding pair is this list's own problem: the
                           inner box has to clip for 0fr to mean anything, and
                           these cards carry a glow that clipping would slice
                           square. So the row is widened by exactly the padding
                           that holds the glow, leaving the card's visible edges
                           where they were. The negative bottom margin is the
                           same trick vertically — 16px of padding above and
                           below would otherwise read as a 32px gap. */
                        <div
                          key={job.id}
                          id={`job-${job.id}`}
                          className="-mx-4"
                          style={{
                            display: 'grid',
                            gridTemplateRows: isShown ? '1fr' : '0fr',
                            opacity: isShown ? 1 : 0,
                            marginBottom: isShown ? '-20px' : '0px',
                            transition: `grid-template-rows ${FILTER_MS}ms ${FILTER_EASE}, opacity ${FILTER_OPACITY_MS}ms ease, margin-bottom ${FILTER_MS}ms ${FILTER_EASE}`,
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="p-4">
                              <JobCard
                                job={job}
                                index={rank ?? index}
                                isSelected={selectedJob?.id === job.id}
                                onSelect={handleSelect}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {matchedJobs.length === 0 && emptyState}

                  {/* One way forward, no way back — the list only grows, so the
                      role you just scrolled past is still above you. */}
                  {remaining > 0 && (
                    <div className="flex justify-center mt-7">
                      <button
                        type="button"
                        onClick={loadMore}
                        className="inline-flex items-center justify-center gap-1 text-black hover:text-[#EF0B72] rounded-[6px] transition-colors duration-200 cursor-pointer font-medium"
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

                {/* ----------------------------------------------------------
                    Right: the chosen role.

                    Sticky at lg, so the advert stays put while the list scrolls
                    beside it — the pane is the thing being read and the list is
                    the thing being scanned, and it would be the wrong way round
                    if scrolling the scan took the reading away.

                    On the phone this is not a column: it fills the width and
                    the list hides behind it, with the pane's own back control
                    (onClose) as the way out. `lg:block` rather than a media
                    query in JS — nothing here needs to know the width, only the
                    stylesheet does, which keeps it correct during hydration.
                    ---------------------------------------------------------- */}
                {selectedJob && (
                  <div
                    className={`flex-1 min-w-0 lg:sticky lg:top-24 ${detailOpenOnMobile ? '' : 'hidden lg:block'}`}
                  >
                    {/* Keyed on the job so a new selection remounts the pane:
                        the description fetch, the skeleton and the scroll
                        position all reset together, and a long advert cannot
                        leave the next one scrolled halfway down. */}
                    <JobDetailPane
                      key={selectedJob.id}
                      job={selectedJob}
                      sources={sources}
                      isSignedIn={isSignedIn}
                      onClose={() => setDetailOpenOnMobile(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
