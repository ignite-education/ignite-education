import React from 'react';
import { Link } from 'react-router-dom';

const Footer = ({ className = '' }) => {
  return (
    <footer className={`bg-black pb-8 ${className}`}>
      <div className="flex flex-col lg:flex-row items-start lg:justify-between gap-10 lg:gap-0 px-10 py-8">
        {/* Left Side - Logo & Company Info */}
        <div className="flex flex-col items-start gap-6">
          <img
            src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_S_2.png"
            alt="Ignite Education"
            style={{ height: '37px', width: 'auto' }}
          />
          <div className="flex flex-col gap-1">
            <span className="text-white font-semibold" style={{ fontSize: '15px' }}>Built in London, UK.</span>
            <span className="text-white font-extralight" style={{ fontSize: '12px' }}>Ignite Education AI Ltd.</span>
          </div>
        </div>

        {/* Right Side - Link Columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 lg:gap-x-16 gap-y-10 lg:gap-16 w-full lg:w-auto lg:-mr-[5%]">
          {/* Product Column */}
          <div className="flex flex-col">
            <span className="text-white font-semibold mb-4" style={{ fontSize: '17px' }}>Product</span>
            <div className="flex flex-col gap-2">
              <Link to="/courses" className="text-white hover:text-[#EF0B72] transition" style={{ fontSize: '14px' }}>Courses</Link>
              <a
                href="https://shop.ignite.education"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Store
              </a>
              <a
                href="https://forms.gle/XsRJE8RKWxTTsMom8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Feedback
              </a>
            </div>
          </div>

          {/* Resources Column */}
          <div className="flex flex-col">
            <span className="text-white font-semibold mb-4" style={{ fontSize: '17px' }}>Resources</span>
            <div className="flex flex-col gap-2">
              <span className="text-white hover:text-[#EF0B72] transition cursor-pointer" style={{ fontSize: '14px' }}>Blog</span>
              <a
                href="/release-notes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Releases
              </a>
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Terms of Service
              </a>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Company Column */}
          <div className="flex flex-col">
            <span className="text-white font-semibold mb-4" style={{ fontSize: '17px' }}>Company</span>
            <div className="flex flex-col gap-2">
              <span className="text-white hover:text-[#EF0B72] transition cursor-pointer" style={{ fontSize: '14px' }}>About</span>
              <a
                href="https://www.linkedin.com/school/ignite-courses/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                LinkedIn
              </a>
              <a
                href="https://www.linkedin.com/school/ignite-courses/jobs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Careers
              </a>
            </div>
          </div>

          {/* Support Column */}
          <div className="flex flex-col">
            <span className="text-white font-semibold mb-4" style={{ fontSize: '17px' }}>Support</span>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:hello@ignite.education"
                className="text-white hover:text-[#EF0B72] transition"
                style={{ fontSize: '14px' }}
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
