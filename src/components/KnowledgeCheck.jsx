import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { logKnowledgeCheck } from '../lib/api';

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
  const chatContainerRef = useRef(null);

  // Dynamic question count and pass threshold based on whether it's the first lesson
  const TOTAL_QUESTIONS = isFirstLesson ? 5 : 7;
  const PASS_THRESHOLD = isFirstLesson ? 4 : 5;
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
          "Nice work working through",
          "Fantastic effort studying",
          "Impressive work completing",
          "Strong work finishing"
        ];

        // Select a random greeting
        const randomGreeting = greetingVariations[Math.floor(Math.random() * greetingVariations.length)];

        const greetingText = firstName
          ? `${randomGreeting}, ${firstName}`
          : `${randomGreeting}`;

        // Build the message based on whether it's the first lesson
        let messageText;
        if (isFirstLesson) {
          messageText = `${greetingText}.\n\nI'll now ask you 5 questions, which you should answer in natural language as if you were talking to a person. Make sure your answers are sufficiently detailed, and that you answer the question asked. You will need to score 80% or above to pass. If you close this window, you will need to restart.\n\nReady to begin?`;
        } else {
          const courseNameText = courseName || "course";
          const lessonNameText = lessonName || "this lesson";
          messageText = `${greetingText}.\n\nI'll now ask you seven questions, which you should answer in natural language as if you were talking to a person. The first two questions are from previous ${courseNameText} content, followed by five questions from ${lessonNameText}. You need to answer five or more correctly to pass. If you close this window, you will need to restart.\n\nReady to begin?`;
        }

        setChatMessages([{
          type: 'assistant',
          text: messageText,
          isComplete: false
        }]);
        setTimeout(() => {
          setTypingMessageIndex(0);
        }, 0);
      }, 800);
    }
  }, [isOpen, firstName, lessonName, isFirstLesson, courseName, TOTAL_QUESTIONS, PASS_THRESHOLD]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive or during typing
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, displayedText]);

  // Typing animation effect
  useEffect(() => {
    if (typingMessageIndex === null) return;

    const message = chatMessages[typingMessageIndex];
    if (!message || message.isComplete) return;

    const fullText = message.text;
    let currentIndex = 0;
    let pauseCounter = 0;

    const typingInterval = setInterval(() => {
      // Check if we need to pause (at newline characters)
      if (pauseCounter > 0) {
        pauseCounter--;
        return;
      }

      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));

        // Add pause after newline characters
        if (fullText[currentIndex] === '\n') {
          pauseCounter = 15; // Pause for ~675ms (15 * 45ms)
        }

        // Add pause after sentence-ending punctuation (. ! ?)
        if (fullText[currentIndex] === '.' || fullText[currentIndex] === '!' || fullText[currentIndex] === '?') {
          pauseCounter = 7; // Pause for ~315ms (7 * 45ms)
        }

        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // Mark message as complete
        setChatMessages(prev => prev.map((msg, idx) =>
          idx === typingMessageIndex ? { ...msg, isComplete: true } : msg
        ));
        setTypingMessageIndex(null);
        setDisplayedText('');
      }
    }, 45); // Adjust speed here (lower = faster)

    return () => clearInterval(typingInterval);
  }, [typingMessageIndex]); // Only depend on typingMessageIndex, not chatMessages

  const askNextQuestion = async (updatedAnswers = null) => {
    try {
      // Use the provided answers array or fall back to state
      const currentAnswers = updatedAnswers !== null ? updatedAnswers : answers;
      // Use answers.length + 1 as the question number (more reliable than currentQuestionIndex)
      const questionNum = currentAnswers.length + 1;

      // Determine if this question should be about prior lessons or current lesson
      const isAboutPriorLessons = questionNum <= NUM_PRIOR_QUESTIONS;

      const response = await fetch('https://ignite-education-api.onrender.com/api/knowledge-check/question', {
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
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChatMessages(prev => {
          const newMessageIndex = prev.length;
          setTimeout(() => setTypingMessageIndex(newMessageIndex), 0);
          return [...prev, {
            type: 'assistant',
            text: `${questionNum}. ${data.question}`,
            isComplete: false
          }];
        });
      } else {
        throw new Error(data.error || 'Failed to get question');
      }
    } catch (error) {
      console.error('Error getting question:', error);
      setChatMessages(prev => {
        const newMessageIndex = prev.length;
        setTimeout(() => setTypingMessageIndex(newMessageIndex), 0);
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
      const response = await fetch('https://ignite-education-api.onrender.com/api/knowledge-check/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonContext,
          question: chatMessages[chatMessages.length - 1].text,
          answer: userAnswer,
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
          setTimeout(() => setTypingMessageIndex(newMessageIndex), 0);
          return [...prev, {
            type: 'assistant',
            text: data.feedback,
            isComplete: false
          }];
        });

        // Move to next question or finish
        if (currentQuestionIndex + 1 < TOTAL_QUESTIONS) {
          const nextIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextIndex);
          // Wait a moment before asking next question
          setTimeout(() => {
            askNextQuestion(updatedAnswers);
          }, 1500);
        } else {
          // All questions answered, calculate final score
          calculateFinalScore(updatedAnswers);
        }
      } else {
        throw new Error(data.error || 'Failed to evaluate answer');
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      setChatMessages(prev => {
        const newMessageIndex = prev.length;
        setTimeout(() => setTypingMessageIndex(newMessageIndex), 0);
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
    } catch (error) {
      console.error('Error logging knowledge check:', error);
      // Continue anyway - don't block the user experience
    }

    // Show final result message with typing animation
    setChatMessages(prev => {
      const newMessageIndex = prev.length;
      setTimeout(() => setTypingMessageIndex(newMessageIndex), 0);
      return [...prev, {
        type: 'assistant',
        text: passed
          ? `Congratulations. You scored ${correctCount}/${TOTAL_QUESTIONS}. You've passed this lesson and can move on to the next one. Great work.`
          : `You scored ${correctCount}/${TOTAL_QUESTIONS}. You need ${PASS_THRESHOLD} correct answers to pass. Don't worry - you can retake the knowledge check.`,
        isComplete: false
      }];
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isEvaluating || isComplete) return;

    const userAnswer = chatInput;

    // Add user message
    setChatMessages(prev => [...prev, { type: 'user', text: userAnswer }]);
    setChatInput('');

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
    // Start over
    askNextQuestion();
  };

  const handleProceed = () => {
    if (score >= PASS_THRESHOLD) {
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
        {/* Title above the box */}
        <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
          Knowledge Check
        </h2>

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
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 text-gray-600 hover:text-black z-10"
          >
            <X size={24} />
          </button>

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
                style={{
                  marginBottom: idx < chatMessages.length - 1 ? (msg.type === 'user' && chatMessages[idx + 1]?.type === 'assistant' ? '1.5rem' : '0.5rem') : '0'
                }}
              >
                {msg.type === 'assistant' ? (
                  <div className="p-3 text-black text-sm leading-snug inline-block max-w-[95%]" style={{
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6'
                  }}>
                    {(typingMessageIndex === idx && !msg.isComplete ? displayedText : msg.text).split('\n').map((line, i) => {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={i} className={i > 0 ? 'mt-3' : ''}>
                          {parts.map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return <span key={j}>{part}</span>;
                          })}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-white text-sm max-w-[95%] inline-block" style={{
                    borderRadius: '8px',
                    backgroundColor: '#7c3aed'
                  }}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}

            {isEvaluating && (
              <div className="p-3 text-black text-sm inline-block" style={{
                borderRadius: '8px',
                backgroundColor: '#f3f4f6'
              }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 bg-gray-100 px-8 pb-4 pt-3" style={{ borderRadius: '0 0 0.3rem 0.3rem' }}>
            {!isComplete ? (
              <form onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="type your answer here"
                  disabled={isEvaluating}
                  className="w-full bg-gray-100 px-5 text-sm text-center focus:outline-none placeholder-gray-500 text-black caret-gray-500 disabled:opacity-50"
                  style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem', marginBottom: '8px' }}
                />
                <button
                  type="submit"
                  disabled={isEvaluating || !chatInput.trim()}
                  className="w-full text-white px-4 py-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: '1rem', fontSize: '0.85rem', backgroundColor: '#7714E0' }}
                  onMouseEnter={(e) => !isEvaluating && chatInput.trim() && (e.currentTarget.style.backgroundColor = '#6610C7')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7714E0'}
                >
                  {isEvaluating ? 'Evaluating...' : 'Submit'}
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                {score >= PASS_THRESHOLD ? (
                  <button
                    onClick={handleProceed}
                    className="w-full text-white rounded-xl px-5 py-3 text-sm font-semibold transition"
                    style={{ backgroundColor: '#EF0B72' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#D90A65'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#EF0B72'}
                  >
                    {nextLessonName ? `Proceed to ${nextLessonName}` : 'Proceed to Next Lesson'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleRetake}
                      className="w-full bg-purple-600 text-white rounded-xl px-5 py-3 text-sm font-semibold hover:bg-purple-700 transition"
                    >
                      Retake
                    </button>
                    <button
                      onClick={handleClose}
                      className="w-full bg-gray-300 text-gray-700 rounded-xl px-5 py-3 text-sm font-semibold hover:bg-gray-400 transition"
                    >
                      Back to content
                    </button>
                  </>
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
