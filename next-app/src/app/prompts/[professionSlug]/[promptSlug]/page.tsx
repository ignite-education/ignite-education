import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getAllPromptSlugs, getPromptBySlug } from '@/data/placeholderPrompts'
import PromptDetailClient from './PromptDetailClient'
import { OG_DEFAULTS, ORG_ID, SITE_URL, ogImages, truncateAtWord } from '@/lib/siteConfig'

export const revalidate = 60

const BASE_URL = SITE_URL

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

  // No brand suffix — the root layout applies `%s | Ignite Education`.
  const title = `${prompt.title} — Free AI Prompt Template`
  const description = truncateAtWord(prompt.description)
  const url = `${BASE_URL}/prompts/${professionSlug}/${promptSlug}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      ...OG_DEFAULTS,
      title: `${prompt.title} | Ignite Prompt Toolkit`,
      description,
      url,
      images: ogImages(),
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${prompt.title} | Ignite Prompt Toolkit`,
      description,
      images: ogImages(),
    },
  }
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { professionSlug, promptSlug } = await params

  const prompt = await getPromptBySlug(promptSlug)

  if (!prompt) {
    notFound()
  }

  const promptUrl = `${BASE_URL}/prompts/${professionSlug}/${promptSlug}`

  const structuredData = [
    // This was previously a `HowTo`, which Google rejects outright without a
    // `step` array — and a prompt template has no steps to give it. HowTo rich
    // results were retired in 2023 anyway, so there is nothing to fabricate
    // steps for. `CreativeWork` describes what this page actually is.
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      '@id': `${promptUrl}#prompt`,
      'name': prompt.title,
      'description': prompt.description,
      'text': prompt.fullPrompt,
      'url': promptUrl,
      'learningResourceType': 'Prompt template',
      'about': prompt.profession,
      'keywords': prompt.llmTools.join(', '),
      'isAccessibleForFree': true,
      'inLanguage': 'en-GB',
      'publisher': { '@id': ORG_ID },
      ...(prompt.authorName
        ? {
            'author': {
              '@type': 'Person',
              'name': prompt.authorName,
              ...(prompt.authorTitle ? { 'jobTitle': prompt.authorTitle } : {}),
              ...(prompt.authorImage ? { 'image': prompt.authorImage } : {}),
              ...(prompt.authorLinkedin ? { 'sameAs': prompt.authorLinkedin } : {}),
            },
          }
        : {}),
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
