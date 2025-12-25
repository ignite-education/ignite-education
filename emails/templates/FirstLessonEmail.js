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

const FirstLessonEmail = ({ firstName = 'there', lessonName = 'your first lesson', courseName = 'your course' }) => {
  const e = React.createElement;

  return e(Html, null,
    e(Head, null),
    e(Preview, null, 'You completed your first lesson - keep the momentum going!'),
    e(Body, { style: main },
      e(Container, { style: container },
        e(Img, {
          src: 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png',
          width: '140',
          height: '45',
          alt: 'Ignite',
          style: logo
        }),
        e(Heading, { style: h1 }, `Great start, ${firstName}!`),
        e(Text, { style: text },
          "You've just completed ",
          e('strong', null, lessonName),
          ` in ${courseName}. That's the hardest part done - getting started.`
        ),
        e(Section, { style: statsBox },
          e(Text, { style: statsText },
            'Research shows that completing your first lesson makes you ',
            e('strong', null, '3x more likely'),
            ' to finish the entire course.'
          )
        ),
        e(Text, { style: text }, 'Keep the momentum going. Your next lesson is waiting for you.'),
        e(Section, { style: buttonContainer },
          e(Button, { style: button, href: 'https://ignite.education/progress' }, 'Continue Learning')
        ),
        e(Text, { style: footer },
          'Need help? Reply to this email or reach out to us at ',
          e('a', { href: 'mailto:hello@ignite.education', style: link }, 'hello@ignite.education')
        )
      )
    )
  );
};

export { FirstLessonEmail };
export default FirstLessonEmail;
