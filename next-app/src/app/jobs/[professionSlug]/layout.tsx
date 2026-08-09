import { notFound } from 'next/navigation'
import { getProfessionBySlug } from '@/lib/professionUtils'

/**
 * Existence check for the profession route, so an unknown slug returns a real
 * HTTP 404 rather than a soft one.
 *
 * The check lives in the layout, not the page, for the reason documented at
 * length in courses/[courseSlug]/layout.tsx: a sibling loading.tsx would wrap
 * the page in a Suspense boundary, letting Next flush the HTML shell — status
 * 200 already committed — before the page's await resolves, at which point
 * notFound() can only swap content, not the status line.
 *
 * There is no loading.tsx under /jobs and there should not be one. This layout
 * is the belt to that braces.
 */
export default async function JobProfessionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ professionSlug: string }>
}) {
  const { professionSlug } = await params

  if (!(await getProfessionBySlug(professionSlug))) {
    notFound()
  }

  return children
}
