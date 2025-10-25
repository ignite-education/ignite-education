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

export const CourseCompleteEmail = ({ firstName = 'there', courseName = 'your course' }) => (
  <Html>
    <Head />
    <Preview>🎓 Congratulations on completing {courseName}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png"
          width="140"
          height="45"
          alt="Ignite"
          style={logo}
        />
        <Section style={celebrationBanner}>
          <Text style={celebrationEmoji}>🎓🎉✨</Text>
        </Section>
        <Heading style={h1}>Congratulations, {firstName}!</Heading>
        <Text style={text}>
          You've successfully completed <strong>{courseName}</strong>! This is a major achievement and we're incredibly proud of you.
        </Text>
        <Text style={text}>
          You've invested time, effort, and dedication into mastering new skills. This accomplishment is a testament to your commitment to personal and professional growth.
        </Text>
        <Section style={certificateBox}>
          <Text style={certificateTitle}>🏆 Your Achievement</Text>
          <Text style={certificateText}>
            Course: <strong>{courseName}</strong><br />
            Status: <strong style={{ color: '#10b981' }}>Completed</strong>
          </Text>
        </Section>
        <Text style={text}>
          <strong>What's next?</strong>
        </Text>
        <ul style={list}>
          <li style={listItem}>Share your achievement on LinkedIn</li>
          <li style={listItem}>Explore more courses to continue learning</li>
          <li style={listItem}>Apply your new skills to real-world projects</li>
          <li style={listItem}>Connect with our community in the forum</li>
        </ul>
        <Section style={buttonContainer}>
          <Button style={button} href="https://ignite.education/progress">
            Explore More Courses
          </Button>
        </Section>
        <Text style={footer}>
          We can't wait to see what you accomplish next!<br />
          <strong>The Ignite Team</strong>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default CourseCompleteEmail;

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
  fontSize: '28px',
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

const certificateBox = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 32px',
  textAlign: 'center',
};

const certificateTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const certificateText = {
  color: '#ffffff',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
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
