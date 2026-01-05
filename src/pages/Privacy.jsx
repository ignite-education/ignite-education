import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';
import Footer from '../components/Footer';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-black">
      <SEO
        title="Privacy Policy"
        description="Learn how Ignite Education collects, uses, and protects your personal information. Our privacy policy complies with UK GDPR and data protection laws."
        keywords="privacy policy, data protection, GDPR, UK data privacy, personal information, Ignite Education privacy"
        url="https://ignite.education/privacy"
      />

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <Link to="/" className="inline-block">
            <div
              className="w-32 h-10 bg-contain bg-no-repeat bg-left"
              style={{
                backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)'
              }}
            />
          </Link>
        </div>
      </div>

      {/* Hero Section (Black) */}
      <div className="bg-black">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm mb-7" style={{ color: '#F0F0F2' }}>
            <Link to="/" className="hover:text-[#EF0B72] transition-colors flex items-center" style={{ color: '#F0F0F2' }}>
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
            <span style={{ color: '#F0F0F2' }}>Privacy Policy</span>
          </nav>

          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
        </div>
      </div>

      {/* White Content Section */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Policy Content */}
          <div className="space-y-8 text-gray-900 leading-relaxed">

          {/* Version Info */}
          <div className="text-sm text-gray-900">
            <p><strong>Version Number:</strong> v1</p>
            <p><strong>Last Updated:</strong> November 2, 2025</p>
            <p><strong>Effective Date:</strong> November 2, 2025</p>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Ignite Education ("we," "our," or "us"). We operate the website ignite.education (the "Website"), which provides product management courses and educational resources.
            </p>
            <p className="mb-4">
              This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our Website and use our services. Please read this policy carefully. By accessing or using our Website, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
            </p>
            <p>
              If you do not agree with the terms of this Privacy Policy, please do not access or use the Website.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3">2.1 Personal Information You Provide</h3>
            <p className="mb-3">We collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Create an account:</strong> Full name and email address</li>
              <li><strong>Enroll in courses:</strong> Course selection and enrollment data</li>
              <li><strong>Use our services:</strong> Course progress, completion status, and assessment scores</li>
              <li><strong>Participate in community forums:</strong> Posts, comments, and other contributions to our community discussions</li>
              <li><strong>Upgrade to ad-free access:</strong> Payment information (processed securely through our payment provider)</li>
              <li><strong>Contact us:</strong> Any information you provide in correspondence with us</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.2 Automatically Collected Information</h3>
            <p className="mb-3">When you access our Website, we automatically collect certain information, including:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Analytics data:</strong> Information about how you use our Website, including pages visited, time spent on pages, and navigation patterns</li>
              <li><strong>Device information:</strong> Browser type, operating system, and device identifiers</li>
              <li><strong>Log data:</strong> IP address, access times, and referring URLs</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">2.3 Information We Do Not Collect</h3>
            <p>We do not use cookies or similar tracking technologies on our Website.</p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the personal information we collect for the following purposes:</p>

            <h3 className="text-xl font-semibold mb-3">3.1 To Provide Our Services</h3>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Creating and managing your account</li>
              <li>Enrolling you in courses and tracking your progress</li>
              <li>Calculating and displaying your course scores</li>
              <li>Providing access to course materials and resources</li>
              <li>Facilitating your participation in community forums</li>
              <li>Processing payments for ad-free subscriptions</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.2 To Enhance Your Experience</h3>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Personalizing your learning experience</li>
              <li>Sending custom job opportunity emails (for ad-free subscribers)</li>
              <li>Providing access to office hours (for ad-free subscribers)</li>
              <li>Improving our Website and course content based on usage patterns</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.3 To Communicate With You</h3>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Sending important service announcements and updates</li>
              <li>Responding to your inquiries and support requests</li>
              <li>Sending course-related communications and notifications</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">3.4 For Legal and Security Purposes</h3>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Complying with legal obligations</li>
              <li>Protecting our rights and the rights of our users</li>
              <li>Detecting and preventing fraud or security issues</li>
              <li>Enforcing our Terms of Service</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Third-Party Service Providers</h2>
            <p className="mb-4">
              We work with trusted third-party service providers to deliver our services. These providers have access to your personal information only to perform specific tasks on our behalf and are obligated to protect your information. Our third-party providers include:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Supabase:</strong> Database and authentication services (hosting your account data, course progress, and forum posts)</li>
              <li><strong>Vercel:</strong> Frontend hosting services</li>
              <li><strong>Render:</strong> Backend server hosting</li>
              <li><strong>Anthropic Claude:</strong> AI-powered chat assistance services for educational support</li>
              <li><strong>ElevenLabs:</strong> Voice-over content delivery</li>
              <li><strong>Stripe:</strong> Payment processing for ad-free subscriptions (Stripe handles all payment information directly; we do not store your payment card details)</li>
            </ul>
            <p>
              Each of these providers maintains their own privacy policies and security measures. We carefully select providers that meet high standards for data protection and security.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Data Sharing and Disclosure</h2>

            <h3 className="text-xl font-semibold mb-3">5.1 We Do Not Sell Your Data</h3>
            <p className="mb-4">
              We will never sell, rent, or trade your personal information to third parties for marketing purposes.
            </p>

            <h3 className="text-xl font-semibold mb-3">5.2 Limited Sharing</h3>
            <p className="mb-3">We may share your information only in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>With service providers:</strong> As described in Section 4, to enable them to perform services on our behalf</li>
              <li><strong>For legal compliance:</strong> When required by law, regulation, legal process, or government request</li>
              <li><strong>To protect rights and safety:</strong> To protect our rights, property, or safety, or that of our users or the public</li>
              <li><strong>With your consent:</strong> When you explicitly authorize us to share your information</li>
              <li><strong>Business transfers:</strong> In connection with a merger, sale, or acquisition of all or part of our business (your information would remain subject to this Privacy Policy)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">5.3 Community Forum Posts</h3>
            <p>
              Please note that any information you post in our community forums may be visible to other users of the Website. We recommend not sharing sensitive personal information in public forum posts.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
            <p className="mb-4">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Account information:</strong> Retained while your account is active and for a reasonable period afterward to comply with legal obligations</li>
              <li><strong>Course progress and scores:</strong> Retained to maintain your learning records and provide certificates of completion</li>
              <li><strong>Forum posts:</strong> Retained to maintain the integrity and continuity of community discussions</li>
              <li><strong>Analytics data:</strong> Typically retained for up to 24 months</li>
            </ul>
            <p>
              You may request deletion of your account and associated data at any time by contacting us (see Section 11).
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Your Rights Under UK GDPR</h2>
            <p className="mb-4">
              As we are based in the United Kingdom and process data of UK residents, you have the following rights under UK data protection law:
            </p>

            <h3 className="text-xl font-semibold mb-3">7.1 Right of Access</h3>
            <p className="mb-4">You have the right to request a copy of the personal information we hold about you.</p>

            <h3 className="text-xl font-semibold mb-3">7.2 Right to Rectification</h3>
            <p className="mb-4">You have the right to request that we correct any inaccurate or incomplete personal information.</p>

            <h3 className="text-xl font-semibold mb-3">7.3 Right to Erasure</h3>
            <p className="mb-4">You have the right to request deletion of your personal information in certain circumstances, such as when the information is no longer necessary for the purposes for which it was collected.</p>

            <h3 className="text-xl font-semibold mb-3">7.4 Right to Restrict Processing</h3>
            <p className="mb-4">You have the right to request that we restrict the processing of your personal information in certain circumstances.</p>

            <h3 className="text-xl font-semibold mb-3">7.5 Right to Data Portability</h3>
            <p className="mb-4">You have the right to receive your personal information in a structured, commonly used, and machine-readable format and to transmit it to another controller.</p>

            <h3 className="text-xl font-semibold mb-3">7.6 Right to Object</h3>
            <p className="mb-4">You have the right to object to our processing of your personal information in certain circumstances.</p>

            <h3 className="text-xl font-semibold mb-3">7.7 Right to Withdraw Consent</h3>
            <p className="mb-4">Where we rely on your consent to process your personal information, you have the right to withdraw that consent at any time.</p>

            <h3 className="text-xl font-semibold mb-3">7.8 Right to Lodge a Complaint</h3>
            <p className="mb-4">You have the right to lodge a complaint with the Information Commissioner's Office (ICO), the UK supervisory authority for data protection issues (www.ico.org.uk).</p>

            <p>To exercise any of these rights, please contact us using the information provided in Section 11.</p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Legal Basis for Processing (UK GDPR)</h2>
            <p className="mb-3">Under UK GDPR, we process your personal information based on the following legal grounds:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li><strong>Contract performance:</strong> Processing necessary to provide our services and fulfill our contract with you</li>
              <li><strong>Legitimate interests:</strong> Processing necessary for our legitimate interests in operating and improving our Website and services, provided these interests are not overridden by your rights</li>
              <li><strong>Legal obligation:</strong> Processing necessary to comply with legal requirements</li>
              <li><strong>Consent:</strong> Where you have given explicit consent for specific processing activities</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Secure data transmission using encryption protocols</li>
              <li>Access controls and authentication measures</li>
              <li>Regular security assessments and updates</li>
              <li>Secure data storage with our trusted service providers</li>
              <li>Employee training on data protection and privacy</li>
            </ul>
            <p>
              However, please note that no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
            <p className="mb-4">
              Our Website is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are under 18, please do not use our Website or provide any personal information to us.
            </p>
            <p>
              If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information as quickly as possible. If you believe we have collected information from a child under 18, please contact us immediately.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. International Data Transfers</h2>
            <p className="mb-4">
              Your information may be transferred to and processed in countries other than the United Kingdom, including countries where our service providers are located (such as the United States). These countries may have data protection laws that differ from UK laws.
            </p>
            <p className="mb-3">When we transfer your personal information internationally, we ensure appropriate safeguards are in place, such as:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Standard contractual clauses approved by the UK authorities</li>
              <li>Ensuring service providers are certified under recognized data protection frameworks</li>
              <li>Other legally approved mechanisms for international transfers</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="mb-3">
              We may update this Privacy Policy from time to time to reflect changes in our practices, services, legal requirements, or for other operational reasons. We will notify you of any material changes by:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Posting the updated Privacy Policy on this page</li>
              <li>Updating the "Last Updated" date at the top of this policy</li>
              <li>Sending you an email notification (for significant changes)</li>
            </ul>
            <p>
              We encourage you to review this Privacy Policy periodically. Your continued use of the Website after any changes indicates your acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contact Us</h2>
            <p className="mb-3">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="ml-4 space-y-1">
              <p><strong>Ignite Education</strong></p>
              <p><strong>Email:</strong> hello@ignite.education</p>
              <p><strong>Website:</strong> ignite.education</p>
              <p><strong>Address:</strong> 113 Brook Drive, London, SE11 4TU</p>
            </div>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. Additional Information for Specific Users</h2>

            <h3 className="text-xl font-semibold mb-3">14.1 Ad-Free Subscribers</h3>
            <p className="mb-3">If you subscribe to our ad-free tier, we process your payment information through Stripe. We do not store your credit card or payment details on our servers. Additional features available to ad-free subscribers include:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Access to office hours</li>
              <li>Custom job opportunity emails based on your learning progress and interests</li>
              <li>Ad-free browsing experience</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">14.2 Community Forum Participants</h3>
            <p className="mb-3">When you participate in our community forums:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Your posts and comments are visible to other registered users</li>
              <li>Your username or display name will be associated with your posts</li>
              <li>We moderate forums to maintain community standards</li>
              <li>We reserve the right to remove content that violates our community guidelines</li>
            </ul>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Your Responsibilities</h2>
            <p className="mb-3">To help us protect your personal information:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Keep your account credentials confidential</li>
              <li>Use a strong, unique password</li>
              <li>Log out of your account when using shared devices</li>
              <li>Notify us immediately if you suspect unauthorized access to your account</li>
              <li>Be mindful of what personal information you share in community forums</li>
            </ul>
          </section>

          {/* Closing Statement */}
          <section className="border-t border-gray-200 pt-6">
            <p className="mb-4 font-semibold">
              By using Ignite Education, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
            </p>
            <p className="mb-4 font-semibold">
              If you do not agree with this Privacy Policy, please discontinue use of our Website immediately.
            </p>
            <p className="text-sm text-gray-500">
              This Privacy Policy was created to comply with UK GDPR and data protection laws. For specific legal advice regarding your data rights or our practices, please consult with a legal professional.
            </p>
          </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Privacy;
