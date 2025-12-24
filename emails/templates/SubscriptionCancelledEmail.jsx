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

export const SubscriptionCancelledEmail = ({ firstName = 'there' }) => (
  <Html>
    <Head />
    <Preview>Your Ignite subscription has been cancelled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Heading style={h1}>We're sorry to see you go, {firstName}</Heading>
        <Text style={text}>
          Your subscription has been cancelled. You'll continue to have access to premium features until the end of your current billing period.
        </Text>
        <Text style={text}>
          After that, you can still access all course content - you'll just see ads while learning.
        </Text>
        <Section style={infoBox}>
          <Text style={infoText}>
            Changed your mind? You can resubscribe anytime from your account settings.
          </Text>
        </Section>
        <Text style={text}>
          We'd love to know how we can improve. Feel free to share your feedback with us.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Continue Learning
          </Button>
        </Section>
        <Text style={footer}>
          Questions? Email us at{' '}
          <a href="mailto:hello@ignite.education" style={link}>
            hello@ignite.education
          </a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SubscriptionCancelledEmail;

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

const infoBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  margin: '24px 32px',
  padding: '16px 24px',
};

const infoText = {
  color: '#92400e',
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
