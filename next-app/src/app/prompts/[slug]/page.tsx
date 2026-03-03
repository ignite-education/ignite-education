import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { placeholderPrompts, promptToSlug, getPromptBySlug } from '@/data/placeholderPrompts'
import PromptDetailClient from './PromptDetailClient'

export const revalidate = 3600

const BASE_URL = 'https://ignite.education'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return placeholderPrompts.map((p) => ({
    slug: promptToSlug(p.title),
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const prompt = getPromptBySlug(slug)

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

export default async function PromptDetailPage({ params }: PageProps) {
  const { slug } = await params
  const prompt = getPromptBySlug(slug)

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

      <div className="min-h-screen bg-white">
        <Navbar variant="black" />

        <div className="max-w-4xl mx-auto px-6 py-15 pb-16 flex justify-center">
          <div className="w-full" style={{ maxWidth: '762px' }}>
            <PromptDetailClient prompt={prompt} slug={slug} />
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}
