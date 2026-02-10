'use client'

import { useRef } from 'react'
import type { Certificate } from '@/types/certificate'

interface CertificateClientProps {
  certificate: Certificate
}

export default function CertificateClient({ certificate }: CertificateClientProps) {
  const certificateRef = useRef<HTMLDivElement>(null)

  const certificateUrl = `https://ignite.education/certificate/${certificate.id}`

  const handleShare = () => {
    const shareText = `I've just completed the ${certificate.course_name} course at @Ignite\n\n${certificateUrl}`
    const linkedInText = encodeURIComponent(shareText)
    window.open(
      `https://www.linkedin.com/feed/?shareActive=true&text=${linkedInText}`,
      '_blank',
      'width=600,height=700'
    )
  }

  const handleDownloadPDF = async () => {
    try {
      const element = certificateRef.current
      if (!element) return

      // Preload logo
      const logoUrl = 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png'
      await new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = logoUrl
      })

      const pdfWidth = 1100 * 0.264583
      const pdfHeight = 650 * 0.264583

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#f3f4f6',
        width: 1100,
        height: 650,
        scrollY: 0,
        scrollX: 0,
        imageTimeout: 0,
        logging: false,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * {
              accent-color: #ec4899 !important;
              scrollbar-color: #ec4899 #f3f4f6 !important;
              color-scheme: light !important;
            }
            .bg-black { background-color: #000000 !important; }
            .bg-white { background-color: #ffffff !important; }
            .bg-gray-100 { background-color: #f3f4f6 !important; }
            .text-black { color: #000000 !important; }
            .text-white { color: #ffffff !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-gray-800 { color: #1f2937 !important; }
            .border-gray-200 { border-color: #e5e7eb !important; }
          `
          clonedDoc.head.appendChild(style)
        },
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      })

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

      const filename = `${certificate.user_name.replace(/\s+/g, '_')}_${certificate.course_name.replace(/\s+/g, '_')}_Certificate.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to download certificate. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <>
      {/* Black Header Bar */}
      <div className="bg-black w-full">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <a href="/welcome">
            <img
              src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
              alt="Ignite Logo"
              style={{ width: '108.8px', height: 'auto' }}
              crossOrigin="anonymous"
            />
          </a>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="px-6 py-2 bg-[#EF0B72] hover:bg-[#d00a66] text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-base"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
              </svg>
              <span>Share</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-6 py-2 bg-white hover:bg-gray-100 text-black hover:text-[#ec4899] font-medium rounded-lg transition-colors flex items-center gap-2 text-base group"
            >
              <svg className="w-5 h-5 group-hover:stroke-[#ec4899]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Certificate Visual */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div
          ref={certificateRef}
          className="bg-white overflow-hidden shadow-2xl flex-shrink-0"
          style={{
            width: '1100px',
            minWidth: '1100px',
            height: '650px',
            minHeight: '650px',
          }}
        >
          <div className="flex h-full">
            {/* Left Panel - Black */}
            <div className="w-[390px] bg-black flex flex-col items-end justify-center -mt-[150px] p-12 text-white">
              <div className="mb-2 mr-[-10px]">
                <img
                  src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
                  alt="Ignite Logo"
                  style={{ width: '102px', height: 'auto' }}
                  crossOrigin="anonymous"
                />
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-semibold mb-0">
                  {certificate.course_name}
                </h1>
                <h2 className="text-3xl font-semibold">
                  Certification
                </h2>
              </div>
            </div>

            {/* Right Panel - White */}
            <div className="w-[710px] bg-white flex flex-col justify-center -mt-[150px] p-16 text-black">
              <p className="pt-[250px] text-base mb-2 mr-[-10px] text-gray-800">
                Ignite certifies that
              </p>
              <h2 className="text-3xl font-semibold mt-[7px] mb-2 mr-[-10px] text-[#EF0B72]">
                {certificate.user_name}
              </h2>
              <p className="text-base mb-12 leading-tight text-gray-800">
                Has successfully passed the {certificate.course_name} course at Ignite,
                and has demonstrated all of the necessary knowledge, skills and
                full course requirements.
              </p>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Awarded by</p>
                <p className="text-base font-semibold text-black">
                  Max Shillam, Founder of Ignite
                </p>
              </div>
              <div className="border-t w-[45%] border-gray-200 pt-6">
                <div className="flex flex-row gap-8 text-sm">
                  <div>
                    <p className="text-gray-600 whitespace-nowrap">Certification Number:</p>
                    <p className="font-mono text-black whitespace-nowrap">{certificate.certificate_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 whitespace-nowrap">Date of Issue:</p>
                    <p className="text-black whitespace-nowrap">{formatDate(certificate.issued_date)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Section */}
      <div className="w-full flex justify-center pb-12 px-8">
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Verified Certificate</p>
            <p className="text-xs text-gray-500">
              Certificate {certificate.certificate_number} &middot; Issued {formatDate(certificate.issued_date)}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
