import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, Phone, MessageSquare } from 'lucide-react';

const ControlBar = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isChatOpen,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
  isCoach,
}) => {
  const buttonBase = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s, transform 0.1s',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '16px 24px',
      background: '#1a1a2e',
      borderRadius: '16px',
    }}>
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        style={{
          ...buttonBase,
          backgroundColor: isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)',
          color: 'white',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      <button
        onClick={onToggleCamera}
        title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        style={{
          ...buttonBase,
          backgroundColor: isCameraOff ? '#ef4444' : 'rgba(255,255,255,0.1)',
          color: 'white',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
      </button>

      <button
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        style={{
          ...buttonBase,
          backgroundColor: isScreenSharing ? '#7714E0' : 'rgba(255,255,255,0.1)',
          color: 'white',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Monitor size={20} />
      </button>

      <button
        onClick={onToggleChat}
        title={isChatOpen ? 'Close chat' : 'Open chat'}
        style={{
          ...buttonBase,
          backgroundColor: isChatOpen ? '#7714E0' : 'rgba(255,255,255,0.1)',
          color: 'white',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={20} />
      </button>

      <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

      <button
        onClick={onLeave}
        title={isCoach ? 'End session' : 'Leave session'}
        style={{
          ...buttonBase,
          width: '56px',
          backgroundColor: '#ef4444',
          color: 'white',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Phone size={20} style={{ transform: 'rotate(135deg)' }} />
      </button>
    </div>
  );
};

export default ControlBar;
