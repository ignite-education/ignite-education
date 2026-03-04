import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PromptToolkitClient from './PromptToolkitClient'
import { getCoursesByType } from '@/lib/courseData'

export const revalidate = 3600

const BASE_URL = 'https://ignite.education'

export const metadata: Metadata = {
  title: 'Free AI Prompt Templates for Professionals | Ignite Education',
  description:
    'Browse free AI prompt templates for ChatGPT, Claude, Co-Pilot and Gemini. Ready-to-use prompts for product managers, marketers, analysts, engineers and more.',
  keywords:
    'LLM prompts, AI prompts, Claude prompts, ChatGPT prompts, Co-Pilot prompts, Gemini prompts, prompt toolkit, AI productivity, prompt engineering, ignite education, free AI prompt templates, free ChatGPT prompts, free prompt library, AI prompt templates, prompt templates, AI prompts for work, AI prompts for professionals, workplace AI prompts, AI business prompts, AI prompts for product managers, ChatGPT prompts for marketing, AI prompts for data analysts, AI prompts for HR, AI prompts for software engineers, AI prompts for sales, AI prompts for designers, AI prompts for finance, AI prompts for educators, AI writing prompts for professionals, AI prompts for productivity',
  alternates: {
    canonical: `${BASE_URL}/prompts`,
  },
  openGraph: {
    title: 'Prompt Toolkit | Ignite Education',
    description:
      'Discover the best AI prompts for Claude, Co-Pilot, ChatGPT and Gemini to make your daily work tasks easier with better outcomes.',
    url: `${BASE_URL}/prompts`,
    siteName: 'Ignite Education',
    images: [{ url: `${BASE_URL}/og-image.png` }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Toolkit | Ignite Education',
    description:
      'Discover the best AI prompts for Claude, Co-Pilot, ChatGPT and Gemini to make your daily work tasks easier with better outcomes.',
    images: [`${BASE_URL}/og-image.png`],
  },
}

export default async function PromptToolkitPage() {
  const coursesByType = await getCoursesByType()
  const professions = coursesByType.specialism.map(c => c.title || c.name)

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Prompt Toolkit',
      'description': 'Curated LLM prompts for professionals across industries.',
      'url': `${BASE_URL}/prompts`,
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
        <Navbar hideLogo noPaddingBottom />
        <PromptToolkitClient professions={professions} />
        <Footer />
      </div>
    </>
  )
}
