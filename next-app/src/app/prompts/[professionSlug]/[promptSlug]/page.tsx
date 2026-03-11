import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getAllPromptSlugs, getPromptBySlug } from '@/data/placeholderPrompts'
import PromptDetailClient from './PromptDetailClient'

export const revalidate = 60

const BASE_URL = 'https://ignite.education'

interface PageProps {
  params: Promise<{ professionSlug: string; promptSlug: string }>
}

export async function generateStaticParams() {
  const promptSlugs = await getAllPromptSlugs()

  return promptSlugs.map(({ professionSlug, slug }) => ({
    professionSlug,
    promptSlug: slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { professionSlug, promptSlug } = await params

  const prompt = await getPromptBySlug(promptSlug)
  if (!prompt) {
    return { title: 'Prompt Not Found' }
  }

  const title = `${prompt.title} — Free AI Prompt Template | Ignite`
  const description = prompt.description.slice(0, 160)
  const url = `${BASE_URL}/prompts/${professionSlug}/${promptSlug}`

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

export default async function PromptDetailPage({ params }: PageProps) {
  const { professionSlug, promptSlug } = await params

  const prompt = await getPromptBySlug(promptSlug)

  if (!prompt) {
    notFound()
  }

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': prompt.title,
      'description': prompt.description,
      'url': `${BASE_URL}/prompts/${professionSlug}/${promptSlug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'Prompt Toolkit', 'item': `${BASE_URL}/prompts` },
        { '@type': 'ListItem', 'position': 3, 'name': prompt.profession, 'item': `${BASE_URL}/prompts/${professionSlug}` },
        { '@type': 'ListItem', 'position': 4, 'name': prompt.title, 'item': `${BASE_URL}/prompts/${professionSlug}/${promptSlug}` },
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
              <PromptDetailClient prompt={prompt} professionSlug={professionSlug} slug={promptSlug} isPending={prompt.status === 'pending'} />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}
