import React, { useState, useEffect, useRef } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { getCoursesByType } from '../../../lib/api';
import { courseMatchesQuery } from '../../../lib/courseSearch';
import { getCachedCourses, setCachedCourses } from '../../../lib/courseCatalogCache';
import CourseRequestModal from './CourseRequestModal';

// Copy is identical to the public catalog's — this is the same catalog, wearing
// the hub's dark theme.
const COURSE_TYPE_CONFIG = {
  specialism: {
    title: 'Specialism',
    description: 'Comprehensive courses that\nenable you to enter a new career',
  },
  skill: {
    title: 'Skill',
    description: 'Tangible skills that\nyou can immediately apply',
  },
  subject: {
    title: 'Subject',
    description: 'In-depth studies to\nlearn anything you want',
  },
};

const EMPTY_BY_TYPE = { specialism: [], skill: [], subject: [] };

// Characters typed before the "Request" offer is allowed to appear.
const REQUEST_MIN_CHARS = 4;

/**
 * A course card.
 *
 * Deliberately a plain <a>, not a react-router <Link>: /courses/* is a Vercel
 * rewrite to the Next.js app, so client-side routing would land on the SPA's `*`
 * catch-all and 404. It has to be a real document navigation either way.
 *
 * Navigates in the same tab. Enrolment then happens on the public course page,
 * and coming back to /progress is a fresh load, so the hub reads the new course
 * without any hand-off.
 */
const CourseCard = ({ course }) => {
  const slug = course.name?.toLowerCase().replace(/\s+/g, '-')
    || course.title?.toLowerCase().replace(/\s+/g, '-');

  return (
    <a
      href={`/courses/${slug}`}
      className="group block bg-white rounded-[8px] px-5 py-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-black font-semibold tracking-[-0.01em]">
          {course.title || course.name}
        </span>
        {/* flex-shrink-0 is the one addition to /welcome's markup: these columns
            are narrower than the catalog's, and without it a long title squashes
            the chip out of square. No visual effect when there is room. */}
        <div
          className="bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ width: '35px', height: '35px' }}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-600 group-hover:text-[#EF0B72] transition-colors"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </a>
  );
};

/**
 * One type column. The filter animation is the catalog's: rows collapse via
 * grid-template-rows 1fr↔0fr rather than unmounting, so hiding and showing a
 * card as the query changes is a single continuous transition. Transitions stay
 * off until the entry stagger has finished, or the two would fight.
 */
