# Knowledge Check Feature - Setup Guide

## Overview

The Knowledge Check feature adds an interactive quiz at the end of each lesson where Will (the AI chatbot) asks students 15 questions to test their understanding. Students must score at least 12/15 (80%) to pass and proceed to the next lesson.

## Features

- **Interactive Chat Experience**: Will asks questions one at a time in a natural conversation
- **Natural Language Answers**: Students respond in their own words (not multiple choice)
- **AI Evaluation**: Claude AI evaluates answers for correctness and provides personalized feedback
- **Pass/Fail Threshold**: Students must get 12/15 correct to pass
- **Retake Option**: Failed quizzes can be retaken immediately
- **Results Logging**: All quiz attempts are logged to the database
- **Translucent Modal**: Knowledge check appears in a modal with the same design as the ad-free upgrade window

## Implementation Details

### Components Created

1. **KnowledgeCheck.jsx** - Main component for the knowledge check modal
   - Location: `/src/components/KnowledgeCheck.jsx`
   - Handles quiz flow, question display, answer submission, and scoring

2. **API Endpoints** - Added to `server.js`:
   - `POST /api/knowledge-check/question` - Generates a new question based on lesson content
   - `POST /api/knowledge-check/evaluate` - Evaluates student answers and provides feedback

3. **Database Function** - Added to `src/lib/api.js`:
   - `logKnowledgeCheck()` - Logs quiz results to Supabase

### Database Setup

You need to create the `knowledge_check_results` table in Supabase:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/yjvdakdghkfnlhdpbocg
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase_knowledge_check_table.sql`

The table stores:
- User ID and course/lesson information
- Score and pass/fail status
- Complete question/answer pairs with AI feedback
- Timestamp of completion

## How It Works

### User Flow

1. Student completes all sections of a lesson
2. Student clicks "Continue" on the final section
3. Knowledge Check modal appears with Will greeting them
4. Will asks question 1 of 15
5. Student types their answer in natural language
6. Will evaluates the answer and provides immediate feedback
7. Process repeats for all 15 questions
8. Final score is displayed
9. If score ≥ 12/15:
   - Student sees "Proceed to Next Lesson" button
   - Lesson is marked complete
   - Student navigates back to Progress Hub
10. If score < 12/15:
   - Student sees "Retake Knowledge Check" button
   - Student can try again with new questions

### Technical Flow

1. **Trigger**: `handleContinue()` in LearningHub detects last section
2. **Open Modal**: Sets `showKnowledgeCheck` state to true
3. **Generate Question**: Component calls `/api/knowledge-check/question`
4. **Display Question**: Will's message appears in chat
5. **Submit Answer**: User types and submits their answer
6. **Evaluate Answer**: Call to `/api/knowledge-check/evaluate`
7. **Show Feedback**: AI feedback appears in chat
8. **Next Question**: After brief delay, next question is asked
9. **Calculate Score**: After question 15, total correct answers are counted
10. **Log Results**: Results saved to database via `logKnowledgeCheck()`
11. **Show Result**: Final message with pass/fail status
12. **Navigation**: Pass → complete lesson and return to hub, Fail → offer retake

## Customization Options

### Adjusting Difficulty

Edit the question generation prompt in `server.js` (line ~103):
- Modify instructions to make questions easier/harder
- Add specific question types (e.g., more application questions)
- Adjust the balance of recall vs. understanding questions

### Changing Pass Threshold

Edit `PASS_THRESHOLD` in `KnowledgeCheck.jsx` (line 12):
```javascript
const PASS_THRESHOLD = 12; // Change to desired passing score
```

### Adjusting Number of Questions

Edit `TOTAL_QUESTIONS` in `KnowledgeCheck.jsx` (line 11):
```javascript
const TOTAL_QUESTIONS = 15; // Change to desired number
```

### Modifying AI Leniency

Edit the evaluation prompt in `server.js` (line ~157):
- Adjust "somewhat lenient" instruction
- Provide more specific grading criteria
- Change feedback style

## Testing

### Local Testing

1. Start both servers:
   ```bash
   npm run dev        # Frontend on http://localhost:5174
   node server.js     # Backend on http://localhost:3001
   ```

2. Navigate to a lesson in the app
3. Complete all sections
4. Click "Continue" on the final section
5. Knowledge check modal should appear

### Things to Test

- ✅ Modal appears with translucent background
- ✅ First question loads automatically
- ✅ Answer submission works
- ✅ Feedback appears after each answer
- ✅ Progress bar updates correctly
- ✅ Score counter updates
- ✅ All 15 questions are asked
- ✅ Final score calculation is correct
- ✅ Pass case: Shows proceed button and navigates correctly
- ✅ Fail case: Shows retake button
- ✅ Retake resets everything and starts over
- ✅ Results are logged to database

## Troubleshooting

### Modal Doesn't Appear
- Check browser console for errors
- Verify `showKnowledgeCheck` state is being set
- Ensure you're on the last section of the lesson

### Questions Not Loading
- Check backend server is running on port 3001
- Verify API endpoint `/api/knowledge-check/question` is accessible
- Check Anthropic API key is configured in `.env`

### Answers Not Being Evaluated
- Check `/api/knowledge-check/evaluate` endpoint
- Look for JSON parsing errors in server logs
- Verify lesson context is being passed correctly

### Database Logging Fails
- Verify `knowledge_check_results` table exists in Supabase
- Check Supabase credentials in `.env`
- Review browser console for Supabase errors
- Note: Logging failures won't block the user experience

## Future Enhancements

Potential improvements for the future:

1. **Question Bank**: Pre-generate questions instead of AI generation
2. **Analytics Dashboard**: View student performance across lessons
3. **Adaptive Difficulty**: Adjust question difficulty based on student performance
4. **Timed Mode**: Add optional time limits for questions
5. **Hints System**: Allow students to request hints
6. **Review Mode**: Let students review their answers after completion
7. **Leaderboards**: Compare scores with other students (with permission)

## Support

For issues or questions:
- Check browser console and server logs first
- Review this documentation
- Test with a simple lesson to isolate the issue
- Verify all dependencies are installed and servers are running
