import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <SEO
        title="Terms of Service"
        description="Read Ignite Education's Terms of Service. Learn about course enrollment, payment terms, refund policy, and user conduct guidelines for our online learning platform."
        keywords="terms of service, terms and conditions, user agreement, course enrollment, refund policy, Ignite Education terms"
        url="https://www.ignite.education/terms"
      />
      {/* Header with Logo */}
      <div className="fixed top-0 left-0 w-full bg-black z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/welcome')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <div
                className="w-32 h-12"
                style={{
                  backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'left center',
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div style={{ marginLeft: '48px' }}>
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          {/* Terms Content */}
          <div className="space-y-8 text-gray-100 leading-relaxed">

          {/* Last Updated */}
          <div className="text-sm text-white">
            <p><strong>Last Updated:</strong> November 19, 2025</p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction and Acceptance of Terms</h2>
            <p className="mb-4">
              Welcome to Ignite ("we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of the Ignite learning platform, including our website, courses, materials, and related services (collectively, the "Service").
            </p>
            <p>
              By accessing or using our Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="mb-3">Ignite provides an online learning platform focused on Product Management education. Our Service includes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access to structured Product Management curriculum and courses</li>
              <li>Interactive learning materials and resources</li>
              <li>Progress tracking and student dashboards</li>
              <li>Community forums and discussion boards</li>
              <li>Office hours and instructor interaction opportunities</li>
              <li>Career development resources</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Eligibility and Account Registration</h2>

            <h3 className="text-xl font-semibold mb-3">3.1 Eligibility</h3>
            <p className="mb-4">
              You must be at least 18 years old to use our Service. By using the Service, you represent and warrant that you meet this age requirement.
            </p>

            <h3 className="text-xl font-semibold mb-3">3.2 Account Creation</h3>
            <p className="mb-3">To access certain features of the Service, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.3 Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Course Enrollment and Payment</h2>

            <h3 className="text-xl font-semibold mb-3">4.1 Course Access</h3>
            <p className="mb-4">
              Upon successful enrollment and payment (where applicable), you will receive access to the course materials for the duration specified at the time of purchase.
            </p>

            <h3 className="text-xl font-semibold mb-3">4.2 Payment Terms</h3>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>All fees are stated in British Pounds (£) unless otherwise specified</li>
              <li>Payment is due at the time of enrollment</li>
              <li>All sales are final unless otherwise specified in our Refund Policy (Section 5)</li>
              <li>We reserve the right to change our pricing at any time</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">4.3 Course Availability</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue any course or feature of the Service at any time without prior notice.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Refund Policy</h2>
            <p className="mb-3">We offer a refund within 14 days of purchase if:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>You have not completed more than 20% of the course materials</li>
              <li>You request a refund by contacting our support team</li>
            </ul>
            <p>
              Refunds will be processed within 10 business days and issued to the original payment method. We reserve the right to deny refund requests that do not meet these criteria or appear to violate our policies.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Intellectual Property Rights</h2>

            <h3 className="text-xl font-semibold mb-3">6.1 Our Content</h3>
            <p className="mb-4">
              All content provided through the Service, including but not limited to courses, videos, text, graphics, logos, images, and software, is the property of Ignite or its licensors and is protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mb-3">6.2 Limited License</h3>
            <p className="mb-3">We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service and course materials solely for your personal, non-commercial educational purposes. You may not:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Copy, modify, distribute, sell, or lease any part of our Service or materials</li>
              <li>Reverse engineer or attempt to extract the source code of our software</li>
              <li>Share your account credentials or course access with others</li>
              <li>Download or record course materials except where explicitly permitted</li>
              <li>Use our content for commercial purposes or competitive analysis</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">6.3 User Content</h3>
            <p>
              You retain ownership of any content you submit to the Service (such as forum posts or assignments). By submitting content, you grant us a worldwide, royalty-free license to use, reproduce, modify, and display that content in connection with operating and improving the Service.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. User Conduct and Community Guidelines</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the intellectual property rights of others</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post spam, advertising, or promotional content without permission</li>
              <li>Share false, misleading, or defamatory information</li>
              <li>Attempt to gain unauthorized access to the Service or other user accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Share course materials or login credentials with non-enrolled users</li>
            </ul>
            <p>
              We reserve the right to remove any content or restrict access for users who violate these guidelines.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to our collection and use of personal data as outlined in the Privacy Policy.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Disclaimers and Limitation of Liability</h2>

            <h3 className="text-xl font-semibold mb-3">9.1 Service Provided "As Is"</h3>
            <p className="mb-4">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="mb-3">We do not guarantee that:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>The results obtained from the Service will be accurate or reliable</li>
              <li>Course completion will result in specific career outcomes or job placement</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">9.2 Limitation of Liability</h3>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IGNITE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Your use or inability to use the Service</li>
              <li>Any unauthorized access to or use of our servers or personal information</li>
              <li>Any interruption or cessation of transmission to or from the Service</li>
              <li>Any bugs, viruses, or other harmful code transmitted through the Service</li>
              <li>Any errors or omissions in any content</li>
            </ul>
            <p className="mb-4">
              OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE SIX MONTHS PRECEDING THE CLAIM.
            </p>

            <h3 className="text-xl font-semibold mb-3">9.3 Educational Content Disclaimer</h3>
            <p className="mb-3">While we strive to provide high-quality educational content, we make no guarantees about:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Career advancement or job placement outcomes</li>
              <li>Specific skills acquisition or competency levels</li>
              <li>The accuracy or completeness of all course materials</li>
              <li>The applicability of course content to your specific situation</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Career Resources and Job Market Information</h2>
            <p>
              Any job market research, career guidance, or employment information provided through the Service is for informational purposes only. We do not guarantee job placement, interview opportunities, or specific career outcomes. You are responsible for your own career decisions and job search activities.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Third-Party Links and Services</h2>
            <p>
              The Service may contain links to third-party websites or services that are not owned or controlled by Ignite. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. You acknowledge and agree that we shall not be liable for any damage or loss caused by your use of any third-party content or services.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Termination</h2>

            <h3 className="text-xl font-semibold mb-3">13.1 Your Rights</h3>
            <p className="mb-4">
              You may stop using the Service at any time. Account deletion requests can be submitted to our support team.
            </p>

            <h3 className="text-xl font-semibold mb-3">13.2 Our Rights</h3>
            <p className="mb-3">We may suspend or terminate your access to the Service immediately, without prior notice, for any reason, including but not limited to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Breach of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Abuse of other users or our staff</li>
              <li>Non-payment of fees</li>
            </ul>
            <p>
              Upon termination, your right to access the Service will immediately cease, and we may delete your account and content.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. Governing Law and Dispute Resolution</h2>

            <h3 className="text-xl font-semibold mb-3">14.1 Governing Law</h3>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold mb-3">14.2 Dispute Resolution</h3>
            <p className="mb-3">Any disputes arising from these Terms or the Service shall be resolved through:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Good faith negotiation between the parties</li>
              <li>If negotiation fails, through the courts of England and Wales</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">14.3 Class Action Waiver</h3>
            <p>
              You agree to resolve disputes with us on an individual basis and waive any right to participate in class action lawsuits or class-wide arbitration.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Indemnification</h2>
            <p className="mb-3">
              You agree to indemnify, defend, and hold harmless Ignite, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights, including intellectual property rights</li>
              <li>Any content you submit to the Service</li>
            </ul>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force and effect.
            </p>
          </section>

          {/* Section 17 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy and any other legal notices published by us on the Service, constitute the entire agreement between you and Ignite concerning the Service.
            </p>
          </section>

          {/* Section 18 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">18. Survival</h2>
            <p>
              Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
            </p>
          </section>

          {/* Section 19 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">19. Assignment</h2>
            <p>
              You may not assign or transfer these Terms or your rights under these Terms without our prior written consent. We may assign or transfer these Terms or our rights under these Terms without restriction.
            </p>
          </section>

          {/* Section 20 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">20. Contact Information</h2>
            <p className="mb-3">If you have any questions about these Terms, please contact us at:</p>
            <div className="ml-4">
              <p><strong>Ignite Learning Platform</strong></p>
              <p><strong>Email:</strong> hello@ignite.education</p>
              <p><strong>Address:</strong> Highfield, Yarborough Road, Lincoln</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="pt-4 border-t border-gray-700">
            <p className="text-sm">
              By using the Ignite Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
