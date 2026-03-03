import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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
        <Navbar variant="default" />

        <div className="max-w-[640px] mx-auto px-6 pt-6 pb-16">
          {/* Back link */}
          <Link
            href="/prompts"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors mb-8"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            All Prompts
          </Link>

          {/* Title */}
          <h1
            className="text-[1.5rem] font-bold text-black tracking-[-0.02em] mb-3"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            {prompt.title}
          </h1>

          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span
              className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
            >
              {prompt.profession}
            </span>
            {prompt.llmTools.map((tool) => (
              <span
                key={tool}
                className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
              >
                {tool}
              </span>
            ))}
            <span
              className="inline-block text-white text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#8200EA', fontSize: '11px' }}
            >
              {prompt.complexity}
            </span>
          </div>

          {/* Description */}
          <p
            className="text-gray-600 text-sm leading-relaxed mb-5"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            {prompt.description}
          </p>

          {/* Prompt text */}
          <div
            className="mb-5 rounded-lg"
            style={{
              backgroundColor: '#F8F8F8',
              padding: '1rem 1.25rem',
              border: '1px solid #E5E7EB',
            }}
          >
            <pre
              className="text-sm text-black whitespace-pre-wrap leading-relaxed"
              style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '13px' }}
            >
              {prompt.fullPrompt}
            </pre>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-5" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {prompt.usageCount.toLocaleString()} uses
            </span>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {prompt.rating.toFixed(1)}
            </span>
          </div>

          {/* Copy button (client component) */}
          <PromptDetailClient fullPrompt={prompt.fullPrompt} />
        </div>

        <Footer />
      </div>
    </>
  )
}
