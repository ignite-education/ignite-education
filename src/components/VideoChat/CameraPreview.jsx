import React, { useState, useRef, useCallback } from 'react';
import { Camera, Check } from 'lucide-react';

const CameraPreview = ({ onReadyChange, highlight, endTimeFormatted }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const requestMedia = useCallback(async () => {
    setRequesting(true);
    setHasRequested(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState === 'live';
      const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].readyState === 'live';

      setCameraReady(hasVideo);
      setMicReady(hasAudio);
      onReadyChange({ camera: hasVideo, mic: hasAudio });
    } catch (err) {
      console.error('Media access error:', err);
      setCameraReady(false);
      setMicReady(false);
      onReadyChange({ camera: false, mic: false });

      if (err.name === 'NotAllowedError') {
        setError('Camera and microphone access was blocked. Please allow access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone detected.');
      } else {
        setError('Could not access camera or microphone.');
      }
    } finally {
      setRequesting(false);
    }
  }, [onReadyChange]);

  // Expose stop method for parent to call before Daily.co takes over
  CameraPreview.stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const StatusIndicator = ({ label, ready }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '16px', height: '16px', flexShrink: 0 }}>
        {ready && <Check size={16} color="#16a34a" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: '0.9rem', fontWeight: 300, color: '#333', letterSpacing: '-0.01em' }}>{label}</span>
    </div>
  );

  return (
    <div>
      {/* Status row: Live indicator left, Camera/Microphone right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        {endTimeFormatted ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '6.4px',
              height: '6.4px',
              borderRadius: '50%',
              backgroundColor: '#16a34a',
              boxShadow: '0 0 5px #16a34a',
              position: 'relative',
              top: '1px',
              animation: 'pulse-green 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '0.9rem', color: '#000', fontWeight: 300, letterSpacing: '-0.01em' }}>
              Live Now till {endTimeFormatted}
            </span>
          </div>
        ) : <div />}
        <div style={{ display: 'flex', gap: '35px' }}>
          <StatusIndicator label="Camera" ready={cameraReady} />
          <StatusIndicator label="Microphone" ready={micReady} />
        </div>
      </div>

      {/* Video preview */}
      <div
        onClick={!hasRequested && !requesting ? requestMedia : undefined}
        style={{
          width: '100%',
          height: '40vh',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative',
          border: 'none',
          outline: '0.5px solid',
          outlineColor: highlight ? '#EF0B72' : 'transparent',
          transition: 'outline-color 0.6s ease',
          cursor: !hasRequested && !requesting ? 'pointer' : 'default',
        }}
      >
        {error ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            gap: '12px',
          }}>
            <Camera size={32} color="#000" strokeWidth={1} />
            <p style={{ fontSize: '0.85rem', color: '#666', margin: 0, lineHeight: 1.4 }}>{error}</p>
            <button
              onClick={requestMedia}
              style={{
                padding: '6px 16px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                color: '#333',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        ) : (requesting || !hasRequested) ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}>
            <Camera size={32} color="#000" strokeWidth={1} />
            <p style={{ fontSize: '0.9rem', fontWeight: 300, letterSpacing: '-0.01em', color: '#000', margin: 0, textAlign: 'center' }}>Click to enable camera and<br />microphone permissions</p>
          </div>
        ) : null}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: cameraReady ? 'block' : 'none',
          }}
        />
      </div>
    </div>
  );
};

export default CameraPreview;
