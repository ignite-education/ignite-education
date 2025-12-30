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

export const ModuleCompleteEmail = ({ firstName = 'there', moduleName = 'Module', courseName = 'your course' }) => (
  <Html>
    <Head />
    <Preview>Congratulations! You've completed {moduleName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://auth.ignite.education/storage/v1/object/public/assets/icon_v1-ezgif.com-loop-count.gif"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Section style={celebrationBanner}>
          <Text style={celebrationEmoji}>🎉</Text>
        </Section>
        <Heading style={h1}>Great work, {firstName}!</Heading>
        <Text style={text}>
          You've just completed <strong>{moduleName}</strong> in {courseName}. That's a significant milestone!
        </Text>
        <Text style={text}>
          Every module you complete brings you one step closer to mastering new skills and achieving your career goals.
        </Text>
        <Section style={statsBox}>
          <Text style={statsText}>
            <strong>Next Step:</strong> Continue to the next module to keep your momentum going.
          </Text>
        </Section>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Continue Learning
          </Button>
        </Section>
        <Text style={footer}>
          Keep up the great work!<br />
          The Ignite Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ModuleCompleteEmail;

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
  marginBottom: '16px',
};

const celebrationBanner = {
  textAlign: 'center',
  marginBottom: '24px',
};

const celebrationEmoji = {
  fontSize: '64px',
  margin: '0',
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

const statsBox = {
  backgroundColor: '#f3e8ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 32px',
};

const statsText = {
  color: '#7c3aed',
  fontSize: '16px',
  lineHeight: '24px',
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
