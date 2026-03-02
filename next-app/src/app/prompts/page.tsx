import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PromptToolkitClient from './PromptToolkitClient'

export const revalidate = 3600

const BASE_URL = 'https://ignite.education'

export const metadata: Metadata = {
  title: 'Prompt Toolkit',
  description:
    'Discover the best LLM prompts for Claude, Co-Pilot, ChatGPT and Gemini. Browse curated prompts by profession, tool, and complexity to make your daily work tasks easier with better outcomes.',
  keywords:
    'LLM prompts, AI prompts, Claude prompts, ChatGPT prompts, Co-Pilot prompts, Gemini prompts, prompt toolkit, AI productivity, prompt engineering, ignite education',
  alternates: {
    canonical: `${BASE_URL}/prompts`,
  },
  openGraph: {
    title: 'Prompt Toolkit | Ignite Education',
    description:
      'Discover the best LLM prompts for Claude, Co-Pilot, ChatGPT and Gemini to make your daily work tasks easier with better outcomes.',
    url: `${BASE_URL}/prompts`,
    siteName: 'Ignite Education',
    images: [{ url: `${BASE_URL}/og-image.png` }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Toolkit | Ignite Education',
    description:
      'Discover the best LLM prompts for Claude, Co-Pilot, ChatGPT and Gemini to make your daily work tasks easier with better outcomes.',
    images: [`${BASE_URL}/og-image.png`],
  },
}

export default function PromptToolkitPage() {
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
        <Navbar variant="black" />
        <PromptToolkitClient />
        <Footer />
      </div>
    </>
  )
}
