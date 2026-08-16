'use client'

import { useState } from 'react'
import type { Job } from '@/data/jobsData'
import { SENIORITY_SHORT, formatPostedAt } from '@/lib/seniorityLabels'

/**
 * One row of the list column.
 *
 * This is now a chooser, not a listing: it carries enough to pick between roles
 * and hands the reading to JobDetailPane on the right. Apply left with it —
 * a 380px column has no room for a button beside a title, and the pane is where
 * the decision is actually made.
 *
 * Selecting is a click, and only a click. Resting the pointer on a row used to
 * open it after a second, which was pleasant to demonstrate and tiring to use:
 * the pane changed under a cursor that was only passing through, and the
 * gesture existed on desktop and nowhere else. Exactly one row is selected at a
 * time and the board owns which — this component is told, it does not decide.
 *
 * NO description and no pay figure. The row is the role, the employer and the
 * three facts you would filter on; everything else is in the pane.
 * That makes the column scan fast and keeps the rows a uniform height, and it
 * is a deliberate design choice rather than an oversight — the summary is still
 * on `job.snippet` and JobDetailPane still falls back to it.
 *
 * The cost is paid in SEO, and is worth stating where someone will find it: the
 * pane fetches its advert in the browser, so with the summary gone from here,
 * NO descriptive prose about any role reaches the server-rendered HTML. What a
 * crawler now sees of this board is titles, employers, places and dates. If the
 * profession pages ever need body text to rank on, this row is where it went —
 * put a clamped `job.snippet` back and it returns to the markup for all 300
 * rows at once.
 */

interface JobCardProps {
  job: Job
  index?: number
  /** Whether this is the one selected row. Owned by the board — see JobBoardClient. */
  isSelected: boolean
  /** Pass this job's id to select it. Selecting replaces the last. */
  onSelect: (jobId: string) => void
}

/**
 * Colour-tinted initial tile. The fallback whenever there is no logo — an
 * employer we could not resolve a domain for, a logo an admin suppressed, or an
 * image that fails to load in the browser.
 */
function CompanyTile({ company, size }: { company: string; size: number }) {
  const palette = ['#8200EA', '#EF0B72', '#7500F1', '#0B8FEF', '#00A47C', '#E5760B']
  let hash = 0
  for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) >>> 0
  const colour = palette[hash % palette.length]

  return (
    <div
      className="shrink-0 rounded-[6px] flex items-center justify-center text-white font-semibold"
      style={{ width: `${size}px`, height: `${size}px`, backgroundColor: colour, fontSize: `${size * 0.42}px` }}
      aria-hidden="true"
    >
      {company.trim().charAt(0).toUpperCase()}
    </div>
  )
}

/**
 * Employer logo, re-hosted in the Supabase assets bucket by the nightly ingest.
 *
 * Plain <img>, not next/image, for three reasons: the board renders up to 300
 * rows, so /_next/image would cost 300 round trips to save ~2KB each; a minority
 * of these are ICO or SVG, which the optimizer rejects without
 * `dangerouslyAllowSVG`; and it matches SourceAttribution right next door and
 * the brand marks in PromptFilters.
 *
 * If this is ever migrated to next/image, `remotePatterns` must be updated in
 * BOTH vercel.json and next-app/next.config.ts — the apex-only failure mode
 * (400 INVALID_IMAGE_OPTIMIZE_REQUEST) is invisible on next.ignite.education.
 *
 * Exported because JobDetailPane shows the same mark a size up. `size` rather
 * than a className so the width, the height and the tile's letter stay in step
 * — they were three numbers that had to agree, and now they are one.
 */
export function CompanyLogo({
  company,
  logoUrl,
  eager,
  size = 45,
}: {
  company: string
  logoUrl: string | null
  eager: boolean
  size?: number
}) {
  const [broken, setBroken] = useState(false)
  if (!logoUrl || broken) return <CompanyTile company={company} size={size} />

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      // Decorative: the company name is the adjacent line of text, so alt text
      // here would just make screen readers say it twice.
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-[6px] object-contain"
      // object-contain because the source can be anywhere from 32px to 128px
      // square — never assume the dimensions. No padding, so a full-bleed mark
      // reaches the edges and the 6px radius actually crops its corners; that
      // is the whole point of the radius, and with 5px of inset it did nothing.
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}

/**
 * The tag from /progress section 1 (IntroSection's "Joined" / "12 Lessons" /
 * "Insider" row): 12px, black, 4px radius, 8×3 padding. Every circumstance of
 * the role wears it, so the meta line reads as a row of chips rather than a
 * run-on sentence with middots.
 *
 * The employer is the exception, and deliberately: it sits above this row as
 * plain text. Where the job is, when it was posted and what level it is are all
 * filters — the same facts the bar above the board sorts by, and a chip is what
 * a filterable value looks like on this page. Who the job is for is not one of
 * those; it is half the headline.
 *
 * The one departure is the fill — #F6F6F6 rather than /progress's #F0F0F0, so
 * it is the same grey as the band behind the cards. Three near-identical greys
 * on one row would read as a mistake.
 *
 * Exported alongside the logo so the detail pane's header states the same facts
 * in the same clothes; a chip that changed shape between the list and the pane
 * would read as a different kind of fact.
 */
