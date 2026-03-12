import React from 'react';
import Lobby from './Lobby';

// Mock data for local development preview
const mockCoaches = [
  {
    id: 'preview-coach-1',
    name: 'Max Shillam',
    position: 'Sr Program Manager at Amazon',
    description: 'Max is a Senior PM at Amazon currently overseeing the development of the Technical Products customer experience across Search, Detail Page and Rufus.',
    image_url: 'https://auth.ignite.education/storage/v1/object/public/assets/max-profile.jpg',
  },
];

const mockLessons = [
  { module_number: 1, lesson_number: 1, lesson_name: 'Introduction to Product Management' },
  { module_number: 1, lesson_number: 2, lesson_name: 'The Product Lifecycle' },
  { module_number: 1, lesson_number: 3, lesson_name: 'Understanding Your Users' },
  { module_number: 2, lesson_number: 1, lesson_name: 'Market Research & Analysis' },
  { module_number: 2, lesson_number: 2, lesson_name: 'Competitive Analysis' },
  { module_number: 2, lesson_number: 3, lesson_name: 'Product Strategy' },
  { module_number: 3, lesson_number: 1, lesson_name: 'Writing User Stories' },
  { module_number: 3, lesson_number: 2, lesson_name: 'Prioritisation Frameworks' },
  { module_number: 3, lesson_number: 3, lesson_name: 'Roadmap Planning' },
];

// End time = 2 hours from now for preview
const mockEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const LobbyPreview = () => {
  const handleJoin = async (topic, question) => {
    alert(`[Preview] Would join with:\nTopic: ${topic}\nQuestion: ${question}`);
  };

  return (
    <Lobby
      coaches={mockCoaches}
      lessons={mockLessons}
      sessionEndTime={mockEndTime}
      onJoin={handleJoin}
    />
  );
};

export default LobbyPreview;
