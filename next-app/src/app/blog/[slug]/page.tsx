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

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt?.slice(0, 155)
  const url = `https://ignite.education/blog/${slug}`
  const ogImage = post.og_image || post.featured_image || 'https://ignite.education/og-image.png'

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${post.title} | Ignite Education`,
      description,
      url,
      siteName: 'Ignite Education',
      images: [{ url: ogImage }],
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author_name || 'Ignite Team'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | Ignite Education`,
      description,
      images: [ogImage],
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
