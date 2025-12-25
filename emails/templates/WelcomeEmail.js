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
  Hr,
} from '@react-email/components';
import * as React from 'react';

// Styles
const main = {
  backgroundColor: '#000000',
  fontFamily: 'Geist, Arial, Helvetica, sans-serif',
};

const container = {
  backgroundColor: '#000000',
  margin: '0 auto',
  padding: '10px 0',
  maxWidth: '600px',
};

const logoSection = {
  textAlign: 'center',
  padding: '21px 0',
};

const logo = {
  margin: '0 auto',
};

const h1 = {
  fontSize: '31px',
  fontWeight: '700',
  textAlign: 'center',
  margin: '16px 20px',
  padding: '0',
};

const introSection = {
  padding: '0 40px 0 40px',
  textAlign: 'center',
  marginBottom: '0',
};

const certificateIcon = {
  margin: '0 auto 16px',
};

const divider = {
  borderColor: '#000000',
  borderWidth: '1px',
  margin: '8px auto',
  width: '239px',
};

const introTitle = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  lineHeight: '1.4',
  margin: '8px 0',
};

const introText = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '1.28',
  margin: '8px 0 8px 0',
};

const tipContainer = {
  padding: '0 20px',
  marginBottom: '12px',
  marginTop: '0',
};

const tipTable = {
  width: '100%',
  maxWidth: '451px',
  margin: '0 auto',
  backgroundColor: '#ef0b72',
  borderRadius: '10px',
};

const tipNumberCell = {
  width: '45px',
  verticalAlign: 'middle',
  textAlign: 'center',
  backgroundColor: '#ef0b72',
  borderTopLeftRadius: '10px',
  borderBottomLeftRadius: '10px',
  padding: '5px',
};

const tipNumber = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
};

const tipContentCell = {
  backgroundColor: '#ffffff',
  borderTopRightRadius: '11px',
  borderBottomRightRadius: '11px',
  padding: '15px',
  verticalAlign: 'top',
};

const tipTitle = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 4px 0',
  lineHeight: '1.15',
};

const tipDescription = {
  color: '#000000',
  fontSize: '13px',
  margin: '0',
  lineHeight: '1.4',
};

const tipLink = {
  color: '#ef0b72',
  fontWeight: '700',
  textDecoration: 'underline',
};

const closingSection = {
  padding: '0 40px',
  textAlign: 'left',
};

const closingText = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '1.4',
  margin: '16px 0',
};

const signatureText = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  margin: '16px 0',
};

const footerSection = {
  backgroundColor: '#000000',
  textAlign: 'center',
  padding: '20px',
};

const footerLogo = {
  margin: '0 auto 16px',
};

const footerText = {
  color: '#ffffff',
  fontSize: '12px',
  margin: '0 0 16px 0',
  lineHeight: '1.4',
};

const footerLink = {
  color: '#ffffff',
  textDecoration: 'underline',
};

const copyrightText = {
  color: '#ffffff',
  fontSize: '11px',
  margin: '0',
};

const WelcomeEmail = ({ firstName = 'there', courseName = 'Product Manager' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null),
    e(Preview, null, `Welcome to the ${courseName} Course - Let's get you started!`),
    e(Body, { style: main },
      e(Container, { style: container },
        // Logo
        e(Section, { style: logoSection },
          e(Link, { href: 'https://ignite.education' },
            e(Img, {
              src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
              width: '140',
              alt: 'Ignite',
              style: logo
            })
          )
        ),
        // Welcome Header
        e(Heading, { style: h1 },
          e('span', { style: { color: '#f0f0f0' } }, 'Welcome, '),
          e('span', { style: { color: '#ef0b72' } }, firstName)
        ),
        // Intro Section
        e(Section, { style: introSection },
          e(Img, {
            src: 'https://auth.ignite.education/storage/v1/object/public/assets/db6d49f3f5a82b1540bf96c8d4a06334.png',
            width: '171',
            height: '173',
            alt: 'Certificate',
            style: certificateIcon
          }),
          e(Hr, { style: divider }),
          e(Text, { style: introTitle }, `${firstName}, welcome to the ${courseName} Course.`),
          e(Text, { style: introText }, "We're building a smarter, more personalised era of education for everyone, and we're glad you've joined us. Below are some top tips to help you start strong."),
          e(Hr, { style: divider })
        ),
        // Tip 1
        e(Section, { style: tipContainer },
          e('table', { cellPadding: '0', cellSpacing: '0', border: '0', style: tipTable },
            e('tbody', null,
              e('tr', null,
                e('td', { style: tipNumberCell },
                  e(Text, { style: tipNumber }, '1')
                ),
                e('td', { style: tipContentCell },
                  e(Text, { style: tipTitle }, 'Add Ignite to your LinkedIn'),
                  e(Text, { style: tipDescription },
                    'LinkedIn profiles with certifications get 6x more profile views than those without. ',
                    e(Link, { href: 'https://www.linkedin.com/profile/add?startTask=CERTIFICATION&name=Product%20Manager&organizationName=Ignite&issueYear=2025&certUrl=https://ignite.education', style: tipLink }, 'Add now >')
                  )
                )
              )
            )
          )
        ),
        // Tip 2
        e(Section, { style: tipContainer },
          e('table', { cellPadding: '0', cellSpacing: '0', border: '0', style: tipTable },
            e('tbody', null,
              e('tr', null,
                e('td', { style: tipNumberCell },
                  e(Text, { style: tipNumber }, '2')
                ),
                e('td', { style: tipContentCell },
                  e(Text, { style: tipTitle }, 'Discover the Community Forum'),
                  e(Text, { style: tipDescription }, 'Hear and contribute to the latest industry trends, conversation and advice in the Community Forum.')
                )
              )
            )
          )
        ),
        // Tip 3
        e(Section, { style: tipContainer },
          e('table', { cellPadding: '0', cellSpacing: '0', border: '0', style: tipTable },
            e('tbody', null,
              e('tr', null,
                e('td', { style: tipNumberCell },
                  e(Text, { style: tipNumber }, '3')
                ),
                e('td', { style: tipContentCell },
                  e(Text, { style: tipTitle }, 'Commit to Yourself'),
                  e(Text, { style: tipDescription }, 'Most people complete the course within six weeks. Set yourself a goal, write it down and stay committed.')
                )
              )
            )
          )
        ),
        // Closing Section
        e(Section, { style: closingSection },
          e(Hr, { style: divider }),
          e(Text, { style: closingText }, "We'll be in touch as you proceed through the course. If you ever need support, you can contact us through the Learning Hub Dashboard."),
          e(Text, { style: signatureText }, 'Ignite Team'),
          e(Hr, { style: divider })
        ),
        // Footer
        e(Section, { style: footerSection },
          e(Link, { href: 'https://ignite.education' },
            e(Img, {
              src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
              width: '100',
              alt: 'Ignite',
              style: footerLogo
            })
          ),
          e(Link, { href: 'https://ignite.education/unsubscribe', style: footerLink },
            e(Text, { style: footerText }, 'Unsubscribe from emails here.')
          ),
          e(Text, { style: copyrightText }, '© Ignite Education AI Ltd')
        )
      )
    )
  );
};

export { WelcomeEmail };
export default WelcomeEmail;
