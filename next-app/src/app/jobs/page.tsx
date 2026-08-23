import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JobBoardClient from './JobBoardClient'
import JobsFAQSection from './JobsFAQSection'
import ProfessionLinks from '@/components/jobs/ProfessionLinks'
import { getJobs, getSourceAttribution, getProfessionsWithJobs } from '@/data/jobsData'
import { getRecentPosts } from '@/lib/blogData'
import { SITE_FAQS } from '@/lib/faqs'
import { OG_DEFAULTS, ORG_ID, SITE_URL, brandTitle, ogImages } from '@/lib/siteConfig'

// Five minutes. Ingest runs once a day, so a shorter window would just add
// Supabase reads for content that has not changed.
export const revalidate = 300

const BASE_URL = SITE_URL

// No brand suffix — the root layout's `%s | Ignite` template adds it, and
// brandTitle() adds it to the social cards below.
const TITLE = 'UK Job Board for Entry, Mid and Senior Roles'

export const metadata: Metadata = {
  title: TITLE,
  description:
    'Browse current UK vacancies by profession and experience level. Entry level, mid and senior roles in UX design, data analysis, cyber security, product management and digital marketing.',
  keywords:
    'uk jobs, entry level jobs uk, graduate jobs uk, junior jobs, ux designer jobs, data analyst jobs, cyber security jobs, product manager jobs, digital marketing jobs, career change jobs, job board',
  alternates: { canonical: '/jobs' },
  openGraph: {
    // Spread, never replace: Next overwrites openGraph across layout → page
    // rather than merging it.
    ...OG_DEFAULTS,
    title: brandTitle(TITLE),
    description:
      'Current UK vacancies filtered by profession and experience level, reviewed by hand before they appear.',
    url: '/jobs',
    images: ogImages(),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: brandTitle(TITLE),
    description: 'Current UK vacancies filtered by profession and experience level.',
    images: ogImages(),
  },
}

export default async function JobBoardPage() {
  const [jobs, sources, professionsWithJobs, recentPosts] = await Promise.all([
    getJobs({ market: 'gb' }),
    getSourceAttribution(),
    getProfessionsWithJobs('gb'),
    getRecentPosts(5),
  ])

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Job Board',
      description: 'Current UK vacancies by profession and experience level.',
      url: `${BASE_URL}/jobs`,
      publisher: { '@id': ORG_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Job Board', item: `${BASE_URL}/jobs` },
      ],
    },
  ]

  // NOTE: no JobPosting markup anywhere on this feature. There are no per-job
  // pages to attach it to, and emitting it would feed listings into the Google
  // Jobs widget — which renders the vacancy inside Google's own result and sends
  // the click somewhere other than here, defeating the account gate. It would
  // also conflict with source terms that forbid redistribution to competing
  // aggregators.

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="flex flex-col min-h-screen bg-white">
        <div className="flex-1">
          {/* Sticky black bar over a black hero, as on the course pages — the
              navbar and the band read as one surface until you scroll past it. */}
          <div className="sticky top-0 z-50">
            <Navbar variant="black" />
          </div>

            <JobBoardClient
              jobs={jobs}
              professions={professionsWithJobs}
              sources={sources}
            />

            {/* The only crawlable path into /jobs/[professionSlug]. The
                profession filter above is client-side state and produces no
                URL, so before this row those pages were reachable from the
                sitemap and llms.txt alone — indexed in principle, rarely
                crawled and carrying no internal link equity in practice. */}
            <ProfessionLinks
              professions={professionsWithJobs}
              heading="Browse jobs by profession"
            />

            <JobsFAQSection faqs={SITE_FAQS} posts={recentPosts} />
        </div>
        <Footer />
      </div>
    </>
  )
}
