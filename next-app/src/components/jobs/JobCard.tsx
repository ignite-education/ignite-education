'use client'

import { useState } from 'react'
import type { Job, JobSourceAttribution } from '@/data/jobsData'
import { SENIORITY_SHORT, formatSalary, formatPostedAt } from '@/lib/seniorityLabels'
import SourceAttribution, { SalaryEstimateBadge } from './SourceAttribution'
import { useApplyAction, ApplyButton } from './ApplyGate'

/**
 * One row of the board: everything the visitor needs to decide, and the way out.
 *
 * There are no per-job pages and the card does not expand — the summary is the
 * whole listing here, and Apply goes straight to the employer's own advert. That
 * is why the full description is never loaded: `description_text` runs to tens of
 * kilobytes per row, and the reader who wants it is one click from the source.
 * The board therefore ships only the precomputed snippet (300 characters, see
 * buildSnippet in server/jobs/lib/normalise.js), which is about the four lines
 * shown below.
 */

interface JobCardProps {
  job: Job
  sources: Record<string, JobSourceAttribution>
  isSignedIn: boolean | null
  index?: number
}

/**
 * Colour-tinted initial tile. The fallback whenever there is no logo — an
 * employer we could not resolve a domain for, a logo an admin suppressed, or an
 * image that fails to load in the browser.
 */
