import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-black mb-4" style={{ letterSpacing: '-0.02em' }}>
            Blog Post Not Found
          </h1>
          <p className="text-gray-600 mb-6" style={{ fontSize: '15px' }}>
            The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/welcome"
            className="inline-block px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] text-white font-semibold rounded-lg transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
