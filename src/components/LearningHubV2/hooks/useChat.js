import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = 'https://ignite-education-api.onrender.com';

const useChat = () => {
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [displayedText, setDisplayedText] = useState('');

  // Typing animation effect
  useEffect(() => {
    if (typingMessageIndex === null) return;

    const message = chatMessages[typingMessageIndex];
    if (!message || message.isComplete) return;

    const fullText = message.text;
    let currentIndex = 0;
    let pauseCounter = 0;
    let pendingNewline = false;

    const typingInterval = setInterval(() => {
      if (pauseCounter > 0) {
        pauseCounter--;
        return;
      }

      if (currentIndex < fullText.length) {
        if (pendingNewline) {
          pendingNewline = false;
          if (currentIndex + 1 < fullText.length) {
            setDisplayedText(fullText.substring(0, currentIndex + 2));
            currentIndex += 2;
          } else {
            setDisplayedText(fullText.substring(0, currentIndex + 1));
            currentIndex++;
          }
          return;
        }

        setDisplayedText(fullText.substring(0, currentIndex + 1));

        // Pause before newline
        if (currentIndex + 1 < fullText.length && fullText[currentIndex + 1] === '\n') {
          pauseCounter = 15; // ~675ms
          pendingNewline = true;
          currentIndex++;
          return;
        }

        // Pause after sentence-ending punctuation
        if ('.!?'.includes(fullText[currentIndex])) {
          pauseCounter = 7; // ~300ms
        }

        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setChatMessages(prev => prev.map((msg, idx) =>
          idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
        ));
        setTypingMessageIndex(null);
        setDisplayedText('');
      }
    }, 45);

    return () => clearInterval(typingInterval);
  }, [typingMessageIndex, chatMessages]);

  const sendMessage = useCallback(async (text, lessonContext) => {
    const userMessage = text.trim();
    if (!userMessage) return;

    // If a message is currently being typed, mark it as complete
    if (typingMessageIndex !== null) {
      setChatMessages(prev => prev.map((msg, idx) =>
        idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
      ));
      setTypingMessageIndex(null);
      setDisplayedText('');
    }

    // Add user message
    const newMessages = [...chatMessages, { type: 'user', text: userMessage, isComplete: true }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ type: m.type, text: m.text })),
          lessonContext,
        }),
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.success) {
        const newMessageIndex = newMessages.length;
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          text: data.response,
          isComplete: false,
        }]);
        setTypingMessageIndex(newMessageIndex);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      const newMessageIndex = newMessages.length;
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        isComplete: false,
      }]);
      setTypingMessageIndex(newMessageIndex);
    }
  }, [chatMessages, typingMessageIndex]);

  const resetChat = useCallback(() => {
    setChatMessages([]);
    setIsTyping(false);
    setTypingMessageIndex(null);
    setDisplayedText('');
  }, []);

  return {
    chatMessages,
    isTyping,
    displayedText,
    typingMessageIndex,
    sendMessage,
    resetChat,
  };
};

export default useChat;
