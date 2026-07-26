import { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogCard from '@/components/BlogCard'
import { getAllPublishedPosts } from '@/lib/blogData'
import { generateStaticPageBreadcrumb } from '@/lib/structuredData'
import { SITE_URL, SITE_NAME, ORG_ID, OG_DEFAULTS, ogImages } from '@/lib/siteConfig'

export const revalidate = 3600

const TITLE = 'Blog'
const DESCRIPTION =
  'Articles from Ignite Education on learning, careers and building skills that employers actually want.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    ...OG_DEFAULTS,
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: '/blog',
    type: 'website',
    images: ogImages(),
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: ogImages(),
  },
}

/**
 * The blog index.
 *
 * This route did not exist before: /blog returned a hard 404 while
 * structuredData.ts emitted it as a BreadcrumbList ancestor and the footer
 * carried a dead <span>Blog</span>. Posts were therefore orphaned — the only
 * crawlable link to any of them was the single visible card in the homepage
 * carousel. This gives every post a permanent hub to be linked from.
 */
export default async function BlogIndexPage() {
  const posts = await getAllPublishedPosts()

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': `${TITLE} | ${SITE_NAME}`,
      'description': DESCRIPTION,
      'url': `${SITE_URL}/blog`,
      'inLanguage': 'en-GB',
      'publisher': { '@id': ORG_ID },
      'mainEntity': {
        '@type': 'ItemList',
        'numberOfItems': posts.length,
        'itemListElement': posts.map((post, i) => ({
          '@type': 'ListItem',
          'position': i + 1,
          'url': `${SITE_URL}/blog/${post.slug}`,
          'name': post.title,
        })),
      },
    },
    generateStaticPageBreadcrumb(TITLE, '/blog'),
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

        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
            <h1
              className="font-semibold text-gray-900 mb-3"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              {TITLE}
            </h1>
            <p className="text-gray-600 mb-12" style={{ fontSize: '1.125rem', maxWidth: '620px' }}>
              {DESCRIPTION}
            </p>

            {posts.length === 0 ? (
              <p className="text-gray-600">No posts published yet — check back soon.</p>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <BlogCard key={post.id} post={post} className="h-full" />
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
