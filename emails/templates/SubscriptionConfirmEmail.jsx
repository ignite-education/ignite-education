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

export const SubscriptionConfirmEmail = ({ firstName = 'there' }) => (
  <Html>
    <Head />
    <Preview>Welcome to Ignite Premium - your subscription is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://auth.ignite.education/storage/v1/object/public/assets/icon_v1-ezgif.com-loop-count.gif"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Heading style={h1}>You're now an Ignite subscriber, {firstName}!</Heading>
        <Text style={text}>
          Thank you for subscribing. Your payment has been confirmed and you now have access to all premium features.
        </Text>
        <Section style={benefitsBox}>
          <Text style={benefitsTitle}>What's included:</Text>
          <ul style={list}>
            <li style={listItem}>Ad-free learning experience</li>
            <li style={listItem}>Office Hours with course leaders</li>
            <li style={listItem}>Priority support</li>
          </ul>
        </Section>
        <Text style={text}>
          Continue your learning journey and make the most of your subscription.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Continue Learning
          </Button>
        </Section>
        <Text style={footer}>
          Manage your subscription anytime from your account settings.
          <br />
          Questions? Email us at{' '}
          <a href="mailto:hello@ignite.education" style={link}>
            hello@ignite.education
          </a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionConfirmEmail;

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

const benefitsBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  margin: '24px 32px',
  padding: '16px 24px',
};

const benefitsTitle = {
  color: '#166534',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const list = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  paddingLeft: '20px',
};

const listItem = {
  marginBottom: '4px',
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
