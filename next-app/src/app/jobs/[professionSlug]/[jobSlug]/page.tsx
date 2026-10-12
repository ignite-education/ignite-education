import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProfessionLinks from '@/components/jobs/ProfessionLinks'
import SourceAttribution from '@/components/jobs/SourceAttribution'
import JobPageApply from '@/components/jobs/JobPageApply'
import { CompanyLogo } from '@/components/jobs/JobCard'
import { META_TAG_CLASS, metaTagStyle } from '@/components/jobs/metaTag'
import {
  getJobByShortId, getSourceAttribution, getProfessionsWithJobs, MAX_POSTED_AGE_DAYS,
  type JobDetail, type JobSourceAttribution,
} from '@/data/jobsData'
import { getProfessionBySlug } from '@/lib/professionUtils'
import { parseJobSlug, slugifyTitle } from '@/lib/jobSlug'
import { parseDescription } from '@/lib/descriptionBlocks'
import { blocksToHtml } from '@/lib/jobPostingHtml'
import { SENIORITY_SHORT, formatPostedAt, formatSalary } from '@/lib/seniorityLabels'
import {
  generateJobPostingStructuredData, generateJobBreadcrumbStructuredData,
  employmentTypes, MIN_JOBPOSTING_DESCRIPTION_CHARS,
} from '@/lib/structuredData'
import { OG_DEFAULTS, SITE_URL, brandTitle, ogImages, truncateAtWord } from '@/lib/siteConfig'

// Same window as the board. Ingest is nightly, so a listing that expires
// mid-window serves at most five minutes of a page whose validThrough is
// already in the past — which Google explicitly accepts.
export const revalidate = 300

/**
 * One job, on its own URL.
 *
 * This is the page Google for Jobs indexes: the full advert server-rendered,
 * one JobPosting JSON-LD block built from the same blocks the page renders, a
 * self-canonical URL, and a real 404 once the listing is gone. The board's
 * pane is still where people READ jobs; this exists so that a crawler can.
 *
 * The URL contract is in lib/jobSlug.ts. Only the id suffix resolves; a stale
 * title or profession in the path 308s to the current one, so every URL the
 * sitemap has ever emitted keeps working after a retitle.
 *
 * What is NOT here, and must stay out:
 *  - The apply URL. JobPageApply resolves it client-side behind auth, exactly
 *    as the pane does. The markup says directApply: false for that reason.
 *  - canonical_url / source_job_id. See JOB_PAGE_COLUMNS in jobsData.ts.
 *  - A loading.tsx. The sibling layout's comment explains why notFound() needs
 *    an unflushed response.
 */

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
}

type Params = Promise<{ professionSlug: string; jobSlug: string }>

/**
 * Resolve the job a URL names, or null when it is gone.
 *
 * Returns the job AND whether the requested path is its current one, so the
 * page can 308 rather than serve the same content on two URLs.
 */
async function resolveJob(professionSlug: string, jobSlug: string): Promise<{ job: JobDetail; canonical: boolean } | null> {
  const shortId = parseJobSlug(jobSlug)
  if (!shortId) return null

  const matches = await getJobByShortId(shortId, 'gb')
  if (matches.length === 0) return null

  // Two live rows sharing an 8-hex prefix is a 2^-32 event, but if it happens
  // the title text in the slug settles it.
  const titlePart = jobSlug.slice(0, -(shortId.length + 1))
  const job = matches.find(m => slugifyTitle(m.title) === titlePart) || matches[0]
  if (!job.path) return null

  return { job, canonical: job.path === `/jobs/${professionSlug}/${jobSlug}` }
}

function isEligible(job: JobDetail, sources: Record<string, JobSourceAttribution>, descriptionLength: number): boolean {
  return (
    sources[job.source]?.allowJobPosting !== false &&
    descriptionLength >= MIN_JOBPOSTING_DESCRIPTION_CHARS &&
    Boolean(job.path)
  )
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { professionSlug, jobSlug } = await params
  const resolved = await resolveJob(professionSlug, jobSlug)
  if (!resolved || !resolved.canonical) return {}
  const { job } = resolved

  const sources = await getSourceAttribution()
  const title = `${job.title} at ${job.company}`
  const description = truncateAtWord(job.snippet || `${job.title} vacancy at ${job.company}.`)
  const eligible = isEligible(job, sources, (job.descriptionText || '').length)

  return {
    title,
    description,
    alternates: { canonical: job.path! },
    // A listing we may not mark up (aggregator-sourced, or too thin to be a
    // real posting) is also not worth indexing as a page — it would be a
    // duplicate of the employer's own advert with less on it.
    robots: eligible ? undefined : { index: false, follow: true },
    openGraph: {
      ...OG_DEFAULTS,
      title: brandTitle(title),
      description,
      url: job.path!,
      images: ogImages(),
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandTitle(title),
      description,
      images: ogImages(),
    },
  }
}

