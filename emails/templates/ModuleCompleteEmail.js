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

const ModuleCompleteEmail = ({ firstName = 'there', moduleName = 'Module', courseName = 'your course' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null),
    e(Preview, null, `Congratulations! You've completed ${moduleName}`),
    e(Body, { style: main },
      e(Container, { style: container },
        e(Img, {
          src: 'https://auth.ignite.education/storage/v1/object/public/assets/icon_v1-ezgif.com-loop-count.gif',
          width: '140',
          height: '45',
          alt: 'Ignite',
          style: logo
        }),
        e(Section, { style: celebrationBanner },
          e(Text, { style: celebrationEmoji }, '🎉')
        ),
        e(Heading, { style: h1 }, `Great work, ${firstName}!`),
        e(Text, { style: text },
          "You've just completed ",
          e('strong', null, moduleName),
          ` in ${courseName}. That's a significant milestone!`
        ),
        e(Text, { style: text }, 'Every module you complete brings you one step closer to mastering new skills and achieving your career goals.'),
        e(Section, { style: statsBox },
          e(Text, { style: statsText },
            e('strong', null, 'Next Step:'),
            ' Continue to the next module to keep your momentum going.'
          )
        ),
        e(Section, { style: buttonContainer },
          e(Button, { style: button, href: 'https://ignite.education/progress' }, 'Continue Learning')
        ),
        e(Text, { style: footer },
          'Keep up the great work!',
          e('br', null),
          'The Ignite Team'
        )
      )
    )
  );
};

export { ModuleCompleteEmail };
export default ModuleCompleteEmail;
