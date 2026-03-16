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
          pauseCounter = 15; // ~500ms (matches body text typewriter)
          pendingNewline = true;
          currentIndex++;
          return;
        }

        // Pause after punctuation (matches body text typewriter: 400ms for . , ; : ! ?)
        const ch = fullText[currentIndex];
        const next = fullText[currentIndex + 1];
        if ('.,;:!?'.includes(ch) && (next === ' ' || next === '\n' || currentIndex + 1 === fullText.length)) {
          pauseCounter = 12; // ~400ms at 33ms interval
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
    }, 33);

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

  // Send a scored question answer — calls /api/score-answer, returns { score, feedback }
  const sendScoredMessage = useCallback(async (text, question, sectionContent) => {
    const userMessage = text.trim();
    if (!userMessage) return null;

    if (typingMessageIndex !== null) {
      setChatMessages(prev => prev.map((msg, idx) =>
        idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
      ));
      setTypingMessageIndex(null);
      setDisplayedText('');
    }

    const newMessages = [...chatMessages, { type: 'user', text: userMessage, isComplete: true }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/score-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer: userMessage, sectionContent }),
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.success) {
        const newMessageIndex = newMessages.length;
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          text: data.feedback,
          isComplete: false,
        }]);
        setTypingMessageIndex(newMessageIndex);
        return { score: data.score, feedback: data.feedback };
      } else {
        throw new Error(data.error || 'Failed to score answer');
      }
    } catch (error) {
      console.error('Error scoring answer:', error);
      setIsTyping(false);
      const newMessageIndex = newMessages.length;
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        text: 'Sorry, I encountered an error evaluating your answer. Please try again.',
        isComplete: false,
      }]);
      setTypingMessageIndex(newMessageIndex);
      return null;
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
    sendScoredMessage,
    resetChat,
  };
};

export default useChat;
