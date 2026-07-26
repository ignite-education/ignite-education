import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getAudioByPostId, getAllPublishedSlugs } from '@/lib/blogData'
import {
  generateBlogPostStructuredData,
  generateBlogBreadcrumbStructuredData,
  generateSpeakableSchema,
} from '@/lib/structuredData'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogPostClient from './BlogPostClient'
import { SITE_NAME, OG_DEFAULTS, ogImages, stripBrand, truncateAtWord } from '@/lib/siteConfig'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return { title: 'Post Not Found' }
  }

  // Editors sometimes save meta_title with the brand already appended (e.g.
  // "The Case for Slow Dopamine | Ignite"), which the root layout's title
  // template would then double up. Strip it defensively.
  const title = stripBrand(post.meta_title || post.title)
  const description = truncateAtWord(post.meta_description || post.excerpt || '')
  const url = `/blog/${slug}`
  const images = ogImages(post.og_image || post.featured_image)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      ...OG_DEFAULTS,
      // openGraph.title has no template applied, so it keeps the brand suffix.
      title: `${post.title} | ${SITE_NAME}`,
      description,
      url,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name || 'Ignite Team'],
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | ${SITE_NAME}`,
      description,
      images,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params

  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const audioData = await getAudioByPostId(post.id)

  const structuredData = [
    generateBlogPostStructuredData(post, slug),
    generateBlogBreadcrumbStructuredData(post.title, slug),
    generateSpeakableSchema(
      `https://ignite.education/blog/${slug}`,
      post.title,
      ['.blog-article', 'h1', 'h2', 'h3']
    ),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-black">
        <div className="sticky top-0 z-50">
          <Navbar variant="black" />
        </div>

        <BlogPostClient post={post} audioData={audioData} />

        <Footer />
      </div>
    </>
  )
}
