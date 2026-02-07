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
  backgroundColor: '#F7F7F8',
  fontFamily: 'Geist, Arial, Helvetica, sans-serif',
};

const container = {
  backgroundColor: '#F7F7F8',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
};

const logoSection = {
  backgroundColor: '#F7F7F8',
  padding: '38px 20px 11px 20px',
  margin: '0',
  textAlign: 'center',
};

const logo = {
  display: 'block',
  margin: '0 auto',
};

const h1 = {
  fontSize: '30px',
  fontWeight: '700',
  textAlign: 'center',
  margin: '16px 20px 22px 20px',
  padding: '0',
};

const introSection = {
  padding: '0 20px',
  textAlign: 'center',
  marginBottom: '16px',
};

const rocketIcon = {
  margin: '0 auto 16px',
};

const introTitle = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '700',
  lineHeight: '1.28',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const introText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const contentSection = {
  padding: '0 90px',
  marginBottom: '16px',
};

const priorityBox = {
  backgroundColor: '#fef3f8',
  borderRadius: '8px',
  border: '1px solid #ef0b72',
  padding: '16px',
  marginBottom: '16px',
  textAlign: 'center',
};

const priorityTitle = {
  color: '#ef0b72',
  fontSize: '14.67px',
  fontWeight: '700',
  lineHeight: '1.28',
  margin: '0 0 8px 0',
};

const priorityText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0',
};

const ctaButtonSection = {
  padding: '0 20px',
  marginBottom: '24px',
  textAlign: 'center',
};

const ctaButton = {
  backgroundColor: '#EF0B72',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '14px 28px',
};

const closingSection = {
  padding: '0 90px',
  marginBottom: '34px',
};

const closingText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0 0 16px 0',
  textAlign: 'center',
};

const signatureText = {
  color: '#000000',
  fontSize: '14.67px',
  fontWeight: '700',
  lineHeight: '1.28',
  margin: '0',
  textAlign: 'center',
};

const footerSection = {
  backgroundColor: '#F7F7F8',
  padding: '12px 20px 45px 20px',
  margin: '0',
  textAlign: 'center',
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

const CourseLaunchEmail = ({ firstName = 'there', courseName = 'the course', priorityLink = 'https://ignite.education', expiryHours = 72 }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null,
      e('meta', { name: 'color-scheme', content: 'light' }),
      e('meta', { name: 'supported-color-schemes', content: 'light' }),
      e('style', null, `
        @media only screen and (max-width: 600px) {
          .content-section {
            padding-left: 30px !important;
            padding-right: 30px !important;
          }
          .desktop-only {
            display: none !important;
          }
        }
      `)
    ),
    e(Preview, null, `${courseName} is now live! Claim your priority spot.`),
    e(Body, { style: main },
      e(Container, { style: container },
        // Logo Section
        e(Section, { style: logoSection },
          e(Link, { href: 'https://ignite.education' },
            e(Img, {
              src: 'https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_S_5%20(2).png',
              width: '80',
              alt: 'Ignite',
              style: logo
            })
          )
        ),
        // Header
        e(Heading, { style: h1 },
          e('span', { style: { color: '#ed1574' } }, courseName),
          e('span', { style: { color: '#000000' } }, ' is Live!')
        ),
        // Rocket Image
        e(Section, { style: introSection },
          e(Img, {
            src: 'https://auth.ignite.education/storage/v1/object/public/assets/db6d49f3f5a82b1540bf96c8d4a06334.png',
            width: '180',
            height: '180',
            alt: 'Course Launch',
            style: rocketIcon
          })
        ),
        // Intro Text
        e(Section, { style: contentSection, className: 'content-section' },
          e(Text, { style: introTitle }, `Great news, ${firstName}!`),
          e(Text, { style: introText }, `The ${courseName} course you signed up for is now live and ready for you to start learning.`)
        ),
        // Priority Access Box
        e(Section, { style: contentSection, className: 'content-section' },
          e('div', { style: priorityBox },
            e(Text, { style: priorityTitle }, 'Priority Access'),
            e(Text, { style: priorityText }, `As a waitlist member, you get priority access to enroll before the general public. This link expires in ${expiryHours} hours.`)
          )
        ),
        // CTA Button
        e(Section, { style: ctaButtonSection },
          e(Link, {
            href: priorityLink,
            style: ctaButton
          }, 'Claim Your Priority Spot')
        ),
        // Closing Section
        e(Section, { style: closingSection, className: 'content-section' },
          e(Text, { style: closingText }, "We're excited to have you on this learning journey. If you have any questions, reach out through the Progress Hub."),
          e(Text, { style: signatureText }, 'Team Ignite')
        ),
        // Footer
        e(Section, { style: footerSection },
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

export { CourseLaunchEmail };
export default CourseLaunchEmail;
