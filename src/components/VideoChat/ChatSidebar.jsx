import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDaily, useAppMessage } from '@daily-co/daily-react';
import { ArrowUp } from 'lucide-react';

const ChatSidebar = ({ onClose, localUserName, onMessagesChange }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const daily = useDaily();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Only auto-scroll when new messages arrive, not on initial mount
  const hasMessages = useRef(false);
  useEffect(() => {
    if (messages.length > 0) {
      hasMessages.current = true;
      scrollToBottom();
    }
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
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'transparent',
      borderRadius: '8px',
      flex: 1,
      minHeight: 0,
    }}>
      {/* Header */}
      <div style={{ margin: '0 0 12px', flexShrink: 0 }}>
        <h3 style={{ color: '#333', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Chat</h3>
      </div>

      {/* Chat body — grows to fill available space */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Messages — scrollable, fills remaining space above input */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: 0,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.isLocal ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}>
              {!msg.isLocal && (
                <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', marginBottom: '2px', display: 'block' }}>
                  {msg.sender}
                </span>
              )}
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#F6F6F6',
                color: '#000',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '-0.01em',
                lineHeight: '1.4',
                wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.25)', marginTop: '2px', display: 'block', textAlign: msg.isLocal ? 'right' : 'left' }}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input — pinned at bottom */}
        <div style={{ flexShrink: 0, paddingTop: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 4px 4px 14px',
            borderRadius: '10px',
            backgroundColor: 'white',
            boxShadow: '0 0 10px rgba(103,103,103,0.6)',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              style={{
                flex: 1,
                padding: '6px 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#000',
                caretColor: '#EF0B72',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              onMouseEnter={(e) => { if (input.trim()) e.currentTarget.style.color = '#EF0B72'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'black'; }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'black',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s',
                flexShrink: 0,
              }}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
