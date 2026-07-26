import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/blogData'

/**
 * Existence check for the blog post route, so unknown slugs return a real 404.
 *
 * Same mechanism as courses/[courseSlug]/layout.tsx — the sibling loading.tsx
 * creates a <Suspense> boundary that flushes the shell at HTTP 200 before the
 * page's fetch resolves, so `notFound()` in the page can no longer set the
 * status. See that file for the full explanation and the PPR caveat.
 */
export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!(await getPostBySlug(slug))) {
    notFound()
  }

  return children
}