const CourseTypeColumn = ({ type, courses, searchQuery = '', cardStaggerBase = 0, cardStaggerIncrement = 0.1 }) => {
  const config = COURSE_TYPE_CONFIG[type] || COURSE_TYPE_CONFIG.skill;

  const initialRenderRef = useRef(true);
  const useStagger = initialRenderRef.current && cardStaggerBase > 0;
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  useEffect(() => {
    if (!useStagger) {
      setTransitionsEnabled(true);
      return;
    }
    const longestDelay = cardStaggerBase + (courses.length - 1) * cardStaggerIncrement;
    const timer = setTimeout(() => {
      initialRenderRef.current = false;
      setTransitionsEnabled(true);
    }, (longestDelay + 0.6) * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`flex flex-col ${courses.length === 0 ? 'hidden md:flex' : ''}`}>
      <h3 className="text-[22px] font-semibold text-[#EF0B72] mb-1 text-center tracking-normal">
        {config.title}
      </h3>
      <p className="text-white text-sm mb-6 min-h-[40px] text-center font-light whitespace-pre-line">
        {config.description}
      </p>
      <div className="flex flex-col">
        {courses.map((course, idx) => {
          const isVisible = courseMatchesQuery(course, searchQuery);

          return (
            <div
              key={course.id || course.name}
              style={{
                display: 'grid',
                gridTemplateRows: (useStagger || isVisible) ? '1fr' : '0fr',
                opacity: useStagger ? undefined : (isVisible ? 1 : 0),
                marginBottom: (useStagger || isVisible) ? '12px' : '0px',
                transition: transitionsEnabled
                  ? 'grid-template-rows 300ms cubic-bezier(0.33, 1, 0.68, 1), opacity 250ms ease, margin-bottom 300ms cubic-bezier(0.33, 1, 0.68, 1)'
                  : 'none',
              }}
            >
              <div style={{ overflow: useStagger ? 'visible' : 'hidden' }}>
                <div
                  style={useStagger ? {
                    animation: 'fadeInUpSmall 0.6s ease-out forwards',
                    animationDelay: `${cardStaggerBase + idx * cardStaggerIncrement}s`,
                    opacity: 0,
                  } : undefined}
                >
                  <CourseCard course={course} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SkeletonColumn = () => (
  <div className="flex flex-col">
    <div className="h-7 rounded w-24 mx-auto mb-1 animate-pulse" style={{ background: '#2A2A2A' }} />
    <div className="mb-6 min-h-[40px] flex flex-col items-center gap-1">
      <div className="h-4 rounded w-40 animate-pulse" style={{ background: '#212121' }} />
      <div className="h-4 rounded w-36 animate-pulse" style={{ background: '#212121' }} />
    </div>
    <div className="flex flex-col" style={{ gap: '12px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-[8px] animate-pulse" style={{ height: '59px', background: 'rgba(255,255,255,0.12)' }} />
      ))}
    </div>
  </div>
);

/**
 * Section 2 for a user with no enrolled course: the full course catalog, dark.
 *
 * Takes the place of CourseDetailsSection, and keeps its id="course-details" so
 * the intro copy's "choose your course" anchor still scrolls here.
 */
const CourseSelectorSection = () => {
  // Two breakpoints on purpose. `isMobile` (1024, the hub's lg:) drives this
  // section's own chrome — padding and heading size — so it matches the sections
  // around it. `isNarrow` (768) drives everything the catalog owns, because
  // /welcome keys its grid, its column hiding and its stagger to window.innerWidth
  // < 768. Running the catalog on 1024 desynced the two between those widths: a
  // column filtered to nothing snapped away whole instead of collapsing its cards.
  const isMobile = useIsMobile();
  const isNarrow = useIsMobile(768);
  const [coursesByType, setCoursesByType] = useState(EMPTY_BY_TYPE);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHovered, setSearchHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchInputRef = useRef(null);
  const bandRef = useRef(null);
  const contentRef = useRef(null);
  const sectionRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClipped, setIsClipped] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedQuery, setRequestedQuery] = useState('');

  // Focus the search on load. `preventScroll` is the whole trick: this section
  // sits below the intro, so React's autoFocus (or a plain .focus()) would scroll
  // the page down to it and the user would never see the greeting they landed on.
  useEffect(() => {
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      // Stale-while-revalidate off the shared 1h localStorage cache, the same one
      // the public catalog warms — so this is usually an instant paint.
      const cached = getCachedCourses();
      if (cached) {
        setCoursesByType(cached);
        setLoading(false);
      }

      try {
        const fresh = await getCoursesByType();
        setCachedCourses(fresh);
        if (!cancelled) setCoursesByType(fresh);
      } catch (err) {
        console.error('[CourseSelector] Failed to load courses:', err);
        if (!cancelled && !cached) setError('Failed to load courses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => { cancelled = true; };
  }, []);

  const hasSearchQuery = searchQuery.trim().length > 0;
  // `<= 1` rather than `=== 0`, matching /welcome: one stray fuzzy match still
  // means the thing you searched for is not here, so the offer stays up.
  const totalFilteredResults = Object.values(coursesByType)
    .flat()
    .filter((c) => courseMatchesQuery(c, searchQuery)).length;
  // Hold the offer back until there is a real query to request. A word being
  // typed passes through lengths that match nothing — "u", "un" — and without
  // this the button flashes in and out on the way to a genuine search.
  const noResults = searchQuery.trim().length >= REQUEST_MIN_CHARS && totalFilteredResults <= 1;

  const handleRequestCourse = () => {
    setRequestedQuery(searchQuery.trim());
    setShowRequestModal(true);
  };

  const columns = [
    { type: 'specialism', courses: coursesByType.specialism || [] },
    { type: 'skill', courses: coursesByType.skill || [] },
    { type: 'subject', courses: coursesByType.subject || [] },
  ];

  // Collapsible band, sized off the longest column since that is what sets how
  // far the catalog runs down the page. Caps are /welcome's
  // (WelcomeHero.tsx:119-122) less 20%: 750/650/550/450px and 85vh become
  // 600/520/440/360px and 68vh.
  const maxRows = Math.max(...columns.map(({ courses }) => courses.filter(c => courseMatchesQuery(c, searchQuery)).length));
  // While loading, size to the skeleton's 4 rows. Sizing off the real (still
  // empty) counts would clamp to 450px, clip the skeleton, flash the Expand
  // button, then jump when the data lands.
  const bandRows = loading ? 4 : maxRows;
  const bandMaxHeight = isNarrow
    ? '68vh'
    : bandRows >= 3 ? '600px' : bandRows === 2 ? '520px' : bandRows === 1 ? '440px' : '360px';

  // /welcome infers "is anything hidden?" from card counts, which works there
  // because its overhead is fixed. This section's overhead moves with the
  // viewport (the heading and search share a row above 768 and stack below), so
  // measure the band instead — that way the fade and the button appear exactly
  // when something really is cut off. While expanded the last collapsed reading
  // is kept, or the control would erase itself the moment it was used.
  //
  // Observed rather than measured once per state change, because both relevant
  // heights are animated: the non-matching cards collapse over 300ms and the
  // band's own cap eases over 800ms. Measuring the instant a query changes reads
  // both mid-flight — content still near its full height, cap still near its old
  // one — which latches `isClipped` true and leaves it there, since nothing
  // afterwards re-measures. That is what put the fade over a card that fit.
  // Watching both boxes means the final callback lands on the settled layout.
  useEffect(() => {
    const band = bandRef.current;
    const content = contentRef.current;
    if (!band || !content) return;

    const measure = () => {
      setContentHeight(content.scrollHeight);
      if (!isExpanded) setIsClipped(band.scrollHeight > band.clientHeight + 1);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(band);     // catches the cap easing between sizes
    observer.observe(content);  // catches cards collapsing in and out
    return () => observer.disconnect();
  }, [isExpanded]);

  return (
    // `antialiased` is what makes the type match /welcome. Its <body> carries the
    // same class, so the whole public catalog renders with grayscale smoothing;
    // the SPA applies it only to .logo-layer, leaving everything else on subpixel
    // smoothing, which renders visibly heavier — most of all for light-on-black.
    // The utility classes here are already identical to the catalog's; the
    // smoothing was the whole difference.
    <section
      ref={sectionRef}
      id="course-details"
      className="bg-black px-5 lg:px-12 antialiased"
      // The Expand button already sits 16px in from the band's bottom edge, so
      // the section's usual 45px underneath it reads as a dead gap. Tighten it
      // while the control is on screen; with no control the 45px is what keeps
      // this section in rhythm with the ones around it.
      style={{ paddingTop: isMobile ? '32px' : '45px', paddingBottom: isClipped ? '16px' : '45px' }}
    >
     <div className="relative">
      <div
        ref={bandRef}
        style={{
          maxHeight: isExpanded ? `${contentHeight}px` : bandMaxHeight,
          overflow: 'hidden',
          // Animating to a measured pixel height rather than /welcome's 'none'
          // so expanding eases open instead of snapping — 'none' is not a value
          // max-height can transition to.
          transition: 'max-height 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
      {/* Unstyled wrapper whose only job is to give the ResizeObserver a box that
          tracks the content's true height — the band's own is pinned at the cap. */}
      <div ref={contentRef}>
      {/* Heading and search share a row from 768 up — the same width the columns
          below go three-across — and stack under it on narrow screens. */}
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 md:gap-8"
        style={{ marginBottom: isMobile ? '28px' : '40px' }}
      >
        <h2
          className="text-white md:flex-shrink-0"
          style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-1%' }}
        >
          What do you want to learn?
        </h2>

        {/* Search — the /welcome catalog's search bar as-is: white pill, no border,
            a grey glow that lifts on hover, and a magnifier that only shows on
            mobile (see next-app/src/components/catalog/CourseSearch.tsx). The glow
            is driven by local state rather than that component's global
            document.querySelector, which is the same result without the DOM hunt.
            Keeps /welcome's 660px cap but shrinks to share the row. */}
        <div
          className="w-full md:flex-1 md:max-w-[660px] relative"
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => setSearchHovered(false)}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && noResults) { e.preventDefault(); handleRequestCourse(); } }}
            placeholder=""
            aria-label="Search courses"
            className={`w-full bg-white rounded-xl px-6 py-3 text-gray-900 caret-[#EF0B72] focus:outline-none transition-all ${!noResults ? 'pr-11 md:pr-6' : ''}`}
            style={{
              boxShadow: `0 0 10px rgba(103,103,103,${searchHovered ? 0.75 : 0.6})`,
              paddingRight: noResults ? '160px' : undefined,
            }}
          />
          {/* Decorative magnifier (mobile only) — stands down for the Request button */}
          {!noResults && (
            <svg
              className="absolute right-4 top-0 bottom-0 my-auto text-[#C5C5C5] pointer-events-none md:hidden"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          )}
          {/* Request button — /welcome's, kept mounted so it can fade rather than
              pop as the query crosses the no-results threshold. */}
          <button
            type="button"
            onClick={handleRequestCourse}
            tabIndex={noResults ? 0 : -1}
            aria-hidden={!noResults}
            className="group absolute right-1 top-0 bottom-0 my-auto flex items-center gap-2 bg-[#EBEBEB]/80 rounded-lg pl-3 pr-1.5 cursor-pointer"
            style={{
              height: 'fit-content',
              paddingTop: '6px',
              paddingBottom: '6px',
              opacity: noResults ? 1 : 0,
              transform: noResults ? 'scale(1)' : 'scale(0.9)',
              pointerEvents: noResults ? 'auto' : 'none',
              transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span className="text-black font-medium text-sm tracking-[-0.01em]">Request</span>
            <div className="bg-white rounded-md flex items-center justify-center" style={{ width: '28px', height: '28px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-center" style={{ color: '#757575', fontSize: '0.9rem' }}>{error}</p>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[35px]">
          <SkeletonColumn />
          <SkeletonColumn />
          <SkeletonColumn />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-[35px]">
          {(() => {
            // Stacked, the columns read as one list, so the stagger runs straight
            // through them; side by side, all three start together.
            let cardOffset = 0;
            return columns.map(({ type, courses }) => {
              const filteredCount = courses.filter(c => courseMatchesQuery(c, searchQuery)).length;
              const el = (
                <div key={type} className={filteredCount === 0 && hasSearchQuery ? 'hidden md:block' : ''}>
                  <CourseTypeColumn
                    type={type}
                    courses={courses}
                    searchQuery={searchQuery}
                    cardStaggerBase={isNarrow ? 0.15 + cardOffset * 0.1 : 0.15}
                  />
                </div>
              );
              cardOffset += courses.length;
              return el;
            });
          })()}
        </div>
      )}
      </div>
      </div>

      {/* Bottom fade — /welcome's, recoloured for the black section. Signals the
          band is clipped. */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[50px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.96) 50%, rgba(0,0,0,1) 100%)',
          opacity: !isExpanded && isClipped ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      <button
        type="button"
        onClick={() => {
          // Collapsing while scrolled below the section would strand the user
          // past the footer, so pull its top back into view first. /welcome eases
          // to scrollY 0 instead, which only works because its band is the
          // landing view; this one sits mid-page.
          if (isExpanded && sectionRef.current) {
            const top = sectionRef.current.getBoundingClientRect().top;
            if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' });
          }
          setIsExpanded(!isExpanded);
        }}
        className="absolute bottom-4 right-0 py-2 bg-[#8200EA] hover:bg-[#7000C9] text-white text-sm font-semibold transition-colors text-center z-20"
        style={{
          letterSpacing: '-0.01em',
          borderRadius: '0.25rem',
          width: '85px',
          opacity: isClipped ? 1 : 0,
          pointerEvents: isClipped ? 'auto' : 'none',
          transition: 'opacity 0.3s ease, background-color 0.15s ease',
        }}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
     </div>

      {showRequestModal && (
        <CourseRequestModal
          courseName={requestedQuery}
          // Clearing the query on close restores the full catalog, so the user
          // is not left staring at the empty result they just requested.
          onClose={() => { setShowRequestModal(false); setSearchQuery(''); }}
        />
      )}
    </section>
  );
};

export default CourseSelectorSection;