export const META_TAG_CLASS = 'inline-block px-[8px] py-[3px] text-black bg-[#F6F6F6] rounded-[4px] font-normal'
export const metaTagStyle = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontSize: '12px',
  letterSpacing: '-0.02em',
} as const

export default function JobCard({ job, index = 0, isSelected, onSelect }: JobCardProps) {
  const posted = formatPostedAt(job.postedAt)
  const location = job.isRemote
    ? job.locationCity ? `Remote · ${job.locationCity}` : 'Remote'
    : job.locationCity || job.location || null

  return (
    <article
      /* The whole row is the click target, and it has exactly two appearances:
         flat white, or flat white with a shadow when the pane is showing it.
         Nothing responds to hover — no lift, no shadow, no growth. A row does
         not change under the cursor at all; only choosing it changes it.

         That makes the shadow unambiguous. It used to be a scale of three —
         resting, hovered, selected — so the state had to be read as a
         difference between two shadows, and the row you happened to be pointing
         at competed with the row actually open. Now the shadow means one thing.

         The shadow itself is deliberately light — 12px at 0.35, roughly half
         what it was. It could afford to come down because nothing competes with
         it any more: against a column of rows casting no shadow at all, a faint
         one is still the only one, and it no longer has to shout over a hover
         state to be told apart from it.

         There is a floor under this, though. It is the ONLY thing marking the
         selected row — no colour, no size, no border — so it cannot be reduced
         much further without the list losing any sign of which role the pane is
         showing. If it needs to be quieter than this, it needs to be joined by
         something rather than replaced.

         Two other consequences worth knowing. `cursor-pointer` is the only
         remaining signal that a row is clickable, so it is load-bearing rather
         than decorative. And an unselected row is white on the band's #F6F6F6 —
         a 3% step, with nothing else to separate it — so how legible the list is
         rests entirely on that contrast.

         No `group` either: it was here so a chevron and an Apply button could
         answer to the row's hover, and both have since left the card.

         box-shadow is the only transitioned property left, which is why the
         transition names it rather than listing scale as well. */
      onClick={() => onSelect(job.id)}
      aria-current={isSelected ? 'true' : undefined}
      className={`bg-white rounded-[8px] px-5 py-[18px] cursor-pointer transition-shadow duration-300 ease-in-out ${
        isSelected ? 'shadow-[0_0_12px_rgba(103,103,103,0.35)]' : ''
      }`}
      style={{
        animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${Math.min(index, 8) * 0.04}s`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Keyed on the URL so the `broken` flag resets when React recycles
            this card for a different job during filtering — otherwise one
            failed image would leave later cards stuck on the initial tile. */}
        <CompanyLogo
          key={job.companyLogoUrl || 'tile'}
          company={job.company}
          logoUrl={job.companyLogoUrl}
          eager={index < 8}
          size={40}
        />

        <div className="min-w-0 flex-1">
          {/* The row's own subject, and the whole card is the control that
              opens it — so this is a heading rather than a button. Making the
              title focusable would put a tab stop on every one of up to 300
              rows before the reader reached the pane; the list is navigated by
              pointer and by the search box above it. */}
          <h3
            className="text-black font-semibold line-clamp-2"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '16px', letterSpacing: '-0.01em', lineHeight: 1.3 }}
          >
            {job.title}
          </h3>

          <p
            className="text-black font-normal truncate mt-[3px]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '13px', letterSpacing: '-0.01em' }}
          >
            {job.company}
          </p>

          {/* Wraps rather than truncating: the column is narrow enough that a
              location and a date will not always share a line, and a second row
              of chips is better than one of them cut off. */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {location && (
              <span className={`${META_TAG_CLASS} truncate`} style={{ ...metaTagStyle, maxWidth: '100%' }}>
                {location}
              </span>
            )}
            {posted && <span className={META_TAG_CLASS} style={metaTagStyle}>{posted}</span>}
            <span className={META_TAG_CLASS} style={metaTagStyle}>
              {SENIORITY_SHORT[job.seniority] || job.seniority}
            </span>
          </div>

          {/* No pay figure here, and none in the pane either.
              The row is the role, the employer and the three facts you would
              filter on. Our figure is derived — normalised to a period, and on
              some sources an estimate rather than the advert's own number — so
              the only place it was ever certain is the employer's text, which
              is what the pane shows. Showing it on two rows in three also made
              the column look inconsistent rather than informative, because most
              listings carry no salary at all.

              job.salaryMin/Max/Currency/Period/IsEstimate are still selected in
              jobsData.ts and still on the type; nothing renders them now. Left
              in place because dropping them from BOARD_COLUMNS is a data-layer
              change, and because a salary filter is the obvious next thing to
              want from them. */}
        </div>
      </div>
    </article>
  )
}
