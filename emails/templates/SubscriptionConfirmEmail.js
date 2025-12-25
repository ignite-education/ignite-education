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

const SubscriptionConfirmEmail = ({ firstName = 'there' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null),
    e(Preview, null, 'Welcome to Ignite Premium - your subscription is confirmed'),
    e(Body, { style: main },
      e(Container, { style: container },
        e(Img, {
          src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
          width: '140',
          height: '45',
          alt: 'Ignite',
          style: logo
        }),
        e(Heading, { style: h1 }, `You're now an Ignite subscriber, ${firstName}!`),
        e(Text, { style: text }, 'Thank you for subscribing. Your payment has been confirmed and you now have access to all premium features.'),
        e(Section, { style: benefitsBox },
          e(Text, { style: benefitsTitle }, "What's included:"),
          e('ul', { style: list },
            e('li', { style: listItem }, 'Ad-free learning experience'),
            e('li', { style: listItem }, 'Office Hours with course leaders'),
            e('li', { style: listItem }, 'Priority support')
          )
        ),
        e(Text, { style: text }, 'Continue your learning journey and make the most of your subscription.'),
        e(Section, { style: buttonContainer },
          e(Button, { style: button, href: 'https://ignite.education/progress' }, 'Continue Learning')
        ),
        e(Text, { style: footer },
          'Manage your subscription anytime from your account settings.',
          e('br', null),
          'Questions? Email us at ',
          e('a', { href: 'mailto:hello@ignite.education', style: link }, 'hello@ignite.education')
        )
      )
    )
  );
};

module.exports = { SubscriptionConfirmEmail };
module.exports.default = SubscriptionConfirmEmail;
