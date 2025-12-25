const {
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
} = require('@react-email/components');
const React = require('react');

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

const InactivityReminderEmail = ({ firstName = 'there', daysSinceLogin = 14, courseName = 'your course' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null),
    e(Preview, null, `We miss you - your ${courseName} progress is waiting`),
    e(Body, { style: main },
      e(Container, { style: container },
        e(Img, {
          src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
          width: '140',
          height: '45',
          alt: 'Ignite',
          style: logo
        }),
        e(Heading, { style: h1 }, `We miss you, ${firstName}!`),
        e(Text, { style: text },
          `It's been ${daysSinceLogin} days since you last logged in. Your progress in `,
          e('strong', null, courseName),
          ' is waiting for you.'
        ),
        e(Section, { style: motivationBox },
          e(Text, { style: motivationText }, 'Even 10 minutes of learning today can help you build momentum and stay on track with your goals.')
        ),
        e(Text, { style: text }, 'Pick up where you left off - your course is ready when you are.'),
        e(Section, { style: buttonContainer },
          e(Button, { style: button, href: 'https://ignite.education/progress' }, 'Resume Learning')
        ),
        e(Text, { style: footer },
          "If you're no longer interested in receiving these reminders, you can update your preferences in your account settings.",
          e('br', null),
          e('br', null),
          'Questions? Email us at ',
          e('a', { href: 'mailto:hello@ignite.education', style: link }, 'hello@ignite.education')
        )
      )
    )
  );
};

module.exports = { InactivityReminderEmail };
module.exports.default = InactivityReminderEmail;
