import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { logKnowledgeCheck } from '../lib/api';

// API URL for backend calls
const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const KnowledgeCheck = ({ isOpen, onClose, onPass, lessonContext, priorLessonsContext, lessonName, moduleNum, lessonNum, userId, firstName, userRole, nextLessonName, isFirstLesson, courseName }) => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [pendingTypingIndex, setPendingTypingIndex] = useState(null);
  const chatContainerRef = useRef(null);
  const pendingFinalScoreRef = useRef(null);
  const pendingNextQuestionRef = useRef(null);
  const textareaRef = useRef(null);
  const hasCalledOnPassRef = useRef(false);

  // Dynamic question count and pass threshold based on whether it's the first lesson
  const TOTAL_QUESTIONS = isFirstLesson ? 3 : 5;
  const PASS_THRESHOLD = isFirstLesson ? 2 : 4;
  const NUM_PRIOR_QUESTIONS = isFirstLesson ? 0 : 2;

  useEffect(() => {
    if (isOpen && currentQuestionIndex === 0 && chatMessages.length === 0) {
      // Show greeting message first with typing animation after a delay
      setTimeout(() => {
        // Array of different greeting variations
        const greetingVariations = [
          "Great work studying",
          "Excellent job completing",
          "Well done finishing",
          "Fantastic effort studying",
          "Impressive work completing",
          "Strong work finishing"
        ];

        // Select a random greeting
        const randomGreeting = greetingVariations[Math.floor(Math.random() * greetingVariations.length)];

        const lessonNameText = lessonName || "this lesson";
        const greetingText = firstName
          ? `${randomGreeting} ${lessonNameText}, ${firstName}`
          : `${randomGreeting} ${lessonNameText}`;

        // Build the message based on whether it's the first lesson
        let messageText;
        if (isFirstLesson) {
          messageText = `${greetingText}.\n\nI'll now ask you three questions, which you should answer in natural language as if you were talking to a person. Make sure your answers are sufficiently detailed. You will need to answer two or more correctly to pass. If you close this window, you will need to restart.\n\n**Ready to begin?**`;
        } else {
          const courseNameText = courseName || "course";
          const lessonNameText = lessonName || "this lesson";
          messageText = `${greetingText}.\n\nI'll now ask you five questions, which you should answer in natural language as if you were talking to a person. The first two questions are from previous ${courseNameText} content, followed by three questions from ${lessonNameText}. You need to answer four or more correctly to pass.\n\n**Ready to begin?**`;
        }

        setChatMessages([{
          type: 'assistant',
          text: messageText,
          isComplete: false
        }]);
        setPendingTypingIndex(0);
      }, 800);
    }
  }, [isOpen, firstName, lessonName, isFirstLesson, courseName, TOTAL_QUESTIONS, PASS_THRESHOLD]);

  useEffect(() => {
    if (chatContainerRef.current) {
      // Always scroll to bottom when messages change or during typing
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, displayedText]);

  // Handle pending typing animation - start when the message exists in chatMessages
  useEffect(() => {
    if (pendingTypingIndex !== null && chatMessages[pendingTypingIndex]) {
      setTypingMessageIndex(pendingTypingIndex);
      setPendingTypingIndex(null);
    }
  }, [pendingTypingIndex, chatMessages]);

  // Store the text to animate in a ref so we can access it reliably
  const typingTextRef = useRef('');
  const typingIndexRef = useRef(null);
  const animationActiveRef = useRef(false);

  // Typing animation effect
  useEffect(() => {
    if (typingMessageIndex === null) {
      animationActiveRef.current = false;
      return;
    }

    const message = chatMessages[typingMessageIndex];
    if (!message || message.isComplete) {
      animationActiveRef.current = false;
      return;
    }

    const fullText = message.text;
    if (!fullText) {
      animationActiveRef.current = false;
      return;
    }

    // Store the text and index in refs for reliable access
    typingTextRef.current = fullText;
    typingIndexRef.current = typingMessageIndex;
    animationActiveRef.current = true;

    let currentIndex = 0;
    let pauseCounter = 0;
    let pendingNewline = false; // Track if we're waiting to show a newline after pause

    const typingInterval = setInterval(() => {
      // Check if animation should still be running
      if (!animationActiveRef.current) {
        clearInterval(typingInterval);
        return;
      }

      const text = typingTextRef.current;
      const msgIndex = typingIndexRef.current;

      // Check if we need to pause
      if (pauseCounter > 0) {
        pauseCounter--;
        return;
      }

      if (currentIndex < text.length) {
        // After pause completes, show newline + next character together
        if (pendingNewline) {
          pendingNewline = false;
          // currentIndex is at the newline, show it with next char
          if (currentIndex + 1 < text.length) {
            setDisplayedText(text.substring(0, currentIndex + 2));
            currentIndex += 2;
          } else {
            setDisplayedText(text.substring(0, currentIndex + 1));
            currentIndex++;
          }
          return;
        }

        setDisplayedText(text.substring(0, currentIndex + 1));

        // Add pause BEFORE newline (if next char is newline)
        if (currentIndex + 1 < text.length && text[currentIndex + 1] === '\n') {
          pauseCounter = 15; // Pause for ~675ms (15 * 45ms)
          pendingNewline = true;
          currentIndex++; // Move to the newline position
          return;
        }

        // Add pause after sentence-ending punctuation (. ! ?)
        if (text[currentIndex] === '.' || text[currentIndex] === '!' || text[currentIndex] === '?') {
          pauseCounter = 7; // Pause for ~315ms (7 * 45ms)
        }

        currentIndex++;
      } else {
        clearInterval(typingInterval);
        animationActiveRef.current = false;
        // Mark message as complete
        setChatMessages(prev => prev.map((msg, idx) =>
          idx === msgIndex ? { ...msg, isComplete: true } : msg
        ));
        setTypingMessageIndex(null);
        setDisplayedText('');

        // Check if we need to ask the next question after this message completes
        if (pendingNextQuestionRef.current) {
          const answersForNextQ = pendingNextQuestionRef.current;
          pendingNextQuestionRef.current = null;
          // Small delay before asking next question for better UX
          setTimeout(() => {
            askNextQuestion(answersForNextQ);
          }, 500);
        }
        // Check if we need to show final score after this message completes
        else if (pendingFinalScoreRef.current) {
          const answersToScore = pendingFinalScoreRef.current;
          pendingFinalScoreRef.current = null;
          // Small delay before showing results for better UX
          setTimeout(() => {
            calculateFinalScore(answersToScore);
          }, 800);
        }
      }
    }, 45); // Adjust speed here (lower = faster)

    return () => {
      clearInterval(typingInterval);
      animationActiveRef.current = false;
    };
  }, [typingMessageIndex]); // Only depend on typingMessageIndex to avoid resetting animation

  const askNextQuestion = async (updatedAnswers = null) => {
    try {
      // Use the provided answers array or fall back to state
      const currentAnswers = updatedAnswers !== null ? updatedAnswers : answers;
      // Use answers.length + 1 as the question number (more reliable than currentQuestionIndex)
      const questionNum = currentAnswers.length + 1;

      // Determine if this question should be about prior lessons or current lesson
      const isAboutPriorLessons = questionNum <= NUM_PRIOR_QUESTIONS;

      const response = await fetch(`${API_URL}/api/knowledge-check/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonContext,
          priorLessonsContext,
          questionNumber: questionNum,
          totalQuestions: TOTAL_QUESTIONS,
          previousQA: currentAnswers,
          isAboutPriorLessons,
          numPriorQuestions: NUM_PRIOR_QUESTIONS,
          useBritishEnglish: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChatMessages(prev => {
          const newMessageIndex = prev.length;
          setPendingTypingIndex(newMessageIndex);
          return [...prev, {
            type: 'assistant',
            text: `${questionNum}. ${data.question}`,
            isComplete: false,
            isQuestion: true
          }];
        });
      } else {
        throw new Error(data.error || 'Failed to get question');
      }
    } catch (error) {
      console.error('Error getting question:', error);
      setChatMessages(prev => {
        const newMessageIndex = prev.length;
        setPendingTypingIndex(newMessageIndex);
        return [...prev, {
          type: 'assistant',
          text: 'Sorry, I encountered an error getting the next question. Please try again! 😊',
          isComplete: false
        }];
      });
    }
  };

  const evaluateAnswer = async (userAnswer) => {
    setIsEvaluating(true);

    try {
      const response = await fetch(`${API_URL}/api/knowledge-check/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonContext,
          question: chatMessages[chatMessages.length - 1].text,
          answer: userAnswer,
          useBritishEnglish: true,
          feedbackInstructions: "MAXIMUM 3 SENTENCES TOTAL for all feedback. FOR INCORRECT/UNSURE: One sentence acknowledging, then 1-2 sentences with the correct answer. FOR CORRECT: 1-2 sentences of praise only. BANNED PHRASES: 'Let me explain', 'Let me provide', 'Let me clarify', 'I'd be happy to', 'I apologize', 'The question asked about'. NEVER use bullet points, dashes (-), or lists. Write as flowing prose only. No offers to help further. No apologies.",
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newAnswer = {
          question: chatMessages[chatMessages.length - 1].text,
          answer: userAnswer,
          isCorrect: data.isCorrect,
          feedback: data.feedback,
        };

        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        // Show feedback with typing animation
        setChatMessages(prev => {
          const newMessageIndex = prev.length;
          setPendingTypingIndex(newMessageIndex);
          return [...prev, {
            type: 'assistant',
            text: data.feedback,
            isComplete: false
          }];
        });

        // Move to next question or finish - wait for typing animation to complete
        if (currentQuestionIndex + 1 < TOTAL_QUESTIONS) {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          // Store answers and wait for typing animation to complete before asking next question
          pendingNextQuestionRef.current = updatedAnswers;
        } else {
          // All questions answered - store answers and wait for typing animation to complete
          // The final score will be calculated after the feedback message finishes typing
          pendingFinalScoreRef.current = updatedAnswers;
        }
      } else {
        throw new Error(data.error || 'Failed to evaluate answer');
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      setChatMessages(prev => {
        const newMessageIndex = prev.length;
        setPendingTypingIndex(newMessageIndex);
        return [...prev, {
          type: 'assistant',
          text: 'Sorry, I encountered an error evaluating your answer. Please try again! 😊',
          isComplete: false
        }];
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const calculateFinalScore = async (allAnswers) => {
    const correctCount = allAnswers.filter(a => a.isCorrect).length;
    setScore(correctCount);
    setIsComplete(true);

    const passed = correctCount >= PASS_THRESHOLD;

    // Log the knowledge check results
    try {
      const courseId = 'product-manager';
      const userIdToLog = userId || 'temp-user-id';

      await logKnowledgeCheck(
        userIdToLog,
        courseId,
        moduleNum,
        lessonNum,
        correctCount,
        TOTAL_QUESTIONS,
        passed,
        allAnswers
      );

      console.log(`✅ Knowledge check logged: ${correctCount}/${TOTAL_QUESTIONS} (${passed ? 'PASSED' : 'FAILED'})`);
      // Note: onPass will be called when user clicks Proceed or closes the modal
    } catch (error) {
      console.error('Error logging knowledge check:', error);
      // Continue anyway - don't block the user experience
    }

    // Show final result message
    const nextLessonText = nextLessonName || 'the next lesson';
    setChatMessages(prev => {
      if (passed) {
        // For passed messages, don't use typing animation - show immediately
        return [...prev, {
          type: 'assistant',
          text: '',
          isComplete: true,
          isPassed: true,
          score: `${correctCount}/${TOTAL_QUESTIONS}`,
          congratsLine1: 'Congratulations!',
          congratsLine2: `You've passed this lesson and can now move on`,
          congratsLine3: `to ${nextLessonText}.`
        }];
      } else {
        // For failed messages, don't use typing animation - show immediately like passed
        return [...prev, {
          type: 'assistant',
          text: '',
          isComplete: true,
          isPassed: false,
          isFailed: true,
          score: `${correctCount}/${TOTAL_QUESTIONS}`,
          failedLine1: 'Almost.',
          failedLine2: "You haven't met the pass mark for the lesson.",
          failedLine3: "Please re-visit the lesson content and try again."
        }];
      }
    });

    // Force scroll to bottom after result message appears so user can see it fully
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isEvaluating || isComplete) return;

    const userAnswer = chatInput;

    // Add user message
    setChatMessages(prev => [...prev, { type: 'user', text: userAnswer }]);
    setChatInput('');
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // If this is the first message (response to greeting), start asking questions
    if (chatMessages.length === 1 && currentQuestionIndex === 0) {
      await askNextQuestion();
      return;
    }

    // Check if user typed "skip" and has permission to skip (admin or student role)
    if (userAnswer.toLowerCase().trim() === 'skip' && (userRole === 'admin' || userRole === 'student')) {
      // Skip the current question without evaluation
      const skippedAnswer = {
        question: chatMessages[chatMessages.length - 1].text,
        answer: '[Skipped]',
        isCorrect: true,
        feedback: 'Question skipped.',
      };

      const updatedAnswers = [...answers, skippedAnswer];
      setAnswers(updatedAnswers);

      // Move to next question or finish immediately without showing skip message
      if (currentQuestionIndex + 1 < TOTAL_QUESTIONS) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        askNextQuestion(updatedAnswers);
      } else {
        // All questions answered, calculate final score
        calculateFinalScore(updatedAnswers);
      }
      return;
    }

    // Evaluate the answer normally
    await evaluateAnswer(userAnswer);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      // If user passed and hasn't already triggered onPass, call it now
      if (isComplete && score >= PASS_THRESHOLD && !hasCalledOnPassRef.current) {
        hasCalledOnPassRef.current = true;
        onPass();
      }

      // Reset all quiz state
      setChatMessages([]);
      setChatInput('');
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setIsEvaluating(false);
      setIsComplete(false);
      setScore(null);
      setTypingMessageIndex(null);
      setDisplayedText('');
      pendingFinalScoreRef.current = null;
      pendingNextQuestionRef.current = null;
      hasCalledOnPassRef.current = false;

      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleRetake = () => {
    // Reset all state
    setChatMessages([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setIsComplete(false);
    setScore(null);
    pendingFinalScoreRef.current = null;
    pendingNextQuestionRef.current = null;
    hasCalledOnPassRef.current = false;
    // Start over
    askNextQuestion();
  };

  const handleProceed = () => {
    if (score >= PASS_THRESHOLD && !hasCalledOnPassRef.current) {
      hasCalledOnPassRef.current = true;
      onPass();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-knowledge-check
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn"
      style={{
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))',
        animation: isClosing ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out'
      }}
      onClick={handleClose}
    >
      <div className="relative">
        {/* Title and close button row - above the box */}
        <div className="flex justify-between items-center" style={{ marginBottom: '0.15rem' }}>
          <h2 className="text-xl font-semibold text-white pl-1">
            Knowledge Check
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 z-10"
          >
            <X size={24} />
          </button>
        </div>

        <div
          className="bg-white relative flex flex-col"
          style={{
            width: '600px',
            height: '65vh',
            maxHeight: '600px',
            animation: isClosing ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
            borderRadius: '0.3rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* Chat messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-8 py-8 hide-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex flex-col min-h-full justify-end">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={msg.type === 'user' ? 'flex justify-end' : ''}
                style={{ marginBottom: idx < chatMessages.length - 1 ? '0.75rem' : '0' }}
              >
                {msg.type === 'assistant' ? (
                  msg.isPassed ? (
                    // Special layout for passed message: left column (35%) with icon + score stacked | right column (65%) with congrats on two lines
                    <div className="text-black text-sm leading-snug flex items-center" style={{
                      borderRadius: '8px',
                      backgroundColor: '#f3f4f6',
                      width: '100%',
                      padding: '1rem 0.75rem',
                      minHeight: '5rem',
                      animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}>
                      <div className="flex flex-col items-center justify-center" style={{ width: '35%', flexShrink: 0 }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#22c55e' }}>
                          <Check size={14} strokeWidth={3} style={{ color: '#f3f4f6' }} />
                        </div>
                        <span className="font-semibold mt-1">You scored {msg.score}</span>
                      </div>
                      <div className="flex flex-col justify-center" style={{ width: '65%' }}>
                        <p className="font-semibold">{msg.congratsLine1}</p>
                        <p style={{ marginTop: '2px' }}>{msg.congratsLine2}</p>
                        <p style={{ marginTop: '2px' }}>{msg.congratsLine3}</p>
                      </div>
                    </div>
                  ) : msg.isFailed ? (
                    // Special layout for failed message: left column (35%) with orange X icon + score stacked | right column (65%) with "Almost" message
                    <div className="text-black text-sm leading-snug flex items-center" style={{
                      borderRadius: '8px',
                      backgroundColor: '#f3f4f6',
                      width: '100%',
                      padding: '1rem 0.75rem',
                      minHeight: '5rem',
                      animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}>
                      <div className="flex flex-col items-center justify-center" style={{ width: '35%', flexShrink: 0 }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: '#f97316' }}>
                          <X size={14} strokeWidth={3} style={{ color: '#f3f4f6' }} />
                        </div>
                        <span className="font-semibold mt-1">You scored {msg.score}</span>
                      </div>
                      <div className="flex flex-col justify-center" style={{ width: '65%' }}>
                        <p className="font-semibold">{msg.failedLine1}</p>
                        <p style={{ marginTop: '2px' }}>{msg.failedLine2}</p>
                        <p style={{ marginTop: '2px' }}>{msg.failedLine3}</p>
                      </div>
                    </div>
                  ) : (
                    // Regular assistant message
                    <div className={`p-3 text-black text-sm leading-snug inline-block max-w-[95%] ${msg.isQuestion ? 'font-semibold' : ''}`} style={{
                      borderRadius: '8px',
                      backgroundColor: '#f3f4f6',
                      animation: 'slideUp 0.25s ease-out forwards'
                    }}>
                      <div>
                        {(typingMessageIndex === idx && !msg.isComplete ? displayedText : msg.text).split('\n').map((line, i) => {
                          // Parse bold markers, handling incomplete ones during typing
                          const parseBoldText = (text) => {
                            const result = [];
                            let remaining = text;
                            let key = 0;

                            while (remaining.length > 0) {
                              const boldStart = remaining.indexOf('**');

                              if (boldStart === -1) {
                                // No more bold markers
                                if (remaining) result.push(<span key={key++}>{remaining}</span>);
                                break;
                              }

                              // Add text before the bold marker
                              if (boldStart > 0) {
                                result.push(<span key={key++}>{remaining.substring(0, boldStart)}</span>);
                              }

                              // Find the closing **
                              const afterStart = remaining.substring(boldStart + 2);
                              const boldEnd = afterStart.indexOf('**');

                              if (boldEnd === -1) {
                                // No closing ** yet (typing in progress) - render as bold without the **
                                // Strip trailing * to avoid flash when typing the closing **
                                const textToShow = afterStart.endsWith('*') ? afterStart.slice(0, -1) : afterStart;
                                result.push(<strong key={key++} className="font-semibold">{textToShow}</strong>);
                                break;
                              } else {
                                // Complete bold section
                                result.push(<strong key={key++} className="font-semibold">{afterStart.substring(0, boldEnd)}</strong>);
                                remaining = afterStart.substring(boldEnd + 2);
                              }
                            }

                            return result;
                          };

                          return (
                            <p key={i} className={i > 0 ? 'mt-3' : ''}>
                              {parseBoldText(line)}
                            </p>
                          );
                        })}
                        {/* Show bold suffix instantly when message is complete */}
                        {msg.boldSuffix && msg.isComplete && (
                          <p className="mt-3 font-semibold">{msg.boldSuffix}</p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-3 text-white text-sm max-w-[95%] inline-block" style={{
                    borderRadius: '8px',
                    backgroundColor: '#7c3aed',
                    animation: 'slideUp 0.25s ease-out forwards'
                  }}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}

            {isEvaluating && (
              <div style={{ marginTop: '1rem' }}>
                <div className="p-3 text-black text-sm inline-block" style={{
                  borderRadius: '8px',
                  backgroundColor: '#f3f4f6',
                  animation: 'slideUp 0.25s ease-out forwards'
                }}>
                  <div className="flex" style={{ gap: '3px' }}>
                    <span className="bg-gray-400 rounded-full animate-bounce" style={{ width: '6.8px', height: '6.8px', animationDelay: '0ms' }}></span>
                    <span className="bg-gray-400 rounded-full animate-bounce" style={{ width: '6.8px', height: '6.8px', animationDelay: '150ms' }}></span>
                    <span className="bg-gray-400 rounded-full animate-bounce" style={{ width: '6.8px', height: '6.8px', animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 bg-gray-100 p-3" style={{ borderRadius: '0 0 0.3rem 0.3rem', height: isComplete ? '68px' : 'auto' }}>
            {!isComplete ? (
              <form onSubmit={handleSendMessage} style={{ marginBottom: '0px' }}>
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    autoResizeTextarea();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="type your answer here"
                  disabled={isEvaluating}
                  rows={1}
                  className="w-full bg-gray-100 px-5 text-sm text-center focus:outline-none placeholder-gray-500 text-black caret-gray-500 disabled:opacity-50 resize-none"
                  style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem', marginBottom: '8px', overflow: 'hidden' }}
                />
                <button
                  type="submit"
                  disabled={isEvaluating || !chatInput.trim()}
                  className="w-full text-white px-4 py-2 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: '0.3rem', fontSize: '0.85rem', backgroundColor: '#7714E0' }}
                  onMouseEnter={(e) => !isEvaluating && chatInput.trim() && (e.currentTarget.style.backgroundColor = '#6610C7')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7714E0'}
                >
                  {isEvaluating ? 'Evaluating...' : 'Submit'}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center h-full">
                {score >= PASS_THRESHOLD ? (
                  <button
                    onClick={handleProceed}
                    className="w-full text-white px-4 py-2 font-semibold transition"
                    style={{ borderRadius: '0.3rem', fontSize: '0.85rem', backgroundColor: '#EF0B72' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#D90A65'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#EF0B72'}
                  >
                    {nextLessonName ? `Proceed to ${nextLessonName}` : 'Proceed to Next Lesson'}
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="w-full text-white px-4 py-2 font-semibold transition"
                    style={{ borderRadius: '1rem', fontSize: '0.85rem', backgroundColor: '#7714E0' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#6610C7'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#7714E0'}
                  >
                    {lessonName ? `Back to ${lessonName}` : 'Back to Content'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeCheck;
