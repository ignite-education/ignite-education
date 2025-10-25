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

export const WelcomeEmail = ({ firstName = 'there' }) => (
  <Html>
    <Head />
    <Preview>Welcome to Ignite - Let's get you started!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Heading style={h1}>Welcome to Ignite, {firstName}!</Heading>
        <Text style={text}>
          We're thrilled to have you join our learning community. You're about to embark on an exciting journey to upskill and reskill for what's next.
        </Text>
        <Text style={text}>
          Here's what you can expect:
        </Text>
        <ul style={list}>
          <li style={listItem}>📚 Interactive, hands-on courses</li>
          <li style={listItem}>🎯 Personalized learning paths</li>
          <li style={listItem}>💬 Supportive community forum</li>
          <li style={listItem}>📊 Track your progress in real-time</li>
        </ul>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Start Learning
          </Button>
        </Section>
        <Text style={footer}>
          Need help? Reply to this email or reach out to us at{' '}
          <a href="mailto:hello@ignite.education" style={link}>
            hello@ignite.education
          </a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

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

const list = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left',
  margin: '16px 32px',
};

const listItem = {
  marginBottom: '8px',
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
