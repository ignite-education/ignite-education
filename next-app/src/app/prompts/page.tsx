import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PromptToolkitClient from './PromptToolkitClient'
import { getCoursesByType } from '@/lib/courseData'
import { getAllPrompts } from '@/data/placeholderPrompts'
import { OG_DEFAULTS, ORG_ID, SITE_URL, ogImages } from '@/lib/siteConfig'

export const revalidate = 60

const BASE_URL = SITE_URL

export const metadata: Metadata = {
  // No brand suffix here — the root layout's `%s | Ignite Education` template
  // adds it. This title previously rendered triple-branded.
  title: 'Free AI Prompt Templates for Professionals',
  description:
    'Browse free AI prompt templates for ChatGPT, Claude, Co-Pilot and Gemini. Ready-to-use prompts for product managers, marketers, analysts, engineers and more.',
  keywords:
    'LLM prompts, AI prompts, Claude prompts, ChatGPT prompts, Co-Pilot prompts, Gemini prompts, prompt toolkit, AI productivity, prompt engineering, ignite education, free AI prompt templates, free ChatGPT prompts, free prompt library, AI prompt templates, prompt templates, AI prompts for work, AI prompts for professionals, workplace AI prompts, AI business prompts, AI prompts for product managers, ChatGPT prompts for marketing, AI prompts for data analysts, AI prompts for HR, AI prompts for software engineers, AI prompts for sales, AI prompts for designers, AI prompts for finance, AI prompts for educators, AI writing prompts for professionals, AI prompts for productivity',
  alternates: {
    canonical: `/prompts`,
  },
  openGraph: {
    ...OG_DEFAULTS,
    title: 'Prompt Toolkit | Ignite Education',
    description:
      'Discover the best AI prompts for Claude, Co-Pilot, ChatGPT and Gemini to make your daily work tasks easier with better outcomes.',
    url: `/prompts`,
    images: ogImages(),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Toolkit | Ignite Education',
    description:
      'Discover the best AI prompts for Claude, Co-Pilot, ChatGPT and Gemini to make your daily work tasks easier with better outcomes.',
    images: ogImages(),
  },
}

export default async function PromptToolkitPage() {
  const [coursesByType, prompts] = await Promise.all([getCoursesByType(), getAllPrompts()])
  const professions = coursesByType.specialism.map(c => c.title || c.name)

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Prompt Toolkit',
      'description': 'Curated LLM prompts for professionals across industries.',
      'url': `${BASE_URL}/prompts`,
      'publisher': { '@id': ORG_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE_URL },
        { '@type': 'ListItem', 'position': 2, 'name': 'Prompt Toolkit', 'item': `${BASE_URL}/prompts` },
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
          <PromptToolkitClient professions={professions} prompts={prompts} />
        </div>
        <Footer />
      </div>
    </>
  )
}
