import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export const InactivityReminderEmail = ({ firstName = 'there', daysSinceLogin = 14, courseName = 'your course' }) => (
  <Html>
    <Head />
    <Preview>We miss you - your {courseName} progress is waiting</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://auth.ignite.education/storage/v1/object/public/assets/icon_v1-ezgif.com-loop-count.gif"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Heading style={h1}>We miss you, {firstName}!</Heading>
        <Text style={text}>
          It's been {daysSinceLogin} days since you last logged in. Your progress in <strong>{courseName}</strong> is waiting for you.
        </Text>
        <Section style={motivationBox}>
          <Text style={motivationText}>
            Even 10 minutes of learning today can help you build momentum and stay on track with your goals.
          </Text>
        </Section>
        <Text style={text}>
          Pick up where you left off - your course is ready when you are.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Resume Learning
          </Button>
        </Section>
        <Text style={footer}>
          If you're no longer interested in receiving these reminders, you can update your preferences in your account settings.
          <br /><br />
          Questions? Email us at{' '}
          <a href="mailto:hello@ignite.education" style={link}>
            hello@ignite.education
          </a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default InactivityReminderEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logo = {
  margin: '0 auto',
  display: 'block',
  marginBottom: '32px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center',
};

const text = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left',
  margin: '16px 32px',
};

const motivationBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  margin: '24px 32px',
  padding: '16px 24px',
};

const motivationText = {
  color: '#1e40af',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  textAlign: 'center',
};

const buttonContainer = {
  textAlign: 'center',
  margin: '32px 0',
};

const button = {
  backgroundColor: '#ec4899',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center',
  margin: '32px 32px 0',
};

const link = {
  color: '#ec4899',
  textDecoration: 'underline',
};
