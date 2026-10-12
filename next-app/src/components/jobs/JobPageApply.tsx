'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useApplyAction, ApplyButton } from './ApplyGate'

/**
 * The apply control on a per-job page.
 *
 * The page is a server component and ISR-cached, so it cannot know who is
 * looking at it; this island resolves that after hydration exactly as
 * JobBoardClient does for the board, and hands the answer to the same
 * useApplyAction the detail pane uses. Nothing about the gate changes: the
 * outbound URL is still fetched from GET /api/jobs/:id/apply behind auth, and
 * a signed-out click still lands on JobSignupModal. This is why the page's
 * JobPosting markup says directApply: false.
 */
export default function JobPageApply({
  jobId,
  jobTitle,
  company,
  className = '',
}: {
  jobId: string
  jobTitle: string
  company: string
  className?: string
}) {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => setIsSignedIn(Boolean(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsSignedIn(Boolean(session)))
    return () => sub.subscription.unsubscribe()
  }, [])

  const { apply, error, modal } = useApplyAction({ jobId, jobTitle, company, isSignedIn })

  return (
    <div className={className}>
      <ApplyButton size="block" onClick={apply} />
      {error && (
        <p
          className="text-[#EF0B72] mt-2"
          style={{ fontFamily: 'var(--font-geist-sans), sans-serif', fontSize: '0.75rem', letterSpacing: '-0.01em' }}
        >
          {error}
        </p>
      )}
      {modal}
    </div>
  )
}
