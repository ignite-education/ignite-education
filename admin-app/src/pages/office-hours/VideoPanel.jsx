import { useState, useRef, useEffect, useCallback } from 'react';
import {
  useDaily,
  useLocalParticipant,
  useParticipantIds,
  useVideoTrack,
  useAudioTrack,
  useAppMessage,
  useScreenShare,
} from '@daily-co/daily-react';
import { Mic, MicOff, Video, VideoOff, Monitor, Phone, ArrowUp } from 'lucide-react';

// --- Video Tile ---
const VideoTile = ({ sessionId, isLocal, userName, isLarge }) => {
  const videoTrack = useVideoTrack(sessionId);
  const audioTrack = useAudioTrack(sessionId);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !videoTrack?.persistentTrack) return;
    videoRef.current.srcObject = new MediaStream([videoTrack.persistentTrack]);
  }, [videoTrack?.persistentTrack]);

  useEffect(() => {
    if (!audioRef.current || !audioTrack?.persistentTrack || isLocal) return;
    audioRef.current.srcObject = new MediaStream([audioTrack.persistentTrack]);
  }, [audioTrack?.persistentTrack, isLocal]);

  const isVideoOff = videoTrack?.state !== 'playable';

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-900 w-full h-full flex items-center justify-center">
      {isVideoOff ? (
        <div className={`${isLarge ? 'w-24 h-24 text-4xl' : 'w-14 h-14 text-xl'} rounded-full bg-purple-600 flex items-center justify-center font-semibold text-white`}>
          {(userName || '?')[0].toUpperCase()}
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : undefined }}
        />
      )}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
        {userName || 'Unknown'}{isLocal ? ' (You)' : ''}
      </div>
    </div>
  );
};

// --- Control Bar ---
const ControlBar = ({ onLeave }) => {
  const daily = useDaily();
  const localParticipant = useLocalParticipant();
  const { isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();

  const isMuted = !localParticipant?.audio;
  const isCameraOff = !localParticipant?.video;

  const toggleMute = () => daily?.setLocalAudio(!localParticipant?.audio);
  const toggleCamera = () => daily?.setLocalVideo(!localParticipant?.video);
  const toggleScreen = () => isSharingScreen ? stopScreenShare() : startScreenShare();

  const btnClass = (active, danger) =>
    `w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${
      danger ? 'bg-red-500 text-white' :
      active ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
    }`;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} className={btnClass(isMuted)}>
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <button onClick={toggleCamera} title={isCameraOff ? 'Camera on' : 'Camera off'} className={btnClass(isCameraOff)}>
        {isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
      </button>
      <button onClick={toggleScreen} title={isSharingScreen ? 'Stop sharing' : 'Share screen'}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${isSharingScreen ? 'bg-purple-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
        <Monitor size={16} />
      </button>
      <div className="w-px h-6 bg-white/15 mx-1" />
      <button onClick={onLeave} title="End session"
        className="w-11 h-10 rounded-full bg-red-500 text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer">
        <Phone size={16} style={{ transform: 'rotate(135deg)' }} />
      </button>
    </div>
  );
};

// --- Chat Panel ---
const ChatPanel = ({ coachName, onMessagesChange }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const daily = useDaily();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  useAppMessage({
    onAppMessage: useCallback((event) => {
      if (event?.data?.type === 'chat') {
        setMessages(prev => [...prev, {
          text: event.data.text,
          sender: event.data.sender,
          timestamp: new Date(),
          isLocal: false,
        }]);
      }
    }, []),
  });

  const handleSend = () => {
    const text = input.trim();
    if (!text || !daily) return;
    daily.sendAppMessage({ type: 'chat', text, sender: coachName }, '*');
    setMessages(prev => [...prev, { text, sender: coachName, timestamp: new Date(), isLocal: true }]);
    setInput('');
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <h4 className="text-sm font-medium text-gray-400 mb-2 flex-shrink-0">Chat</h4>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs">No messages yet</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}>
            {!msg.isLocal && <span className="text-[10px] text-gray-500 mb-0.5">{msg.sender}</span>}
            <div className={`px-3 py-1.5 rounded-lg text-sm max-w-[85%] break-words ${
              msg.isLocal ? 'bg-purple-600/30 text-gray-200' : 'bg-gray-700 text-gray-200'
            }`}>
              {msg.text}
            </div>
            <span className="text-[10px] text-gray-600 mt-0.5">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 pt-2">
        <div className="flex items-center gap-1.5 bg-gray-700 rounded-lg px-3 py-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-gray-400 hover:text-purple-400 transition-colors disabled:opacity-30"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main VideoPanel ---
const VideoPanel = ({ onLeave, coachName, onChatMessagesChange }) => {
  const localParticipant = useLocalParticipant();
  const remoteIds = useParticipantIds({ filter: 'remote' });
  const daily = useDaily();

  // Auto-join on mount
  useEffect(() => {
    if (daily && daily.meetingState() === 'new') {
      daily.join().catch(err => console.error('Failed to join call:', err));
    }
  }, [daily]);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden flex flex-col" style={{ height: '520px' }}>
      {/* Video tiles */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-1 p-1">
        {localParticipant && (
          <VideoTile
            sessionId={localParticipant.session_id}
            isLocal
            userName={coachName}
            isLarge={remoteIds.length === 0}
          />
        )}
        {remoteIds.length > 0 ? (
          remoteIds.map(id => (
            <VideoTile key={id} sessionId={id} userName="Student" isLarge />
          ))
        ) : (
          <div className="rounded-xl bg-gray-900 flex items-center justify-center text-gray-600 text-sm">
            Waiting for student...
          </div>
        )}
      </div>

      {/* Control bar */}
      <ControlBar onLeave={onLeave} />

      {/* Chat */}
      <div className="border-t border-gray-700/50 px-3 py-2 flex flex-col" style={{ height: '180px' }}>
        <ChatPanel coachName={coachName} onMessagesChange={onChatMessagesChange} />
      </div>
    </div>
  );
};

export default VideoPanel;
