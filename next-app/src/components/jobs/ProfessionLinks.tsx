import Link from 'next/link'
import { professionToSlug } from '@/lib/professionUtils'

/**
 * Crawlable links to the per-profession boards.
 *
 * These exist for a specific reason: /jobs/[professionSlug] was reachable only
 * from the sitemap and llms.txt. Nothing on the site linked to it — the
 * profession filter on /jobs is client-side state, so selecting one produces no
 * URL for a crawler to follow. Sitemap-only URLs get crawled rarely and receive
 * no internal link equity, which is most of why the profession pages were not
 * showing up.
 *
 * So the requirement this component has to meet is narrow and absolute: real
 * <a href> elements present in the server-rendered HTML. It is a server
 * component with no interactivity for exactly that reason — a click handler
 * that pushed a route would look identical to a visitor and be invisible to
 * Googlebot, which is the bug being fixed.
 *
 * Only ever fed professions that HAVE listings. The caller passes the same
 * getProfessionsWithJobs() set the sitemap is built from, so the three empty
 * specialisms (Green Energy Technician, Healthcare Assistant, Mental Health
 * Worker) are absent here as well — those pages are noindexed and pointing
 * visitors or crawlers at an empty board would undercut both.
 */

interface ProfessionLinksProps {
  /** Professions with live listings. */
  professions: string[]
  /**
   * The profession whose page this is. Omits its own link and adds one back up
   * to /jobs — set on a profession page, absent on /jobs itself.
   */
  currentProfession?: string
  heading: string
}

export default function ProfessionLinks({
  professions,
  currentProfession,
  heading,
}: ProfessionLinksProps) {
  // Alphabetical rather than the caller's order, which comes from the order
  // Postgres happened to return listings in and would reshuffle between
  // revalidations. A nav row that reorders itself under a returning visitor is
  // a worse experience than one whose order carries no meaning.
  const siblings = professions
    .filter(profession => profession && profession !== currentProfession)
    .sort((a, b) => a.localeCompare(b))
    .map(profession => ({ href: `/jobs/${professionToSlug(profession)}`, label: `${profession} jobs` }))

  // The parent board, first and only on a profession page. The BreadcrumbList
  // in the page's structured data already names /jobs, but that is metadata —
  // it is not a link, and neither a visitor nor a crawler follows it.
  const links = currentProfession
    ? [{ href: '/jobs', label: 'All jobs' }, ...siblings]
    : siblings

  if (links.length === 0) return null

  return (
    // Continues the board's grey band rather than opening a new one — this is a
    // footer to the list above it, not a section in its own right. Grid repeats
    // JobBoardClient's max-w-4xl / 762px / lg:-mx-24 verbatim so the heading
    // lands on the same left edge as the h1 and the job cards.
    <section className="bg-[#F6F6F6]">
      <div className="max-w-4xl mx-auto px-6 pb-14 flex justify-center">
        <div className="w-full" style={{ maxWidth: '762px' }}>
          <div className="lg:-mx-24">
            <h2
              className="text-black font-semibold mb-4"
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
                fontSize: '1.125rem',
                letterSpacing: '-0.01em',
              }}
            >
              {heading}
            </h2>

            <div className="flex flex-wrap gap-2">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="bg-white text-black border border-[#E2E2E2] rounded-[6px] transition-colors duration-200 hover:bg-[#8200EA] hover:text-white hover:border-[#8200EA]"
                  style={{
                    fontFamily: 'var(--font-geist-sans), sans-serif',
                    fontSize: '0.875rem',
                    letterSpacing: '-0.01em',
                    padding: '8px 12px',
                  }}
                >
                  {/* Singular, and the word "jobs" spelled out rather than left
                      to the heading: this is the anchor text Google reads for
                      the destination, and it should match what the target page
                      is titled — "Product Manager jobs", not "Product Manager". */}
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
