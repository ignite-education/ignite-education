import { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight, ExternalLink } from 'lucide-react'
import { generateStaticPageBreadcrumb } from '@/lib/structuredData'
import { getPublishedReleases, formatReleaseDate } from '@/lib/releaseNotesData'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Release Notes',
  description: 'View the latest updates, features, and improvements to Ignite Education. Stay informed about new releases and enhancements to our learning platform.',
  keywords: 'release notes, updates, changelog, new features, Ignite Education updates',
  openGraph: {
    title: 'Release Notes | Ignite Education',
    description: 'View the latest updates, features, and improvements to Ignite Education.',
    url: 'https://ignite.education/release-notes',
    siteName: 'Ignite Education',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Release Notes | Ignite Education',
    description: 'View the latest updates, features, and improvements to Ignite Education.',
  },
}

function formatNoteText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default async function ReleaseNotesPage() {
  const releases = await getPublishedReleases()
  const breadcrumbData = generateStaticPageBreadcrumb('Release Notes', '/release-notes')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      <Navbar variant="black" />

      {/* Hero Section (Black) */}
      <div className="bg-black">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <nav className="flex items-center gap-2 text-sm mb-7" style={{ color: '#F0F0F2' }}>
            <Link href="/welcome" className="hover:text-[#EF0B72] transition-colors flex items-center" style={{ color: '#F0F0F2' }}>
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
            <span style={{ color: '#F0F0F2' }}>Release Notes</span>
          </nav>

          <h1 className="text-4xl font-bold text-white">Release Notes</h1>
        </div>
      </div>

      {/* White Content Section */}
      <div className="bg-white flex-grow">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {releases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No release notes available yet.
            </div>
          ) : (
            <div className="space-y-10">
              {releases.map((release) => (
                <article key={release.id} className="border-b border-gray-200 pb-8 last:border-b-0">
                  {/* Version and Date Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[#EF0B72] text-white">
                      {release.version}
                    </span>
                    {release.blog_url && (
                      <a
                        href={release.blog_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-sm text-[#EF0B72] hover:text-[#D10A64] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <span className="text-gray-500 text-sm">
                      {formatReleaseDate(release.release_date)}
                    </span>
                  </div>

                  {/* Release Notes */}
                  <ul className="list-disc list-inside space-y-2 text-gray-900 ml-1">
                    {(release.notes || []).map((note, index) => (
                      <li key={index} className="leading-relaxed">
                        {formatNoteText(note)}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
