import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Geist, Arial, Helvetica, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
};

const logoSection = {
  backgroundColor: '#f0f0f0',
  padding: '8px 20px',
  margin: '0',
};

const logo = {
  display: 'block',
};

const h1 = {
  fontSize: '24px',
  fontWeight: '700',
  textAlign: 'left',
  margin: '16px 20px',
  padding: '0',
};

const introSection = {
  padding: '0 20px',
  textAlign: 'center',
  marginBottom: '16px',
};

const certificateIcon = {
  margin: '0 auto 16px',
};

const introTitle = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '700',
  lineHeight: '1.28',
  margin: '0 0 16px 0',
  textAlign: 'left',
};

const introText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0',
  textAlign: 'left',
};

const contentSection = {
  padding: '0 20px',
  marginBottom: '16px',
};

const tipBox = {
  backgroundColor: '#f0f0f0',
  borderRadius: '2px',
  padding: '12px',
  marginBottom: '16px',
};

const tipTitle = {
  color: '#ef0b72',
  fontSize: '14.67px',
  fontWeight: '700',
  lineHeight: '1.28',
  margin: '0 0 8px 0',
};

const tipText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0',
};

const tipLink = {
  color: '#000000',
  textDecoration: 'underline',
};

const closingSection = {
  padding: '0 20px',
  marginBottom: '16px',
};

const closingText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0 0 16px 0',
  textAlign: 'left',
};

const signatureText = {
  color: '#000000',
  fontSize: '14.67px',
  fontWeight: '700',
  lineHeight: '1.28',
  margin: '0',
  textAlign: 'left',
};

const footerSection = {
  backgroundColor: '#f0f0f0',
  padding: '12px 20px',
  margin: '0',
};

const footerLogo = {
  display: 'block',
  marginBottom: '16px',
};

const footerText = {
  color: '#000000',
  fontSize: '10.67px',
  letterSpacing: '-0.0025em',
  lineHeight: '1.4',
  margin: '0',
};

const footerLink = {
  color: '#000000',
  textDecoration: 'underline',
};

const WelcomeEmail = ({ firstName = 'there', courseName = 'Product Manager' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null,
      e('meta', { name: 'color-scheme', content: 'light' }),
      e('meta', { name: 'supported-color-schemes', content: 'light' })
    ),
    e(Preview, null, `${firstName}, let's get started!`),
    e(Body, { style: main },
      e(Container, { style: container },
        // Logo Section
        e(Section, { style: logoSection },
          e(Link, { href: 'https://ignite.education' },
            e(Img, {
              src: 'https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
              width: '107',
              alt: 'Ignite',
              style: logo
            })
          )
        ),
        // Welcome Header
        e(Heading, { style: h1 },
          e('span', { style: { color: '#000000' } }, 'Welcome, '),
          e('span', { style: { color: '#ed1574' } }, firstName)
        ),
        // Certificate Image
        e(Section, { style: introSection },
          e(Img, {
            src: 'https://auth.ignite.education/storage/v1/object/public/assets/db6d49f3f5a82b1540bf96c8d4a06334.png',
            width: '148',
            height: '150',
            alt: 'Certificate',
            style: certificateIcon
          })
        ),
        // Intro Text
        e(Section, { style: contentSection },
          e(Text, { style: introTitle }, `${firstName}, welcome to the ${courseName} Course.`),
          e(Text, { style: introText }, "We're building a smarter, more personalised era of education for everyone, and we're glad you've joined us. Below are three top tips to help you start strong.")
        ),
        // Tip 1
        e(Section, { style: contentSection },
          e('div', { style: tipBox },
            e(Text, { style: tipTitle }, 'Tip 1 - Add Ignite to your LinkedIn'),
            e(Text, { style: tipText },
              'LinkedIn profiles with certifications get 6x more profile views than those without. ',
              e(Link, { href: `https://www.linkedin.com/profile/add?startTask=CERTIFICATION&name=${encodeURIComponent(courseName)}&organizationName=Ignite&issueYear=2025&certUrl=https://ignite.education`, style: tipLink }, 'Add now >')
            )
          )
        ),
        // Tip 2
        e(Section, { style: contentSection },
          e('div', { style: tipBox },
            e(Text, { style: tipTitle }, 'Tip 2 - Discover the Community Forum'),
            e(Text, { style: tipText }, 'Hear and contribute to the latest industry trends, conversation and advice in the Community Forum.')
          )
        ),
        // Tip 3
        e(Section, { style: contentSection },
          e('div', { style: tipBox },
            e(Text, { style: tipTitle }, 'Tip 3 - Set yourself a goal'),
            e(Text, { style: tipText }, 'Most people complete the course within six weeks. Set yourself a goal and stay committed.')
          )
        ),
        // Closing Section
        e(Section, { style: closingSection },
          e(Text, { style: closingText }, "We'll be in touch as you proceed through the course. If you ever need support, you can contact us through the Learning Hub Dashboard."),
          e(Text, { style: signatureText }, 'Team Ignite')
        ),
        // Footer
        e(Section, { style: footerSection },
          e(Link, { href: 'https://ignite.education' },
            e(Img, {
              src: 'https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
              width: '72',
              alt: 'Ignite',
              style: footerLogo
            })
          ),
          e(Text, { style: footerText },
            'Ignite Education AI Ltd. Unsubscribe from emails ',
            e(Link, { href: 'https://ignite.education/unsubscribe', style: footerLink }, 'here'),
            '.'
          )
        )
      )
    )
  );
};

export { WelcomeEmail };
export default WelcomeEmail;
