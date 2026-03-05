import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getAllPromptSlugs, getPromptBySlug, getAllPrompts } from '@/data/placeholderPrompts'
import { getCoursesByType } from '@/lib/courseData'
import { getProfessionBySlug, getAllProfessionSlugs, pluraliseProfession } from '@/lib/professionUtils'
import PromptDetailClient from './PromptDetailClient'
import PromptToolkitClient from '../PromptToolkitClient'

export const revalidate = 60

const BASE_URL = 'https://ignite.education'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const [professionSlugs, promptSlugs] = await Promise.all([
    getAllProfessionSlugs(),
    getAllPromptSlugs(),
  ])

  return [
    ...professionSlugs.map((slug) => ({ slug })),
    ...promptSlugs.map((slug) => ({ slug })),
  ]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  // Check profession first
  const profession = await getProfessionBySlug(slug)
  if (profession) {
    const professionName = profession.title || profession.name
    const plural = pluraliseProfession(professionName)
    const title = `AI Prompt Toolkit for ${plural} | Ignite`
    const description = `Free AI prompt templates for ${plural}. Ready-to-use prompts for ChatGPT, Claude, Co-Pilot and Gemini tailored to ${professionName} workflows.`
    const url = `${BASE_URL}/prompts/${slug}`

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

  // Fall back to prompt detail metadata
  const prompt = await getPromptBySlug(slug)
  if (!prompt) {
    return { title: 'Prompt Not Found' }
  }

  const title = `${prompt.title} — Free AI Prompt Template | Ignite`
  const description = prompt.description.slice(0, 160)
  const url = `${BASE_URL}/prompts/${slug}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${prompt.title} | Ignite Prompt Toolkit`,
      description,
      url,
      siteName: 'Ignite Education',
      images: [{ url: `${BASE_URL}/og-image.png` }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${prompt.title} | Ignite Prompt Toolkit`,
      description,
      images: [`${BASE_URL}/og-image.png`],
    },
  }
}

export default async function PromptSlugPage({ params }: PageProps) {
  const { slug } = await params

  // Check profession first
  const profession = await getProfessionBySlug(slug)
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
        'url': `${BASE_URL}/prompts/${slug}`,
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
          { '@type': 'ListItem', 'position': 3, 'name': plural, 'item': `${BASE_URL}/prompts/${slug}` },
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

  // Fall back to prompt detail
  const prompt = await getPromptBySlug(slug)

  if (!prompt) {
    notFound()
  }

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': prompt.title,
      'description': prompt.description,
      'url': `${BASE_URL}/prompts/${slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'Prompt Toolkit', 'item': `${BASE_URL}/prompts` },
        { '@type': 'ListItem', 'position': 3, 'name': prompt.title, 'item': `${BASE_URL}/prompts/${slug}` },
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
        <div className="sticky top-0 z-50">
          <Navbar variant="black" />
        </div>

        <div className="flex-1">
          <div className="max-w-4xl mx-auto px-6 py-20 pb-16 flex justify-center">
            <div className="w-full" style={{ maxWidth: '762px' }}>
              <PromptDetailClient prompt={prompt} slug={slug} isPending={prompt.status === 'pending'} />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}