function CompanyTile({ company }: { company: string }) {
  const palette = ['#8200EA', '#EF0B72', '#7500F1', '#0B8FEF', '#00A47C', '#E5760B']
  let hash = 0
  for (let i = 0; i < company.length; i++) hash = (hash * 31 + company.charCodeAt(i)) >>> 0
  const colour = palette[hash % palette.length]

  return (
    <div
      className="shrink-0 rounded-[6px] flex items-center justify-center text-white font-semibold"
      style={{ width: '45px', height: '45px', backgroundColor: colour, fontSize: '1.16rem' }}
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
 */
function CompanyLogo({ company, logoUrl, eager }: { company: string; logoUrl: string | null; eager: boolean }) {
  const [broken, setBroken] = useState(false)
  if (!logoUrl || broken) return <CompanyTile company={company} />

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      // Decorative: the company name is the adjacent line of text, so alt text
      // here would just make screen readers say it twice.
      alt=""
      aria-hidden="true"
      width={45}
      height={45}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-[6px] object-contain"
      // object-contain because the source can be anywhere from 32px to 128px
      // square — never assume the dimensions. No padding, so a full-bleed mark
      // reaches the edges and the 6px radius actually crops its corners; that
      // is the whole point of the radius, and with 5px of inset it did nothing.
      style={{ width: '45px', height: '45px' }}
    />
  )
}

const badgeStyle = {
  backgroundColor: '#F6F6F6',
  color: '#7500F1',
  fontSize: '0.75rem',
  letterSpacing: '-0.01em',
} as const

/**
 * The tag from /progress section 1 (IntroSection's "Joined" / "12 Lessons" /
 * "Insider" row): 12px, black, 4px radius, 8×3 padding. Every fact under the
 * job title wears it, so the meta line reads as a row of chips rather than a
 * run-on sentence with middots.
 *
 * The one departure is the fill — #F6F6F6 rather than /progress's #F0F0F0, so
 * it is the same grey as the band behind the cards and the Apply plate. Three
 * near-identical greys on one row would read as a mistake.
 */
const META_TAG_CLASS = 'inline-block px-[8px] py-[3px] text-black bg-[#F6F6F6] rounded-[4px] font-normal'
const metaTagStyle = {
  fontFamily: 'var(--font-geist-sans), sans-serif',
  fontSize: '12px',
  letterSpacing: '-0.02em',
} as const

export default function JobCard({ job, sources, isSignedIn, index = 0 }: JobCardProps) {
  const { apply, error, modal } = useApplyAction({
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    isSignedIn,
  })

  const salary = formatSalary({
    min: job.salaryMin,
    max: job.salaryMax,
    currency: job.salaryCurrency,
    period: job.salaryPeriod,
  })
  const posted = formatPostedAt(job.postedAt)
  const location = job.isRemote
    ? job.locationCity ? `Remote · ${job.locationCity}` : 'Remote'
    : job.locationCity || job.location || null

  return (
    <>
    <article
      /* The whole row is the click target — anywhere on it applies. `group` so
         the button inside can answer to the card's hover rather than its own.

         White on the section's grey band, lifted by the same glow the "Continue
         with" sign-in buttons use (EnrollmentCTA), deepened on hover and grown
         0.3% to mark the row the cursor is on. The growth is drawn, not laid out,
         so its neighbours stay exactly where they are.

         `scale`, not `transform`: the fadeInUp entry below animates transform
         with fill-mode `both`, so its final translateY(0) is applied forever and
         beats any transform declared here. Tailwind v4's scale-* utilities set
         the independent `scale` property, which sidesteps that entirely — but it
         does mean the transition has to name `scale`, since transitioning
         `transform` would not cover it. */
      onClick={apply}
      className="group bg-white rounded-[8px] p-6 cursor-pointer shadow-[0_0_10px_rgba(103,103,103,0.3)] hover:shadow-[0_0_14px_rgba(103,103,103,0.55)] hover:scale-[1.003] transition-[box-shadow,scale] duration-350 ease-in-out"
      style={{
        animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${Math.min(index, 8) * 0.04}s`,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Keyed on the URL so the `broken` flag resets when React recycles
            this card for a different job during filtering — otherwise one
            failed image would leave later cards stuck on the initial tile. */}
        <CompanyLogo
          key={job.companyLogoUrl || 'tile'}
          company={job.company}
          logoUrl={job.companyLogoUrl}
          eager={index < 8}
        />

        <div className="min-w-0 flex-1">
          {/* Weight and tracking match the sidebar's group headings
              (JobFilterPanel), which in turn take them from the course pages'
              module titles; the size sits a point under theirs. Colour does not
              follow either — those are purple because they head a column, and a
              job title is the card's own subject. */}
          <h3
            className="text-black font-semibold truncate"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '17px', letterSpacing: '-0.01em' }}
          >
            {job.title}
          </h3>

          {/* Meta row: one tag per fact. Seniority sits here rather than in a
              badge column of its own — it is the same order of fact as the
              employer, the location and the posting date.

              Only the location can run long (some are a full street address),
              so it is the only one allowed to ellipsize; the rest are shrink-0
              and always readable in full. */}
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className={`${META_TAG_CLASS} shrink-0 whitespace-nowrap`} style={metaTagStyle}>
              {job.company}
            </span>
            {location && (
              <span className={`${META_TAG_CLASS} truncate`} style={{ ...metaTagStyle, maxWidth: '45%' }}>
                {location}
              </span>
            )}
            {posted && (
              <span className={`${META_TAG_CLASS} shrink-0 whitespace-nowrap`} style={metaTagStyle}>
                {posted}
              </span>
            )}
            <span className={`${META_TAG_CLASS} shrink-0 whitespace-nowrap`} style={metaTagStyle}>
              {SENIORITY_SHORT[job.seniority] || job.seniority}
            </span>
          </div>
        </div>

        {salary && (
          <span
            className="hidden xl:flex items-center gap-1.5 shrink-0 text-black font-medium"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.82rem', letterSpacing: '-0.01em' }}
          >
            {salary}
            {job.salaryIsEstimate && <SalaryEstimateBadge sourceKey={job.displaySource} sources={sources} />}
          </span>
        )}

        {/* Where the action reads from, top right. It carries no handler of its
            own — the click bubbles to the card, which owns it. */}
        <ApplyButton className="shrink-0" />
      </div>

      {/* The description, and all of it the board ever shows. Usually an AI
          summary of the full advert (server/jobs/lib/summarise.js), falling
          back to the 300-character truncation for listings not yet summarised —
          jobsData.ts picks between them, so this component sees one field.

          Clamped to four lines so every row is the same height however long the
          text runs. Both producers cap at 300 characters, which is roughly four
          lines at this width, so most listings clamp by a word or two rather
          than losing a paragraph.

          It is also the only descriptive text about the role that reaches the
          server-rendered HTML, which is what a board page trying to rank for
          "ux designer jobs uk" needs beyond a list of titles. -webkit-line-clamp
          hides the overflow visually without removing it from the document. */}
      {job.snippet && (
        <p
          className="text-black font-light mt-5"
          style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: '0.9rem',
            letterSpacing: '-0.01em',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 4,
            overflow: 'hidden',
          }}
        >
          {job.snippet}
        </p>
      )}

      {/* Salary, for the widths where it does not fit in the row above. xl
          rather than lg: the inline figure appears at xl, so gating this at lg
          left a band between the two where the salary showed nowhere at all. */}
      {salary && (
        <div className="flex xl:hidden items-center gap-2 mt-[18px] flex-wrap">
          <span className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-[5px]" style={badgeStyle}>
            {salary}
            {job.salaryIsEstimate && <SalaryEstimateBadge sourceKey={job.displaySource} sources={sources} />}
          </span>
        </div>
      )}

      {/* Attribution renders on every advert — a contractual requirement for
          some sources, not a courtesy. Driven by display_source. empty:hidden
          because the ATS feeds require nothing, and SourceAttribution then
          renders null — without it those cards would carry 12px of dead space.

          Any apply error lands on this row too, rather than under the button:
          the header row keeps its height whatever happens.

          The gap depends on what this row actually follows. At xl the salary
          pill above is hidden, so it follows the description and takes the 18px
          the description is given below it; narrower than that, with a salary to
          show, it follows the pill instead and the pair stay at the tighter
          12px. No salary at all and it follows the description at every width. */}
      <div className={`flex items-center justify-between gap-3 empty:hidden ${salary ? 'mt-3 xl:mt-[18px]' : 'mt-[18px]'}`}>
        {error && (
          <p
            className="text-[#EF0B72]"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.72rem', letterSpacing: '-0.01em' }}
          >
            {error}
          </p>
        )}
        <SourceAttribution sourceKey={job.displaySource} sources={sources} />
      </div>
    </article>
    {modal}
    </>
  )
}
