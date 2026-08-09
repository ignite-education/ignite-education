import type { BlogPost } from '@/types/blog'
import type { FAQ } from '@/lib/faqs'
import FAQBlogGrid from '@/components/FAQBlogGrid'

/**
 * The FAQ/blog pair from /welcome, under the board.
 *
 * A lot of this page's traffic arrives from a search for a vacancy and has
 * never heard of Ignite, so the block does the same job here it does there:
 * answer "what is this site?" for someone who has just finished scanning a list
 * of jobs and has no other reason to keep reading.
 *
 * Two deliberate departures from the welcome version:
 *
 *  - No Get Started button. There, it scrolls back to the hero's course picker.
 *    Here there is no picker to return to, and the page already has its own
 *    conversion path in JobAuthCTA.
 *  - Ordinary flow rather than 100vh. Welcome's copy is a panel in a scroll-snap
 *    deck; this one just follows the last job card.
 *
 * The shell repeats the board's own geometry — max-w-4xl / 762px / lg:-mx-24,
 * see JobBoardClient — so the two columns land on the same edges the job cards
 * do. bg-black against the Footer's bg-black reads as one surface, which is the
 * same trick the hero plays with the navbar at the top of the page.
 */

interface JobsFAQSectionProps {
  faqs: FAQ[]
  posts?: BlogPost[]
}

export default function JobsFAQSection({ faqs, posts = [] }: JobsFAQSectionProps) {
  return (
    <section className="bg-black">
      {/* Tuned by eye against the grey band above, not derived from the spacing
          scale — a hard colour change reads tighter than the same gap between
          two blocks of one colour, so this sits slightly off pt-14. */}
      <div className="max-w-4xl mx-auto px-6 pt-[58px] pb-16 flex justify-center">
        <div className="w-full text-white" style={{ maxWidth: '762px' }}>
          <div className="lg:-mx-24">
            <FAQBlogGrid faqs={faqs} posts={posts} />
          </div>
        </div>
      </div>
    </section>
  )
}
