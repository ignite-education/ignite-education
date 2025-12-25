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

const CourseCompleteEmail = ({ firstName = 'there', courseName = 'your course' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null),
    e(Preview, null, `🎓 Congratulations on completing ${courseName}!`),
    e(Body, { style: main },
      e(Container, { style: container },
        e(Img, {
          src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
          width: '140',
          height: '45',
          alt: 'Ignite',
          style: logo
        }),
        e(Section, { style: celebrationBanner },
          e(Text, { style: celebrationEmoji }, '🎓🎉✨')
        ),
        e(Heading, { style: h1 }, `Congratulations, ${firstName}!`),
        e(Text, { style: text },
          "You've successfully completed ",
          e('strong', null, courseName),
          "! This is a major achievement and we're incredibly proud of you."
        ),
        e(Text, { style: text }, "You've invested time, effort, and dedication into mastering new skills. This accomplishment is a testament to your commitment to personal and professional growth."),
        e(Section, { style: certificateBox },
          e(Text, { style: certificateTitle }, '🏆 Your Achievement'),
          e(Text, { style: certificateText },
            'Course: ',
            e('strong', null, courseName),
            e('br', null),
            'Status: ',
            e('strong', { style: { color: '#10b981' } }, 'Completed')
          )
        ),
        e(Text, { style: text },
          e('strong', null, "What's next?")
        ),
        e('ul', { style: list },
          e('li', { style: listItem }, 'Share your achievement on LinkedIn'),
          e('li', { style: listItem }, 'Explore more courses to continue learning'),
          e('li', { style: listItem }, 'Apply your new skills to real-world projects'),
          e('li', { style: listItem }, 'Connect with our community in the forum')
        ),
        e(Section, { style: buttonContainer },
          e(Button, { style: button, href: 'https://ignite.education/progress' }, 'Explore More Courses')
        ),
        e(Text, { style: footer },
          "We can't wait to see what you accomplish next!",
          e('br', null),
          e('strong', null, 'The Ignite Team')
        )
      )
    )
  );
};

module.exports = { CourseCompleteEmail };
module.exports.default = CourseCompleteEmail;
