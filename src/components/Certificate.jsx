import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { getCertificate } from '../lib/api';
import html2pdf from 'html2pdf.js';

import LoadingScreen from './LoadingScreen';


export default function Certificate() {
  const { certificateId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const certificateRef = useRef(null);

  useEffect(() => {
    loadCertificate();
  }, [certificateId]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      const data = await getCertificate(certificateId);
      setCertificate(data);
      console.log('Certificate loaded:', { user, certificate: data, match: user?.id === data?.user_id });
      setError(null);
    } catch (err) {
      console.error('Error loading certificate:', err);
      setError('Certificate not found');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = certificateRef.current;

    if (\!element) {
      console.error("Certificate element not found");
      return;
    }

    const pdfWidth = 1100 * 0.264583;
    const pdfHeight = 650 * 0.264583;

    const opt = {
      margin: 0,
      filename: `${certificate.user_name.replace(/\\s+/g, "_")}_${certificate.course_name.replace(/\\s+/g, "_")}_Certificate.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f3f4f6",
        width: 1100,
        height: 650,
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement("style");
          style.textContent = `
            * {
              accent-color: #ec4899 \!important;
              scrollbar-color: #ec4899 #f3f4f6 \!important;
              color-scheme: light \!important;
            }
            .bg-black { background-color: #000000 \!important; }
            .bg-white { background-color: #ffffff \!important; }
            .bg-gray-100 { background-color: #f3f4f6 \!important; }
            .text-black { color: #000000 \!important; }
            .text-white { color: #ffffff \!important; }
            .text-gray-600 { color: #4b5563 \!important; }
            .text-gray-800 { color: #1f2937 \!important; }
            .border-gray-200 { border-color: #e5e7eb \!important; }
            .text-\\[\\#ec4899\\] { color: #ec4899 \!important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      },
      jsPDF: { unit: "mm", format: [pdfWidth, pdfHeight], orientation: "landscape" }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      if (error.message && error.message.toLowerCase().includes("oklch")) {
        console.log("OKLCH error detected, retrying...");
        try {
          const fallbackOpt = {
            margin: 0,
            filename: `${certificate.user_name.replace(/\\s+/g, "_")}_${certificate.course_name.replace(/\\s+/g, "_")}_Certificate.pdf`,
            image: { type: "jpeg", quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#f3f4f6", width: 1100, height: 650, logging: false },
            jsPDF: { unit: "mm", format: [pdfWidth, pdfHeight], orientation: "landscape" }
          };
          await html2pdf().set(fallbackOpt).from(element).save();
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          alert("Failed to download certificate. Please try again or contact support.");
        }
      } else {
        alert("Failed to download certificate. Please try again.");
      }
    }
  };
  const handleShare = () => {
    const certificateUrl = window.location.href;
    const shareText = `I've just completed the ${certificate.course_name} course at @Ignite\n\n${certificateUrl}`;
    // Open LinkedIn post creation with prefilled text
    const linkedInText = encodeURIComponent(shareText);
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${linkedInText}`, '_blank', 'width=600,height=700');
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-black text-xl">{error || 'Certificate not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Black Header Bar */}
      <div className="bg-black w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          {/* Logo - Links back to Progress Hub */}
          <button
            onClick={() => navigate('/')}
            className="hover:opacity-80 transition-opacity"
          >
            <div
              style={{
                backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                width: '108.8px',
                height: '36px',
              }}
            />
          </button>
          {/* Action Buttons */}
          <div className="flex gap-3">
            {(user && certificate && user.id === certificate.user_id) ? (
              <>
                <button
                  onClick={handleShare}
                  className="px-4 md:px-6 py-2 bg-[#ec4899] hover:bg-[#db2777] text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                  </svg>
                  <span className="hidden md:inline">Share</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="px-4 md:px-6 py-2 bg-white hover:bg-gray-100 text-black font-medium rounded-lg border-2 border-gray-300 transition-colors flex items-center gap-2 text-sm md:text-base"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden md:inline">Download</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="px-4 md:px-6 py-2 bg-[#ec4899] hover:bg-[#db2777] text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
              >
                <span>Explore Ignite</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Container - Fits viewport */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div
          ref={certificateRef}
          className="bg-white rounded-lg overflow-hidden shadow-2xl"
          style={{
            width: 'min(1100px, calc(100vw - 2rem))',
            aspectRatio: '1100/650',
            maxHeight: 'calc(100vh - 8rem)',
          }}
        >
          <div className="flex h-full">
            {/* Left Panel - Black */}
            <div className="w-[390px] bg-black flex flex-col items-end justify-center -mt-[150px] p-6 md:p-12 text-white">
              {/* Ignite Logo */}
              <div className="mb-2 mr-[-10px]">
                <div
                  style={{
                    backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '102px',
                    height: '34px',
                  }}
                />
              </div>

              {/* Certificate Title */}
              <div className="text-right">
                <h1 className="text-xl md:text-3xl font-semibold mb-0">
                  {certificate.course_name}
                </h1>
                <h2 className="text-xl md:text-3xl font-semibold">
                  Certification
                </h2>
              </div>
            </div>

            {/* Right Panel - White */}
            <div className="w-[710px] bg-white flex flex-col justify-center -mt-[150px] p-8 md:p-16 text-black">
              {/* Certification Text */}
              <p className="pt-[250px] text-xs md:text-base mb-2 mr-[-10px] md:mb-2 text-gray-800">
                Ignite certifies that
              </p>

              {/* User Name */}
              <h2 className="text-xl md:text-3xl font-semibold mt-[7px] mb-2 mr-[-10px] md:mb-4 text-[#ec4899]">
                {certificate.user_name}
              </h2>

              {/* Achievement Description */}
              <p className="text-xs md:text-base mb-6 md:mb-12 leading-tight text-gray-800">
                Has successfully passed the {certificate.course_name} course at Ignite,
                and has demonstrated all of the necessary knowledge, skills and
                full course requirements.
              </p>

              {/* Awarded By */}
              <div className="mb-6 md:mb-12">
                <p className="text-xs md:text-sm text-gray-600 mb-1">Awarded by</p>
                <p className="text-sm md:text-base font-semibold text-black">
                  Max Shillam, Founder of Ignite
                </p>
              </div>

              {/* Certificate Details */}
              <div className="border-t w-[45%] border-gray-200 pt-4 md:pt-6">
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-xs md:text-sm">
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
    </div>
  );
}
