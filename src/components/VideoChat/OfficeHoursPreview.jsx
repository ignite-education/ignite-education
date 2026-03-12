import React, { useState, useEffect, useRef } from 'react';
import OfficeHours from './OfficeHours';

// Mock data for local development preview
const mockCoaches = [
  {
    id: 'preview-coach-1',
    name: 'Max Shillam',
    position: 'Sr Program Manager at Amazon',
    description: 'Max is a Senior PM at Amazon currently overseeing the development of the Technical Products customer experience across Search, Detail Page and Rufus.',
    image_url: 'https://auth.ignite.education/storage/v1/object/public/assets/_I4A4206%20(1).jpg',
  },
];

const mockLessons = [
  { module_number: 1, lesson_number: 1, lesson_name: 'What is Product Management?' },
  { module_number: 1, lesson_number: 2, lesson_name: 'Role of a Product Manager' },
  { module_number: 1, lesson_number: 3, lesson_name: 'The Product Lifecycle' },
  { module_number: 1, lesson_number: 4, lesson_name: 'Types of Product Manager' },
  { module_number: 1, lesson_number: 5, lesson_name: 'A Day in the Life of a PM' },
  { module_number: 2, lesson_number: 1, lesson_name: 'Customer Discovery' },
  { module_number: 2, lesson_number: 2, lesson_name: 'User Research Methods' },
  { module_number: 2, lesson_number: 3, lesson_name: 'Market Analysis' },
  { module_number: 2, lesson_number: 4, lesson_name: 'Competitive Analysis' },
  { module_number: 2, lesson_number: 5, lesson_name: 'Product Strategy & Vision' },
  { module_number: 3, lesson_number: 1, lesson_name: 'Prioritisation Frameworks' },
  { module_number: 3, lesson_number: 2, lesson_name: 'Roadmapping' },
  { module_number: 3, lesson_number: 3, lesson_name: 'Writing User Stories & PRDs' },
  { module_number: 3, lesson_number: 4, lesson_name: 'Agile & Scrum' },
  { module_number: 3, lesson_number: 5, lesson_name: 'Metrics & KPIs' },
];

// End time = 2 hours from now for preview
const mockEndTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

// Mock queue data for testing queue view
const mockQueue = [
  { id: 'q1', userId: 'u1', firstName: 'Noah', lastName: 'Khan', country: 'GB', profilePicture: null, topic: 'Design Thinking', status: 'waiting' },
  { id: 'q2', userId: 'u2', firstName: 'Julia', lastName: 'Brown', country: 'US', profilePicture: null, topic: 'A/B Testing', status: 'waiting' },
  { id: 'q3', userId: 'preview-user', firstName: 'Max', lastName: 'Shillam', country: 'GB', profilePicture: null, topic: 'Design Thinking', status: 'waiting' },
];

const OfficeHoursPreview = () => {
  const [mode, setMode] = useState('connected'); // 'join' | 'queued' | 'connected' | 'feedback'
  const prevModeRef = useRef(mode);

  // Scroll to top after React re-renders with the new mode
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
  }, [mode]);

  const handleJoin = async (topic, question) => {
    setMode('queued');
  };

  return (
    <div>
      {/* Mode toggle — fixed top-right */}
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        zIndex: 100,
        display: 'flex',
        gap: '4px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px',
        padding: '3px',
        fontSize: '0.75rem',
        fontWeight: 500,
      }}>
        {['join', 'queued', 'connected', 'feedback'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mode === m ? '#111' : 'transparent',
              color: mode === m ? 'white' : '#666',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <OfficeHours
        coaches={mockCoaches}
        lessons={mockLessons}
        sessionEndTime={mockEndTime}
        onJoin={handleJoin}
        queued={mode === 'queued'}
        queueEntryId="q3"
        sessionId="preview-session"
        currentUserId="preview-user"
        initialQueue={mockQueue}
        onAutoConnect={() => alert('[Preview] Auto-connecting...')}
        connectedPreview={mode === 'connected' || mode === 'feedback'}
        feedbackPreview={mode === 'feedback'}
      />
    </div>
  );
};

export default OfficeHoursPreview;
