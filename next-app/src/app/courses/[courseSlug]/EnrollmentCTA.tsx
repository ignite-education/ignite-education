'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ShareButtons from './ShareButtons'

interface EnrollmentCTAProps {
  courseSlug: string
  courseTitle: string
  isComingSoon: boolean
}

export default function EnrollmentCTA({ courseSlug, courseTitle, isComingSoon }: EnrollmentCTAProps) {
  const [showInterestModal, setShowInterestModal] = useState(false)
  const [interestEmail, setInterestEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleEnroll = () => {
    window.location.href = `https://ignite.education/progress?enroll=${courseSlug}`
  }

  const handleRegisterInterest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('course_requests')
        .insert({
          email: interestEmail,
          course_name: courseSlug,
        })

      if (error && error.code !== '23505') {
        console.error('Error registering interest:', error)
        alert('Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => {
    setShowInterestModal(false)
    setInterestEmail('')
    setSubmitted(false)
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {isComingSoon ? 'Coming Soon' : 'Ready to start?'}
        </h3>

        {isComingSoon ? (
          <button
            onClick={() => setShowInterestModal(true)}
            className="w-full py-3 bg-[#8200EA] hover:bg-[#7000C9] text-white font-semibold rounded-lg transition-colors mb-4"
          >
            Notify Me
          </button>
        ) : (
          <button
            onClick={handleEnroll}
            className="w-full py-3 bg-[#8200EA] hover:bg-[#7000C9] text-white font-semibold rounded-lg transition-colors mb-4"
          >
            Start Learning
          </button>
        )}

        <ShareButtons courseSlug={courseSlug} courseTitle={courseTitle} />
      </div>

      {/* Register Interest Modal */}
      {showInterestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={closeModal}
        >
          <div className="relative px-4 sm:px-0" style={{ width: '100%', maxWidth: '484px' }}>
            <h3 className="font-semibold text-white pl-1" style={{ marginBottom: '0.15rem', fontSize: '1.35rem' }}>
              Register Interest
            </h3>

            <div
              className="bg-white rounded-lg w-full relative"
              style={{ padding: '1.8rem 2rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>

              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">You&apos;re on the list!</h4>
                  <p className="text-sm text-gray-600">
                    We&apos;ll notify you when {courseTitle} launches.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-5 text-sm" style={{ color: '#000000' }}>
                    Be the first to know when <strong>{courseTitle}</strong> launches. Enter your email to get notified.
                  </p>

                  <form onSubmit={handleRegisterInterest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Email</label>
                      <input
                        type="email"
                        required
                        value={interestEmail}
                        onChange={(e) => setInterestEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors mt-1 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Notify Me'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
