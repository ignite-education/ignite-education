import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import JobBoardClient from '../JobBoardClient'
import { getJobs, getSourceAttribution, getProfessionsWithJobs } from '@/data/jobsData'
import { getProfessionBySlug, getAllProfessionSlugs, pluraliseProfession } from '@/lib/professionUtils'
import { OG_DEFAULTS, ORG_ID, SITE_URL, ogImages } from '@/lib/siteConfig'

export const revalidate = 300

const BASE_URL = SITE_URL

/**
 * The same board, pre-filtered to one profession.
 *
 * These are the SEO asset for the whole feature — a small, stable set of URLs
 * that answer the query people actually type ("entry level ux designer jobs
 * uk"). The per-job pages that would normally carry that weight do not exist
 * here by design.
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
  const plural = pluraliseProfession(name)
  const title = `${plural} Jobs in the UK`
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
      title: `${title} | Ignite Education`,
      description,
      url: `/jobs/${professionSlug}`,
      images: ogImages(),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Ignite Education`,
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
  const plural = pluraliseProfession(name)

  const [jobs, sources, professionsWithJobs] = await Promise.all([
    getJobs({ market: 'gb', profession: name }),
    getSourceAttribution(),
    getProfessionsWithJobs('gb'),
  ])

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${plural} Jobs`,
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
        { '@type': 'ListItem', position: 3, name: `${plural} Jobs`, item: `${BASE_URL}/jobs/${professionSlug}` },
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

            <JobBoardClient
              jobs={jobs}
              professions={professionsWithJobs}
              sources={sources}
              initialProfession={name}
              heading={`${plural} jobs`}
              tagline={jobs.length > 0 ? 'Updated daily · Reviewed by hand' : 'Coming to the board soon'}
              subheading={
                jobs.length > 0
                  ? `Live UK ${name} vacancies, filtered by experience level and linked straight to the employer.`
                  : `We're adding ${name} roles to the board now. In the meantime, browse everything else we have open.`
              }
            />
        </div>
        <Footer />
      </div>
    </>
  )
}
