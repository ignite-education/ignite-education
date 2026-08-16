'use client'

import { useState, useEffect } from 'react'
import type { Job, JobSourceAttribution } from '@/data/jobsData'
import { SENIORITY_SHORT, formatPostedAt } from '@/lib/seniorityLabels'
import { fetchJobDescription, parseDescription, type DescriptionBlock } from '@/lib/jobDescription'
import SourceAttribution from './SourceAttribution'
import { useApplyAction, ApplyButton } from './ApplyGate'
import { CompanyLogo, META_TAG_CLASS, metaTagStyle } from './JobCard'

/**
 * The right-hand pane: one job, read properly.
 *
 * The list beside it shows the two-sentence AI summary, which is enough to
 * choose between roles and not enough to decide on one. This is where the
 * employer's own advert goes — description_text, fetched a row at a time
 * because the board's 300-row payload cannot carry 40KB each. See
 * lib/jobDescription.ts for why that is one query and no API route.
 *
 * Apply lives HERE and nowhere else now. It used to sit on every card, but a
 * 380px list column has no room for it beside a title, and one unmissable
 * button against the job you are actually reading converts better than twenty
 * identical ones you are scrolling past. The gate itself is unchanged —
 * ApplyGate still resolves the outbound URL server-side behind auth.
 */

interface JobDetailPaneProps {
  job: Job
  sources: Record<string, JobSourceAttribution>
  isSignedIn: boolean | null
  /** Rendered as a back control on the phone's full-screen view; omitted on desktop. */
  onClose?: () => void
}

/**
 * Four grey bars where the advert will be.
 *
 * A spinner would say "something is happening"; this says "prose is coming and
 * roughly this much of it", so the pane does not jump when the text lands. The
 * widths taper because paragraphs do.
 */
