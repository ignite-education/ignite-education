'use client'

import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'

interface CourseLeaderModalProps {
  courseTitle: string
}

export default function CourseLeaderModal({ courseTitle }: CourseLeaderModalProps) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', linkedin: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const subject = encodeURIComponent(`Course Leader Enquiry - ${courseTitle}`)
    const body = encodeURIComponent(
      `Course: ${courseTitle}\n` +
      `Name: ${form.name}\n` +
      `Email: ${form.email}\n` +
      `LinkedIn: ${form.linkedin}\n`
    )

    window.location.href = `mailto:hello@ignite.education?subject=${subject}&body=${body}`

    setTimeout(() => {
      setShowModal(false)
      setForm({ name: '', email: '', linkedin: '' })
    }, 300)
  }

  const closeModal = () => {
    setShowModal(false)
    setForm({ name: '', email: '', linkedin: '' })
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="mt-4 text-black hover:text-[#EF0B72] font-medium transition-colors flex items-center gap-0.5"
        style={{ fontSize: '15px' }}
      >
        Become a course leader
        <ChevronRight className="w-4 h-4" />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={closeModal}
        >
          <div className="relative px-4 sm:px-0" style={{ width: '100%', maxWidth: '484px' }}>
            <h3 className="font-semibold text-white pl-1" style={{ marginBottom: '0.15rem', fontSize: '1.35rem' }}>
              Course Leader
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

              <p className="mb-5 text-sm" style={{ color: '#000000' }}>
                Share your expertise and help shape the next generation of professionals. Fill out the form to learn more.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent outline-none transition-all"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#000000' }}>LinkedIn Profile</label>
                  <input
                    type="url"
                    required
                    value={form.linkedin}
                    onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EF0B72] focus:border-transparent outline-none transition-all"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors mt-1"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
