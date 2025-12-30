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

export const WelcomeEmail = ({ firstName = 'there', courseName = 'Product Manager' }) => (
  <Html>
    <Head />
    <Preview>Welcome to the {courseName} Course - Let's get you started!</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Logo */}
        <Section style={logoSection}>
          <Link href="https://www.linkedin.com/school/ignite-courses">
            <Img
              src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_S_5%20(2).png"
              width="161"
              alt="Ignite"
              style={logo}
            />
          </Link>
        </Section>

        {/* Welcome Header */}
        <Heading style={h1}>
          <span style={{ color: '#000000' }}>Welcome, </span>
          <span style={{ color: '#ef0b72' }}>{firstName}</span>
        </Heading>

        {/* Intro Section */}
        <Section style={introSection}>
          <Img
            src="https://auth.ignite.education/storage/v1/object/public/assets/db6d49f3f5a82b1540bf96c8d4a06334.png"
            width="171"
            height="173"
            alt="Certificate"
            style={certificateIcon}
          />
          <Hr style={divider} />
          <Text style={introTitle}>
            {firstName}, welcome to the {courseName} Course.
          </Text>
          <Text style={introText}>
            We're building a smarter, more personalised era of education for everyone, and we're glad you've joined us. Below are some top tips to help you start strong.
          </Text>
          <Hr style={divider} />
        </Section>

        {/* Tip 1 */}
        <Section style={tipContainer}>
          <table cellPadding="0" cellSpacing="0" border="0" style={tipTable}>
            <tbody>
              <tr>
                <td style={tipNumberCell}>
                  <Text style={tipNumber}>1</Text>
                </td>
                <td style={tipContentCell}>
                  <Text style={tipTitle}>Add Ignite to your LinkedIn</Text>
                  <Text style={tipDescription}>
                    LinkedIn profiles with certifications get 6x more profile views than those without.{' '}
                    <Link href="https://www.linkedin.com/profile/add?startTask=CERTIFICATION&name=Product%20Manager&organizationName=Ignite&issueYear=2025&certUrl=https://ignite.education" style={tipLink}>
                      Add now &gt;
                    </Link>
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Tip 2 */}
        <Section style={tipContainer}>
          <table cellPadding="0" cellSpacing="0" border="0" style={tipTable}>
            <tbody>
              <tr>
                <td style={tipNumberCell}>
                  <Text style={tipNumber}>2</Text>
                </td>
                <td style={tipContentCell}>
                  <Text style={tipTitle}>Discover the Community Forum</Text>
                  <Text style={tipDescription}>
                    Hear and contribute to the latest industry trends, conversation and advice in the Community Forum.
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Tip 3 */}
        <Section style={tipContainer}>
          <table cellPadding="0" cellSpacing="0" border="0" style={tipTable}>
            <tbody>
              <tr>
                <td style={tipNumberCell}>
                  <Text style={tipNumber}>3</Text>
                </td>
                <td style={tipContentCell}>
                  <Text style={tipTitle}>Commit to Yourself</Text>
                  <Text style={tipDescription}>
                    Most people complete the course within six weeks. Set yourself a goal, write it down and stay committed.
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Closing Section */}
        <Section style={closingSection}>
          <Hr style={divider} />
          <Text style={closingText}>
            We'll be in touch as you proceed through the course. If you ever need support, you can contact us through the Learning Hub Dashboard.
          </Text>
          <Text style={signatureText}>Ignite Team</Text>
          <Hr style={divider} />
        </Section>

        {/* Footer */}
        <Section style={footerSection}>
          <Img
            src="https://auth.ignite.education/storage/v1/object/public/assets/ignite_Logo_S_5%20(2).png"
            width="100"
            alt="Ignite"
            style={footerLogo}
          />
          <Text style={footerText}>
            Unsubscribe from emails <Link href="https://ignite.education/unsubscribe" style={footerLink}>here</Link>.
          </Text>
          <Text style={copyrightText}>© Ignite Education AI Ltd</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

// Styles
const main = {
  backgroundColor: '#F7F7F8',
  fontFamily: 'Geist, Arial, Helvetica, sans-serif',
};

const container = {
  backgroundColor: '#F7F7F8',
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
  padding: '0 40px',
  textAlign: 'center',
};

const certificateIcon = {
  margin: '0 auto 16px',
};

const divider = {
  borderColor: '#cccccc',
  borderWidth: '1px',
  margin: '16px auto',
  width: '239px',
};

const introTitle = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '700',
  lineHeight: '1.4',
  margin: '16px 0',
  textAlign: 'center',
};

const introText = {
  color: '#000000',
  fontSize: '16px',
  lineHeight: '1.28',
  margin: '16px 0',
  textAlign: 'center',
};

const tipContainer = {
  padding: '0 20px',
  marginBottom: '16px',
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
  color: '#000000',
  fontSize: '16px',
  lineHeight: '1.4',
  margin: '16px 0',
};

const signatureText = {
  color: '#000000',
  fontSize: '16px',
  fontWeight: '700',
  margin: '16px 0',
};

const footerSection = {
  backgroundColor: '#F7F7F8',
  textAlign: 'center',
  padding: '20px',
};

const footerLogo = {
  margin: '0 auto 16px',
};

const footerText = {
  color: '#000000',
  fontSize: '12px',
  margin: '0 0 16px 0',
  lineHeight: '1.4',
};

const footerLink = {
  color: '#000000',
  textDecoration: 'underline',
};

const copyrightText = {
  color: '#000000',
  fontSize: '11px',
  margin: '0',
};
