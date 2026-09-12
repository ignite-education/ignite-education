import { useState, useCallback, useRef } from 'react';
import { startLessonCheckpoint, answerLessonCheckpoint } from '../../../lib/api';

/**
 * The graded checkpoint that closes every lesson.
 *
 * Three questions drawn from the lesson's question bank, each marked 0-10, with
 * the average gated at 50%. Passing is what completes the lesson.
 *
 * Deliberately thin: the server owns which question is current, what it is worth
 * and whether the lesson completes, because a pass grants the referrer of the
 * student a paid week. This hook holds only what the screen needs to draw.
 *
 * Phases:
 *   idle     — not started
 *   loading  — fetching the attempt
 *   question — a question is on screen awaiting an answer
 *   result   — all questions answered; `result` holds the outcome
 *   skipped  — the lesson has no question bank, so there is nothing to grade
 */
const useLessonCheckpoint = ({ courseId, moduleNumber, lessonNumber }) => {
  const [phase, setPhase] = useState('idle');
  const [question, setQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Read inside the grade callback, which is handed to useChat and must not go
  // stale between the answer being typed and the server replying.
  const attemptIdRef = useRef(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setQuestion('');
    setQuestionNumber(0);
    setTotalQuestions(0);
    setResult(null);
    setError(null);
    attemptIdRef.current = null;
  }, []);

  /**
   * Start (or resume) an attempt.
   *
   * Resolves to { status, question } rather than reading the state back, because
   * callers act on the result in the same tick and `question` will not have
   * flushed yet. `status` is 'question', 'skipped' or 'error'.
   */
  const start = useCallback(async () => {
    if (!courseId || moduleNumber == null || lessonNumber == null) {
      return { status: 'error' };
    }

    setPhase('loading');
    setError(null);
    setResult(null);

    try {
      const data = await startLessonCheckpoint({ courseId, moduleNumber, lessonNumber });

      // No bank for this lesson — nothing to grade, so don't trap the student.
      if (data.needsGeneration) {
        setPhase('skipped');
        return { status: 'skipped' };
      }

      attemptIdRef.current = data.attemptId;
      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
      setPhase('question');
      return { status: 'question', question: data.question, answered: data.answered || [] };
    } catch (err) {
      console.error('Error starting lesson checkpoint:', err);
      setError(err);
      setPhase('skipped'); // fail open rather than block the lesson
      return { status: 'error' };
    }
  }, [courseId, moduleNumber, lessonNumber]);

  /**
   * Grade one answer. Shaped to be passed straight to `sendGradedMessage`, which
   * types the returned `feedback` out as the assistant's reply.
   */
  const grade = useCallback(async (answerText) => {
    const attemptId = attemptIdRef.current;
    if (!attemptId) throw new Error('No checkpoint attempt in progress');

    const data = await answerLessonCheckpoint({ attemptId, answerText });

    if (data.complete) {
      setResult({
        passed: data.passed,
        percentage: data.percentage,
        totalScore: data.totalScore,
        questionCount: data.questionCount,
        results: data.results,
      });
      setPhase('result');

      const outcome = data.passed
        ? `That gives you ${data.totalScore} out of ${data.questionCount * 10}, or ${data.percentage}%. You've passed this lesson.`
        : `That gives you ${data.totalScore} out of ${data.questionCount * 10}, or ${data.percentage}%. You need 50% to complete the lesson, so let's go again with some different questions.`;

      return { ...data, feedback: `${data.feedback}\n${outcome}` };
    }

    setQuestion(data.nextQuestion);
    setQuestionNumber(data.questionNumber);

    // Feedback and the next question are typed as one message. The conversation
    // reads continuously and there is no second typewriter to sequence behind
    // the first, which is the part the old per-section flow got wrong.
    return { ...data, feedback: `${data.feedback}\n${data.nextQuestion}` };
  }, []);

  /** Retake after a failure — a fresh attempt, served questions not yet asked. */
  const retake = useCallback(() => start(), [start]);

  return {
    phase,
    question,
    questionNumber,
    totalQuestions,
    result,
    error,
    isActive: phase === 'loading' || phase === 'question' || phase === 'result',
    start,
    grade,
    retake,
    reset,
  };
};

export default useLessonCheckpoint;
