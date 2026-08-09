'use client'

import type { JobSourceAttribution } from '@/data/jobsData'

/**
 * Mandatory source attribution.
 *
 * This is a compliance component, not decoration. Several job APIs require a
 * badge on EVERY displayed advert and state that non-compliance means losing
 * access — a typical requirement is a logo at a minimum pixel size, hyperlinked
 * back to the aggregator. Sizes and links come from job_sources.attribution, so
 * this component never hardcodes one vendor's terms.
 *
 * The badge is driven by the listing's `display_source`, NOT its `source`: when
 * a cross-source dedupe elects a different canonical record, the obligation
 * follows whichever source we are actually showing.
 *
 * The attribution link is intentionally OUTSIDE the sign-in gate — gating it
 * would defeat the attribution requirement.
 */

interface SourceAttributionProps {
  sourceKey: string
  sources: Record<string, JobSourceAttribution>
  className?: string
}

export default function SourceAttribution({ sourceKey, sources, className = '' }: SourceAttributionProps) {
  const source = sources[sourceKey]
  const attribution = source?.attribution

  // ATS feeds (Greenhouse, Lever, Ashby, Workable) require nothing.
  if (!attribution?.required) return null

  const { label, logoUrl, logoMinWidth, logoMinHeight, linkUrl } = attribution

  const content = logoUrl ? (
    // Plain <img>, not next/image: these are absolute third-party asset URLs and
    // the pixel size is a contractual minimum, so it must not be optimised away.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={label || source.name}
      width={logoMinWidth || 116}
      height={logoMinHeight || 23}
      style={{ minWidth: logoMinWidth || 116, minHeight: logoMinHeight || 23 }}
      loading="lazy"
    />
  ) : (
    <span
      className="text-[11px] text-black/45 hover:text-[#EF0B72] transition-colors"
      style={{ fontFamily: 'var(--font-geist-sans), sans-serif', letterSpacing: '-0.01em' }}
    >
      {label || `via ${source.name}`}
    </span>
  )

  if (!linkUrl) return <span className={`inline-flex items-center ${className}`}>{content}</span>

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center shrink-0 ${className}`}
      onClick={e => e.stopPropagation()}
      title={label || source.name}
    >
      {content}
    </a>
  )
}

/**
 * The "this figure is an estimate, not an advertised salary" marker.
 *
 * Aggregators that infer salaries generally require a marker icon with specific
 * hover text wherever one is shown. It is also just honest: an inferred
 * salary presented as a real one is a bad experience regardless of the terms.
 */
export function SalaryEstimateBadge({
  sourceKey,
  sources,
}: {
  sourceKey: string
  sources: Record<string, JobSourceAttribution>
}) {
  const estimate = sources[sourceKey]?.attribution?.salaryEstimate
  const title = estimate?.title || 'Salary estimate'

  if (estimate?.iconUrl) {
    const size = estimate.minSize || 20
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={estimate.iconUrl}
        alt={title}
        title={title}
        width={size}
        height={size}
        style={{ minWidth: size, minHeight: size }}
        loading="lazy"
      />
    )
  }

  return (
    <span
      title={title}
      className="text-[11px] text-black/45"
      style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
    >
      (est.)
    </span>
  )
}
