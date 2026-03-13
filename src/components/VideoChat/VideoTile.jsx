import React from 'react';
import { useVideoTrack, useAudioTrack, useScreenShare } from '@daily-co/daily-react';

const VideoTile = ({ sessionId, isLocal, userName, isLarge, hideLabel }) => {
  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);

  const videoRef = React.useRef(null);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    if (!videoRef.current || !videoTrack?.persistentTrack) return;
    videoRef.current.srcObject = new MediaStream([videoTrack.persistentTrack]);
  }, [videoTrack?.persistentTrack]);

  React.useEffect(() => {
    if (!audioRef.current || !audioTrack?.persistentTrack || isLocal) return;
    audioRef.current.srcObject = new MediaStream([audioTrack.persistentTrack]);
  }, [audioTrack?.persistentTrack, isLocal]);

  const isVideoOff = videoTrack?.state !== 'playable';

  return (
    <div style={{
      position: 'relative',
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: '#1a1a2e',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {isVideoOff ? (
        <div style={{
          width: isLarge ? '120px' : '64px',
          height: isLarge ? '120px' : '64px',
          borderRadius: '50%',
          backgroundColor: '#7714E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isLarge ? '48px' : '24px',
          fontWeight: 600,
          color: 'white',
        }}>
          {(userName || '?')[0].toUpperCase()}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: isLocal ? 'scaleX(-1)' : undefined,
          }}
        />
      )}

      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}

      {!hideLabel && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          padding: '4px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 500,
        }}>
          {userName || 'Unknown'}{isLocal ? ' (You)' : ''}
        </div>
      )}
    </div>
  );
};

export default VideoTile;