export default async function JobPage({ params }: { params: Params }) {
  const { professionSlug, jobSlug } = await params

  const resolved = await resolveJob(professionSlug, jobSlug)
  if (!resolved) notFound()
  const { job, canonical } = resolved
  if (!canonical) permanentRedirect(job.path!)

  const [profession, sources, professionsWithJobs] = await Promise.all([
    getProfessionBySlug(professionSlug),   // existence guaranteed by the layout
    getSourceAttribution(),
    getProfessionsWithJobs('gb'),
  ])
  const professionName = profession!.title || profession!.name

  // One parse, two consumers: the elements below and the JSON-LD description.
  // Deriving both from the same blocks is what keeps the markup honest.
  const blocks = parseDescription(job.descriptionText || '')
  const descriptionHtml = blocksToHtml(blocks)
  const eligible = isEligible(job, sources, (job.descriptionText || '').length)

  const pageUrl = `${SITE_URL}${job.path}`
  const structuredData = [
    generateJobBreadcrumbStructuredData(professionName, professionSlug, { title: job.title, path: job.path! }),
    ...(eligible
      ? [generateJobPostingStructuredData(job, pageUrl, descriptionHtml, { maxPostedAgeDays: MAX_POSTED_AGE_DAYS })]
      : []),
  ]

  // Everything the markup states must be visible on the page, in the same
  // words. The pane deliberately omits salary; here it is shown exactly when
  // baseSalary is emitted (an employer-stated figure), and never otherwise.
  const posted = formatPostedAt(job.postedAt)
  const location = job.isRemote
    ? job.locationCity ? `Remote · ${job.locationCity}` : 'Remote'
    : job.locationCity || job.location || null
  const employment = employmentTypes(job.contractType, job.contractTime).map(t => EMPLOYMENT_LABELS[t] || t)
  const salary = job.salaryIsEstimate
    ? null
    : formatSalary({ min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency, period: job.salaryPeriod })

  const textStyle = { fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em', lineHeight: 1.65 } as const

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="flex flex-col min-h-screen bg-white">
        <div className="flex-1">
          <div className="sticky top-0 z-50">
            <Navbar variant="black" />
          </div>

          {/* The board's grey band and grid (max-w-4xl / 762px), so this reads
              as the pane lifted onto its own page rather than a new design. */}
          <div className="bg-[#F6F6F6]">
            <div className="max-w-4xl mx-auto px-6 pt-8 pb-12 flex justify-center">
              <div className="w-full" style={{ maxWidth: '762px' }}>
                <nav aria-label="Breadcrumb" className="mb-4">
                  <Link
                    href={`/jobs/${professionSlug}`}
                    className="inline-flex items-center gap-1.5 text-black/55 hover:text-black transition-colors"
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.82rem', letterSpacing: '-0.01em' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    All {professionName} jobs
                  </Link>
                </nav>

                <article className="bg-white rounded-[8px]">
                  <div className="px-7 pt-6 pb-5">
                    <div className="flex items-start gap-5">
                      <CompanyLogo company={job.company} logoUrl={job.companyLogoUrl} eager size={52} />

                      <div className="min-w-0 flex-1">
                        <h1
                          className="text-black font-semibold break-words"
                          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '22px', letterSpacing: '-0.02em', lineHeight: 1.25 }}
                        >
                          {job.title}
                        </h1>
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
                          {employment.map(label => (
                            <span key={label} className={META_TAG_CLASS} style={metaTagStyle}>{label}</span>
                          ))}
                          {salary && <span className={META_TAG_CLASS} style={metaTagStyle}>{salary}</span>}
                        </div>
                      </div>

                      <JobPageApply
                        jobId={job.id}
                        jobTitle={job.title}
                        company={job.company}
                        className="shrink-0 self-start"
                      />
                    </div>
                  </div>

                  <div className="px-7 py-6">
                    {blocks.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {blocks.map((block, index) => (
                          <p
                            key={index}
                            className={`text-black font-light break-words ${block.type === 'bullet' ? 'pl-[18px] relative' : ''}`}
                            style={textStyle}
                          >
                            {block.type === 'bullet' && (
                              <span className="absolute left-[2px] text-black/45" aria-hidden="true">•</span>
                            )}
                            {block.text}
                          </p>
                        ))}
                      </div>
                    ) : (
                      job.snippet && <p className="text-black font-light break-words" style={textStyle}>{job.snippet}</p>
                    )}

                    <div className="mt-6 empty:hidden">
                      <SourceAttribution sourceKey={job.displaySource} sources={sources} />
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <ProfessionLinks
            professions={professionsWithJobs}
            currentProfession={professionName}
            heading="Browse jobs by profession"
          />
        </div>
        <Footer />
      </div>
    </>
  )
}
