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

// Styles - matching WelcomeEmail design
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

const contentSection = {
  padding: '0 90px',
  marginBottom: '16px',
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

const statsBox = {
  backgroundColor: '#f0f0f0',
  borderRadius: '2px',
  padding: '12px',
  marginBottom: '16px',
};

const statsText = {
  color: '#000000',
  fontSize: '14.67px',
  lineHeight: '1.28',
  margin: '0',
  textAlign: 'center',
};

const statsHighlight = {
  color: '#ef0b72',
  fontWeight: '700',
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

const buttonSection = {
  padding: '0 20px',
  marginBottom: '16px',
  textAlign: 'center',
};

const button = {
  backgroundColor: '#EF0B72',
  borderRadius: '4px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '12px 24px',
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

const FirstLessonEmail = ({ firstName = 'there', lessonName = 'your first lesson', courseName = 'your course' }) => {
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
        }
      `)
    ),
    e(Preview, null, 'You completed your first lesson - keep the momentum going!'),
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
          e('span', { style: { color: '#000000' } }, 'Great start, '),
          e('span', { style: { color: '#ed1574' } }, firstName),
          e('span', { style: { color: '#000000' } }, '!')
        ),
        // Content Section
        e(Section, { style: contentSection, className: 'content-section' },
          e(Text, { style: introTitle }, `You completed ${lessonName}`),
          e(Text, { style: introText },
            `in ${courseName}. That's the hardest part done - getting started.`
          ),
          // Stats Box
          e('div', { style: statsBox },
            e(Text, { style: statsText },
              'Research shows that completing your first lesson makes you ',
              e('span', { style: statsHighlight }, '3x more likely'),
              ' to finish the entire course.'
            )
          ),
          e(Text, { style: introText }, 'Keep the momentum going. Your next lesson is waiting for you.')
        ),
        // Button Section
        e(Section, { style: buttonSection },
          e(Link, { href: 'https://ignite.education/progress', style: button }, 'Continue Learning')
        ),
        // Closing Section
        e(Section, { style: closingSection, className: 'content-section' },
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

export { FirstLessonEmail };
export default FirstLessonEmail;
