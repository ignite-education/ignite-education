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

export const FirstLessonEmail = ({ firstName = 'there', lessonName = 'your first lesson', courseName = 'your course' }) => (
  <Html>
    <Head />
    <Preview>You completed your first lesson - keep the momentum going!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Heading style={h1}>Great start, {firstName}!</Heading>
        <Text style={text}>
          You've just completed <strong>{lessonName}</strong> in {courseName}. That's the hardest part done - getting started.
        </Text>
        <Section style={statsBox}>
          <Text style={statsText}>
            Research shows that completing your first lesson makes you <strong>3x more likely</strong> to finish the entire course.
          </Text>
        </Section>
        <Text style={text}>
          Keep the momentum going. Your next lesson is waiting for you.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Continue Learning
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

export default FirstLessonEmail;

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

const statsBox = {
  backgroundColor: '#fdf2f8',
  borderRadius: '8px',
  margin: '24px 32px',
  padding: '16px 24px',
};

const statsText = {
  color: '#831843',
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
