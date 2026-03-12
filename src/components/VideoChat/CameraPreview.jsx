import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Mic, Check, X } from 'lucide-react';

const CameraPreview = ({ onReadyChange }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(true);

  const requestMedia = useCallback(async () => {
    setRequesting(true);
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

  useEffect(() => {
    requestMedia();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [requestMedia]);

  // Expose stop method for parent to call before Daily.co takes over
  useEffect(() => {
    CameraPreview.stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
    return () => { CameraPreview.stopStream = null; };
  }, []);

  const StatusIndicator = ({ label, icon: Icon, ready }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={16} color="#333" />
      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#333' }}>{label}</span>
      {ready ? (
        <Check size={16} color="#22c55e" strokeWidth={3} />
      ) : (
        <X size={16} color="#ef4444" strokeWidth={3} />
      )}
    </div>
  );

  return (
    <div>
      {/* Status indicators */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
        <StatusIndicator label="Camera" icon={Camera} ready={cameraReady} />
        <StatusIndicator label="Microphone" icon={Mic} ready={micReady} />
      </div>

      {/* Video preview */}
      <div style={{
        width: '100%',
        aspectRatio: '16 / 10',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid #e5e5e5',
      }}>
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
            <Camera size={32} color="#999" />
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
        ) : requesting ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#999' }}>Requesting camera access...</p>
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
