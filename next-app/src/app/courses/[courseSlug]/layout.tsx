import { notFound } from 'next/navigation'
import { getCourseBySlug } from '@/lib/courseData'

/**
 * Existence check for the course route — this is what makes unknown slugs
 * return a real HTTP 404.
 *
 * Why it can't live in page.tsx: the sibling `loading.tsx` wraps the page in a
 * <Suspense> boundary, so Next flushes the HTML shell — with 200 already
 * committed — before the page's `await getCourseBySlug()` resolves. A
 * `notFound()` thrown inside that boundary can only swap streamed content; it
 * cannot rewrite the status line. The result was a soft 404: HTTP 200 with
 * "Course Not Found" in the title, which Google logs as Soft 404 and uses to
 * discount the whole directory.
 *
 * A layout renders OUTSIDE that boundary, so it has to resolve before anything
 * is flushed — which is exactly the ordering the status code needs. The query
 * is memoised with React `cache()` in courseData.ts, so this costs nothing
 * beyond the page's own fetch.
 *
 * NOTE: this relies on an async layout blocking the initial flush. That holds
 * today (no experimental.ppr / cacheComponents in next.config.ts). If PPR is
 * ever enabled, delete the two loading.tsx files instead — that fix is
 * bulletproof but loses the skeleton on client-side transitions.
 * `npm run seo:validate` asserts the 404 so a regression is caught.
 */
export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ courseSlug: string }>
}) {
  const { courseSlug } = await params

  if (!(await getCourseBySlug(courseSlug))) {
    notFound()
  }

  return children
}
