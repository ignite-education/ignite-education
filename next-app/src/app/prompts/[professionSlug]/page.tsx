import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getPromptBySlug, getAllPrompts } from '@/data/placeholderPrompts'
import { getCoursesByType } from '@/lib/courseData'
import { getProfessionBySlug, getAllProfessionSlugs, pluraliseProfession } from '@/lib/professionUtils'
import PromptToolkitClient from '../PromptToolkitClient'

export const revalidate = 60

const BASE_URL = 'https://ignite.education'

interface PageProps {
  params: Promise<{ professionSlug: string }>
}

export async function generateStaticParams() {
  const professionSlugs = await getAllProfessionSlugs()
  return professionSlugs.map((professionSlug) => ({ professionSlug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { professionSlug } = await params

  // Check profession first
  const profession = await getProfessionBySlug(professionSlug)
  if (profession) {
    const professionName = profession.title || profession.name
    const plural = pluraliseProfession(professionName)
    const title = `AI Prompt Toolkit for ${plural} | Ignite`
    const description = `Free AI prompt templates for ${plural}. Ready-to-use prompts for ChatGPT, Claude, Co-Pilot and Gemini tailored to ${professionName} workflows.`
    const url = `${BASE_URL}/prompts/${professionSlug}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: `AI Prompt Toolkit for ${plural} | Ignite Education`,
        description,
        url,
        siteName: 'Ignite Education',
        images: [{ url: `${BASE_URL}/og-image.png` }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `AI Prompt Toolkit for ${plural} | Ignite Education`,
        description,
        images: [`${BASE_URL}/og-image.png`],
      },
    }
  }

  // Old prompt URL — redirect will happen in the page component
  return { title: 'Redirecting...' }
}

export default async function PromptSlugPage({ params }: PageProps) {
  const { professionSlug } = await params

  // Check profession first
  const profession = await getProfessionBySlug(professionSlug)
  if (profession) {
    const [coursesByType, prompts] = await Promise.all([getCoursesByType(), getAllPrompts()])
    const professions = coursesByType.specialism.map(c => c.title || c.name)
    const professionName = profession.title || profession.name
    const plural = pluraliseProfession(professionName)

    const structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': `AI Prompt Toolkit for ${plural}`,
        'description': `Curated LLM prompts for ${plural}.`,
        'url': `${BASE_URL}/prompts/${professionSlug}`,
        'publisher': {
          '@type': 'Organization',
          'name': 'Ignite Education',
          'url': BASE_URL,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
          { '@type': 'ListItem', 'position': 2, 'name': 'Prompt Toolkit', 'item': `${BASE_URL}/prompts` },
          { '@type': 'ListItem', 'position': 3, 'name': plural, 'item': `${BASE_URL}/prompts/${professionSlug}` },
        ],
      },
    ]

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <div className="flex flex-col min-h-screen bg-white">
          <Navbar hideLogo noPaddingBottom />
          <div className="flex-1">
            <PromptToolkitClient
              professions={professions}
              prompts={prompts}
              initialProfession={professionName}
              pageTitle={`AI Prompt Toolkit for ${plural}`}
            />
          </div>
          <Footer />
        </div>
      </>
    )
  }

  // Redirect old prompt URLs to new format: /prompts/{professionSlug}/{promptSlug}
  const prompt = await getPromptBySlug(professionSlug)
  if (prompt) {
    redirect(`/prompts/${prompt.professionSlug}/${professionSlug}`)
  }

  notFound()
}
