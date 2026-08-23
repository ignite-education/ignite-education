import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JobBoardClient from '../JobBoardClient'
import JobsFAQSection from '../JobsFAQSection'
import ProfessionLinks from '@/components/jobs/ProfessionLinks'
import { getJobs, getSourceAttribution, getProfessionsWithJobs } from '@/data/jobsData'
import { getProfessionBySlug, getAllProfessionSlugs } from '@/lib/professionUtils'
import { getRecentPosts } from '@/lib/blogData'
import { SITE_FAQS } from '@/lib/faqs'
import { OG_DEFAULTS, ORG_ID, SITE_URL, brandTitle, ogImages } from '@/lib/siteConfig'

export const revalidate = 300

const BASE_URL = SITE_URL

/**
 * The same board, pre-filtered to one profession.
 *
 * These are the SEO asset for the whole feature — a small, stable set of URLs
 * that answer the query people actually type ("entry level ux designer jobs
 * uk"). The per-job pages that would normally carry that weight do not exist
 * here by design.
 *
 * Titles and headings use the SINGULAR profession name throughout, which is
 * both the grammatical form and the searched one: "Product Manager Jobs", not
 * "Product Managers Jobs". Note that pluraliseProfession() is deliberately not
 * imported here any more — it is still correct on /prompts, where the plural
 * names an audience ("AI Prompt Toolkit for Product Managers") rather than
 * modifying a noun.
 */
export async function generateStaticParams() {
  const slugs = await getAllProfessionSlugs()
  return slugs.map(professionSlug => ({ professionSlug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ professionSlug: string }>
}): Promise<Metadata> {
  const { professionSlug } = await params
  const profession = await getProfessionBySlug(professionSlug)
  if (!profession) return {}

  const name = profession.title || profession.name
  const title = `${name} Jobs in the UK`
  const description = `Current UK ${name} vacancies by experience level — entry level, mid and senior. Reviewed by hand and linked straight to the employer.`

  // Professions with no live listings are noindexed. A thin, empty page is an
  // SEO liability; the same page with inventory is an asset, so this flips
  // automatically as the board fills up.
  const professionsWithJobs = await getProfessionsWithJobs('gb')
  const hasJobs = professionsWithJobs.includes(name)

  return {
    title,
    description,
    alternates: { canonical: `/jobs/${professionSlug}` },
    robots: hasJobs ? undefined : { index: false, follow: true },
    openGraph: {
      ...OG_DEFAULTS,
      title: brandTitle(title),
      description,
      url: `/jobs/${professionSlug}`,
      images: ogImages(),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: brandTitle(title),
      description,
      images: ogImages(),
    },
  }
}

export default async function ProfessionJobsPage({
  params,
}: {
  params: Promise<{ professionSlug: string }>
}) {
  const { professionSlug } = await params
  // Existence is already guaranteed by the sibling layout.
  const profession = await getProfessionBySlug(professionSlug)
  const name = profession!.title || profession!.name

  const [jobs, sources, professionsWithJobs, recentPosts] = await Promise.all([
    getJobs({ market: 'gb', profession: name }),
    getSourceAttribution(),
    getProfessionsWithJobs('gb'),
    getRecentPosts(5),
  ])

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${name} Jobs`,
      description: `Current UK ${name} vacancies by experience level.`,
      url: `${BASE_URL}/jobs/${professionSlug}`,
      publisher: { '@id': ORG_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Job Board', item: `${BASE_URL}/jobs` },
        { '@type': 'ListItem', position: 3, name: `${name} Jobs`, item: `${BASE_URL}/jobs/${professionSlug}` },
      ],
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="flex flex-col min-h-screen bg-white">
        <div className="flex-1">
          <div className="sticky top-0 z-50">
            <Navbar variant="black" />
          </div>

            {/* initialProfession is the ONLY thing that differs from /jobs.
                The hero copy is JobBoardClient's own — see the constants there
                — so this page renders the main board's headline verbatim, with
                the profession chip arriving selected. Everything bespoke to the
                role is metadata: the title, description, canonical and the
                structured data above. */}
            <JobBoardClient
              jobs={jobs}
              professions={professionsWithJobs}
              sources={sources}
              initialProfession={name}
            />

            {/* The same row /jobs renders, minus this page's own profession and
                plus a link back up to the full board. Kept on both pages
                because it is the crawlable path between them — the profession
                chip above is client-side state and produces no URL. */}
            <ProfessionLinks
              professions={professionsWithJobs}
              currentProfession={name}
              heading="Browse jobs by profession"
            />

            {/* Parity with /jobs, which has rendered this since launch. Without
                it a profession page carries strictly less unique text than the
                parent it competes with for the same queries — the two would
                differ only by an h1 and a subheading. */}
            <JobsFAQSection faqs={SITE_FAQS} posts={recentPosts} />
        </div>
        <Footer />
      </div>
    </>
  )
}
