import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDaily, useAppMessage } from '@daily-co/daily-react';
import { Send, X } from 'lucide-react';

const ChatSidebar = ({ onClose, localUserName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const daily = useDaily();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

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

    daily.sendAppMessage({ type: 'chat', text, sender: localUserName }, '*');
    setMessages(prev => [...prev, {
      text,
      sender: localUserName,
      timestamp: new Date(),
      isLocal: true,
    }]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      width: '320px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#12121f',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ color: 'white', fontSize: '15px', fontWeight: 600 }}>Chat</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>
            No messages yet
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.isLocal ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
          }}>
            {!msg.isLocal && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px', display: 'block' }}>
                {msg.sender}
              </span>
            )}
            <div style={{
              padding: '8px 12px',
              borderRadius: msg.isLocal ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              backgroundColor: msg.isLocal ? '#7714E0' : 'rgba(255,255,255,0.08)',
              color: 'white',
              fontSize: '14px',
              lineHeight: '1.4',
              wordBreak: 'break-word',
            }}>
              {msg.text}
            </div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px', display: 'block', textAlign: msg.isLocal ? 'right' : 'left' }}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: '8px',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'white',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: input.trim() ? '#7714E0' : 'rgba(255,255,255,0.05)',
            color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatSidebar;