function DescriptionSkeleton() {
  const widths = ['100%', '96%', '88%', '64%']
  return (
    <div className="mt-6 flex flex-col gap-3" aria-hidden="true">
      {widths.map((width, index) => (
        <div
          key={index}
          className="rounded-[4px] bg-black/[0.06]"
          style={{
            width,
            height: '13px',
            animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
            animationDelay: `${index * 0.06}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function JobDetailPane({ job, sources, isSignedIn, onClose }: JobDetailPaneProps) {
  const { apply, error: applyError, modal } = useApplyAction({
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    isSignedIn,
  })

  const [blocks, setBlocks] = useState<DescriptionBlock[] | null>(null)
  const [failed, setFailed] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect --
     The fetch is the effect; its result is the state. Keyed on job.id so
     selecting a different role restarts it, and `live` drops the answer to a
     job the visitor has already moved on from — with hover-to-select on the
     list, three requests can easily be in flight at once and they do not
     resolve in the order they were made. */
  useEffect(() => {
    let live = true
    setBlocks(null)
    setFailed(false)

    fetchJobDescription(job.id)
      .then(text => {
        if (!live) return
        const parsed = text ? parseDescription(text) : []
        // An empty advert is a failure to the reader even though the request
        // succeeded — some feeds carry a title and nothing else. Fall through
        // to the summary rather than showing a blank pane under a heading.
        setBlocks(parsed.length > 0 ? parsed : [])
      })
      .catch(() => { if (live) setFailed(true) })

    return () => { live = false }
  }, [job.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  const posted = formatPostedAt(job.postedAt)
  const location = job.isRemote
    ? job.locationCity ? `Remote · ${job.locationCity}` : 'Remote'
    : job.locationCity || job.location || null

  // Nothing to show from the advert itself — either the fetch failed or the
  // listing genuinely has no body. The summary is always present, so the pane
  // degrades to what the card had rather than to an apology.
  const showSummaryInstead = failed || (blocks !== null && blocks.length === 0)

  return (
    <>
      {/* One scroll region, header included.
          The advert used to scroll inside the pane while the logo, the title
          and Apply stayed pinned above it — which meant reading a 900-word
          description happened through a slot, with a third of the pane spent on
          a heading that never moved. Now the whole pane scrolls as one page and
          the header leaves with it; get to the bottom of the advert and the
          board is what comes back, not a frame you have to escape.

          Capped and scrolled only at lg, where the pane is a column beside the
          list and must not outgrow the window. On a phone the pane IS the
          window, so it takes its height from its content and scrolls with the
          document — no inner scroller, which would otherwise trap the gesture.

          Apply is above the fold on arrival and is reachable again in one flick
          of the wheel; JobBoardClient remounts this component on every
          selection, so each role opens at the top of its own advert.

          hide-scrollbar (globals.css, also on the welcome page's course
          carousel) takes away the bar but not the scrolling — wheel, trackpad,
          touch and keyboard all still work. The pane is a white card on a grey
          band, and a track running down its inner edge made it read as a
          frame around the advert rather than a page of it. What tells you
          there is more is the text itself, cut off mid-paragraph at the fold. */}
      {/* lg:overflow-x-hidden is the backstop under the wrapping fixes below.
          overflow-y:auto with overflow-x left at its default does NOT leave the
          other axis alone — `visible` cannot pair with a scrolling axis, so the
          browser silently promotes it to `auto`, and this pane has been a
          two-axis scroller the whole time. Anything a stray pixel wider than
          its box, now or in some advert nobody has seen yet, could be dragged
          sideways. Naming the axis stops that for good.

          Only at lg, and deliberately: below it the pane is not a scroll
          container at all, and setting overflow on one axis there would promote
          the other to auto and hand the phone a nested scroller to get stuck
          in. Narrow widths are covered by the wrapping instead. */}
      <div className="bg-white rounded-[8px] hide-scrollbar lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:overflow-x-hidden">
        <div className="px-7 pt-6 pb-5 border-b border-black/[0.07]">
          {/* lg:hidden rather than conditional on the prop: the board passes
              onClose at every width because it cannot know which layout the
              stylesheet has chosen, and on desktop there is nothing to go back
              TO — the list is already beside the pane. */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex items-center gap-1.5 text-black/55 hover:text-black transition-colors mb-4 cursor-pointer"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.82rem', letterSpacing: '-0.01em' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              All roles
            </button>
          )}

          <div className="flex items-start gap-5">
            <CompanyLogo
              key={job.companyLogoUrl || 'tile'}
              company={job.company}
              logoUrl={job.companyLogoUrl}
              eager
              size={52}
            />

            <div className="min-w-0 flex-1">
              {/* The one h2 on the pane. Bigger than the list's 18px titles
                  because this is the page's subject now, not a row in it. */}
              {/* break-words here too: a title or an employer name can arrive
                  as one unbroken run — an ATS slug, a hyphenless German
                  compound — and the header has less width to lose than the
                  advert does. */}
              <h2
                className="text-black font-semibold break-words"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '22px', letterSpacing: '-0.02em', lineHeight: 1.25 }}
              >
                {job.title}
              </h2>
              <p
                className="text-black font-normal mt-[5px] break-words"
                style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '15px', letterSpacing: '-0.01em' }}
              >
                {job.company}
              </p>

              <div className="flex items-center gap-2 mt-[9px] flex-wrap">
                {location && <span className={META_TAG_CLASS} style={metaTagStyle}>{location}</span>}
                {posted && <span className={META_TAG_CLASS} style={metaTagStyle}>{posted}</span>}
                <span className={META_TAG_CLASS} style={metaTagStyle}>
                  {SENIORITY_SHORT[job.seniority] || job.seniority}
                </span>
              </div>

              {/* No salary in this header, deliberately.
                  The list card carries the figure because a column of roles is
                  scanned and compared. The pane is not scanned — it is read,
                  and directly below this sits the employer's own advert, which
                  states the pay in the employer's own words along with what it
                  is conditional on. Repeating a derived figure two inches above
                  the real one added a second number to disagree with the first:
                  ours is normalised to a period and is sometimes an estimate,
                  theirs is neither. Salary filtering is not offered on this
                  board, so nothing else depends on it being here. */}
            </div>

            {/* Top right, on the title's own line. It ran the pane's full width
                below the header until now, which gave it emphasis it did not
                need — it is the only purple thing here and the only thing being
                asked for, and a corner is enough to carry that. Moving it up
                also buys the advert a whole line of the fold back.

                shrink-0 and self-start: the title beside it wraps to two and
                three lines on long roles, and the button must neither compress
                to fit them nor drift down the middle as they grow.

                No stopPropagation needed — unlike the card, nothing behind this
                button wants the click. */}
            <ApplyButton className="shrink-0 self-start" size="block" onClick={apply} />
          </div>

          {applyError && (
            <p
              className="text-[#EF0B72] mt-2"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.75rem', letterSpacing: '-0.01em' }}
            >
              {applyError}
            </p>
          )}
        </div>

        {/* The advert itself. No scroller of its own — see the wrapper above.

            break-words on every run of advert text, and it is load-bearing.
            Employers paste raw URLs into these descriptions — one Trainline
            listing carries an 80-character link to a benefits PDF — and a URL
            has no spaces to break at, so by default it runs straight out of its
            paragraph. The paragraph's own box stays the right width, which is
            why this never showed up as an element overflowing; only the text
            inside it did, and it pushed the pane's scrollWidth past its
            clientWidth and let the whole advert be dragged sideways. */}
        <div className="px-7 py-6">
          {blocks === null && !failed && <DescriptionSkeleton />}

          {showSummaryInstead && job.snippet && (
            <p
              className="text-black font-light break-words"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.65 }}
            >
              {job.snippet}
            </p>
          )}

          {blocks !== null && blocks.length > 0 && (
            /* Bullets and paragraphs in one flow rather than reassembled into
               real <ul>s. The source markup is long gone — htmlToText left a
               "• " prefix and a newline, and inferring list boundaries back out
               of that would guess wrong on every advert that opens with a
               bulleted summary. Indenting the bullets gets the reader the
               structure; pretending to know where each list starts and stops
               would not. */
            <div className="flex flex-col gap-3">
              {blocks.map((block, index) => (
                <p
                  key={index}
                  className={`text-black font-light break-words ${block.type === 'bullet' ? 'pl-[18px] relative' : ''}`}
                  style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.65 }}
                >
                  {block.type === 'bullet' && (
                    <span className="absolute left-[2px] text-black/45" aria-hidden="true">•</span>
                  )}
                  {block.text}
                </p>
              ))}
            </div>
          )}

          {/* Attribution renders on every advert — a contractual requirement for
              some sources, not a courtesy. It followed the summary on the old
              card and it follows the full text here, which is the more literal
              reading of the requirement than it ever was before. */}
          <div className="mt-6 empty:hidden">
            <SourceAttribution sourceKey={job.displaySource} sources={sources} />
          </div>
        </div>
      </div>
      {modal}
    </>
  )
}
