import React, { useState } from 'react';
import CameraPreview from './CameraPreview';
import TopicForm from './TopicForm';

const formatEndTime = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const hour = date.getHours();
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${period}`;
};

const Lobby = ({ coaches, lessons, sessionEndTime, onJoin }) => {
  const [mediaReady, setMediaReady] = useState({ camera: false, mic: false });
  const [joining, setJoining] = useState(false);

  const coach = coaches?.[0] || null;
  const endTimeFormatted = formatEndTime(sessionEndTime);
  const formDisabled = !mediaReady.camera || !mediaReady.mic || joining;

  const handleJoin = async (topic, question) => {
    setJoining(true);
    try {
      await onJoin(topic, question);
    } catch {
      setJoining(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      backgroundColor: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: '32px 48px 0' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#111', margin: 0, lineHeight: 1.2 }}>
          Office Hours
        </h1>
        {endTimeFormatted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              animation: 'pulse-green 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '1rem', color: '#333', fontWeight: 400 }}>
              Live Now till {endTimeFormatted}
            </span>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'flex',
        padding: '32px 48px 48px',
        gap: '48px',
        maxWidth: '1200px',
      }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <CameraPreview onReadyChange={setMediaReady} />

          {/* Course Leader */}
          {coach && (
            <div style={{ marginTop: '28px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111', margin: '0 0 12px' }}>
                Course Leader
              </h3>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                {coach.image_url && (
                  <img
                    src={coach.image_url}
                    alt={coach.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111' }}>
                    {coach.name}
                  </p>
                  {coach.position && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 400, color: '#555' }}>
                      {coach.position}
                    </p>
                  )}
                  {coach.description && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 300, color: '#666', lineHeight: 1.4 }}>
                      {coach.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '28px' }}>
          <TopicForm
            lessons={lessons}
            onJoin={handleJoin}
            disabled={formDisabled}
          />
        </div>
      </div>

      {/* Joining overlay */}
      {joining && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(255,255,255,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          zIndex: 50,
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e0e0e0',
            borderTopColor: '#E91E63',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontSize: '1rem', color: '#333', fontWeight: 500 }}>Joining Office Hours...</p>
        </div>
      )}

      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #22c55e; }
          50% { opacity: 0.5; box-shadow: 0 0 12px #22c55e; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Lobby;
