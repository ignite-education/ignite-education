import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = 'https://ignite-education-api.onrender.com';

const useChat = () => {
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [chatRemainingLine, setChatRemainingLine] = useState('');

  // Assigned every render, so even a callback captured in an older closure reads
  // the current list. `pushAssistantMessage` needs this: the checkpoint retake
  // path calls `resetChat()`, awaits the server, then pushes — and a closure-
  // captured `chatMessages.length` would still be the pre-reset length, sending
  // the typewriter at an index that no longer exists.
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;

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
          setChatRemainingLine(fullText.slice(currentIndex).split('\n')[0]);
          return;
        }

        setDisplayedText(fullText.substring(0, currentIndex + 1));
        setChatRemainingLine(fullText.slice(currentIndex + 1).split('\n')[0]);

        // Pause before newline
        if (currentIndex + 1 < fullText.length && fullText[currentIndex + 1] === '\n') {
          pauseCounter = 13; // ~500ms (matches body text typewriter)
          pendingNewline = true;
          currentIndex++;
          return;
        }

        // Pause after punctuation (matches body text typewriter: 400ms for . , ; : ! ?)
        const ch = fullText[currentIndex];
        const next = fullText[currentIndex + 1];
        if ('.,;:!?()'.includes(ch) && (next === ' ' || next === '\n' || currentIndex + 1 === fullText.length)) {
          pauseCounter = 11; // ~400ms at 38ms interval
        }

        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setChatMessages(prev => prev.map((msg, idx) =>
          idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
        ));
        setTypingMessageIndex(null);
        setDisplayedText('');
        setChatRemainingLine('');
      }
    }, 38);

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
      setChatRemainingLine('');
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

  /**
   * Post the student's answer, run `grade` on it, then type out the feedback.
   *
   * `grade` does the marking. For the lesson checkpoint that's a server round-trip
   * that also decides whether the lesson completes, so this hook deliberately
   * knows nothing about scoring — it owns the message list and the animation only.
   *
   * Resolves to whatever `grade` returned, or null if it threw.
   */
  const sendGradedMessage = useCallback(async (text, grade) => {
    const userMessage = text.trim();
    if (!userMessage) return null;

    if (typingMessageIndex !== null) {
      setChatMessages(prev => prev.map((msg, idx) =>
        idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
      ));
      setTypingMessageIndex(null);
      setDisplayedText('');
      setChatRemainingLine('');
    }

    const newMessages = [...chatMessages, { type: 'user', text: userMessage, isComplete: true }];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const result = await grade(userMessage);
      setIsTyping(false);

      const newMessageIndex = newMessages.length;
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        text: result?.feedback || '',
        isComplete: false,
      }]);
      setTypingMessageIndex(newMessageIndex);
      return result;
    } catch (error) {
      console.error('Error grading answer:', error);
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
    setChatRemainingLine('');
  }, []);

  /**
   * Type out an assistant message the caller already has — the checkpoint's first
   * question, which nobody prompted for, and so has no user turn before it.
   */
  const pushAssistantMessage = useCallback((text) => {
    setIsTyping(false);
    const newMessageIndex = chatMessagesRef.current.length;
    setChatMessages(prev => [...prev, { type: 'assistant', text, isComplete: false }]);
    setTypingMessageIndex(newMessageIndex);
  }, []);

  return {
    chatMessages,
    isTyping,
    displayedText,
    chatRemainingLine,
    typingMessageIndex,
    sendMessage,
    sendGradedMessage,
    pushAssistantMessage,
    resetChat,
  };
};

export default useChat;
