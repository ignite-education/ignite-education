# Knowledge Check - Testing Checklist ✅

## 🎯 Quick Start

Your servers are running:
- **Frontend**: http://localhost:5174
- **Backend**: http://localhost:3001

---

## Step 1: Database Setup ⚡

### A. Create the Table in Supabase

1. **Open Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/yjvdakdghkfnlhdpbocg
   ```

2. **Go to SQL Editor**
   - Left sidebar → Click "SQL Editor"
   - Click "New query"

3. **Run the SQL Script**
   - Copy all content from `supabase_knowledge_check_table.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Should see: "Success. No rows returned"

4. **Verify Table Creation**
   - Left sidebar → Click "Table Editor"
   - Look for `knowledge_check_results` in the tables list
   - Click on it to view the schema
   - Should see columns: id, user_id, course_id, module_number, lesson_number, score, total_questions, passed, answers, completed_at, created_at

✅ **Database setup complete!**

---

## Step 2: Test the Knowledge Check Flow 🧪

### A. Navigate to a Lesson

1. Open http://localhost:5174 in your browser
2. You should see the Progress Hub (or sign in if needed)
3. Click on any lesson card to start a lesson

### B. Complete the Lesson Sections

1. Read through the lesson content
2. Click the pink "Continue" button at the bottom
3. Repeat until you reach the **last section** of the lesson
4. On the last section, click "Continue" one more time

### C. Knowledge Check Should Appear

**Expected behavior:**
- ✅ Modal pops up with translucent dark background
- ✅ Title shows: "Knowledge Check - [Lesson Name]"
- ✅ White content box with rounded corners
- ✅ Progress indicator at top: "Question 1 of 15" and "Score: 0/0"
- ✅ Will's first question appears automatically in a gray bubble
- ✅ Text input field at bottom says "Type your answer here..."
- ✅ Blue "Submit Answer" button below the input

**If modal doesn't appear:**
- Check browser console (F12) for errors
- Verify you clicked "Continue" on the LAST section
- Check server.js is running on port 3001

### D. Answer Questions

1. **Type your first answer** (in natural language, not keywords)
   - Example question: "What is product-market fit?"
   - Example answer: "When your product satisfies a strong market demand"

2. **Click "Submit Answer"**

**Expected behavior:**
- ✅ Your answer appears in a purple bubble on the right
- ✅ Button changes to "Evaluating..." and is disabled
- ✅ After ~2-3 seconds, Will's feedback appears in a gray bubble
- ✅ Feedback should be encouraging and explain if correct/incorrect
- ✅ Progress bar updates (1/15 complete)
- ✅ Score counter updates if correct (e.g., "Score: 1/1")
- ✅ After ~1.5 seconds, Will asks the next question

3. **Continue answering all 15 questions**
   - Each question should be different
   - Mix of easy and harder questions
   - Feedback should be personalized

### E. Test Passing Scenario (Score ≥ 12/15)

**Try to answer most questions correctly**

**Expected behavior after question 15:**
- ✅ Final message from Will: "🎉 Congratulations! You scored X/15! You've passed..."
- ✅ Green "Proceed to Next Lesson" button appears
- ✅ Click the button
- ✅ Modal closes
- ✅ You're taken back to the Progress Hub
- ✅ Lesson should now show as completed

### F. Test Failing Scenario (Score < 12/15)

**Start a new lesson and answer incorrectly to test fail path**

1. Navigate to another lesson
2. Complete sections until Knowledge Check
3. Answer most questions incorrectly (give nonsense answers)

**Expected behavior after scoring <12:**
- ✅ Final message from Will: "You scored X/15. You need 12 correct answers to pass..."
- ✅ Purple "Retake Knowledge Check" button appears
- ✅ Gray "Close" button also appears

**Test Retake:**
- ✅ Click "Retake Knowledge Check"
- ✅ All state resets (score, questions, answers)
- ✅ Will asks a new first question
- ✅ You can go through all 15 questions again

**Test Close:**
- ✅ Click "Close" button
- ✅ Modal closes with animation
- ✅ You remain on the lesson page (not back to hub)
- ✅ Can click "Continue" again to retake

---

## Step 3: Verify Database Logging 📊

### A. Check Supabase Records

1. **Go back to Supabase Dashboard**
   - Table Editor → `knowledge_check_results`

2. **Look for your test results**
   - Should see one or more rows
   - Each row represents a completed knowledge check

3. **Verify the data in each row:**

   | Column | Expected Value |
   |--------|----------------|
   | `user_id` | Your actual Supabase user ID (if logged in) or "temp-user-id" |
   | `course_id` | "product-management" |
   | `module_number` | The module number you tested (e.g., 1) |
   | `lesson_number` | The lesson number you tested (e.g., 1) |
   | `score` | Your score (0-15) |
   | `total_questions` | 15 |
   | `passed` | true or false (based on score) |
   | `completed_at` | Recent timestamp |
   | `created_at` | Recent timestamp |

4. **Inspect the `answers` JSONB field:**
   - Click on the cell to expand it
   - Should contain an array of 15 objects
   - Each object should have:
     ```json
     {
       "question": "What is...",
       "answer": "Your answer text",
       "isCorrect": true/false,
       "feedback": "Will's feedback text"
     }
     ```

✅ **If you see all this data, logging is working perfectly!**

**If no data appears:**
- Check browser console for errors
- Check server logs for database errors
- Verify Supabase credentials in `.env`
- Note: The app will still work even if logging fails

---

## Step 4: Edge Cases to Test 🔍

### Test Empty Answers
- ✅ Try submitting an empty answer
- Should not allow submission (button disabled when input empty)

### Test Close Button
- ✅ Click the X button in top-right corner during quiz
- Modal should close with animation
- Can reopen by clicking Continue again

### Test Backdrop Click
- ✅ Click on the dark background outside the modal
- Modal should close

### Test Long Answers
- ✅ Type a very long answer (multiple sentences)
- Should handle gracefully
- Text should wrap in the purple bubble

### Test Rapid Clicking
- ✅ Try clicking "Submit Answer" multiple times quickly
- Should be disabled after first click
- Prevents duplicate submissions

### Test Different Lessons
- ✅ Test knowledge checks on different lessons
- Questions should be relevant to each lesson's content
- Questions should vary based on lesson context

---

## Step 5: Visual/UI Checks 🎨

### Modal Appearance
- ✅ Background has translucent blur effect
- ✅ Modal has white background
- ✅ Modal has rounded corners (borderRadius: '0.3rem')
- ✅ Title is above the modal box in white text
- ✅ Close button (X) is clearly visible

### Chat Bubbles
- ✅ Will's messages: Gray background, left-aligned
- ✅ Your messages: Purple background, right-aligned (with margin-left)
- ✅ Text is readable and properly formatted
- ✅ Bold text works (for **keywords**)

### Progress Indicators
- ✅ Progress bar fills from left to right
- ✅ Progress bar is purple
- ✅ Question counter updates: "Question X of 15"
- ✅ Score counter updates: "Score: X/Y"

### Buttons
- ✅ Submit button is purple, changes to "Evaluating..." when clicked
- ✅ Proceed button is green (only on pass)
- ✅ Retake button is purple (only on fail)
- ✅ Close button is gray (only on fail)
- ✅ Buttons have hover effects

### Animations
- ✅ Modal fades in smoothly when opened
- ✅ Modal scales up when appearing
- ✅ Modal fades out when closed
- ✅ Chat scrolls to bottom automatically as messages appear

---

## Step 6: Performance Checks ⚡

### Response Times
- ✅ Questions load in < 3 seconds
- ✅ Answers are evaluated in < 5 seconds
- ✅ No lag in the UI during evaluation
- ✅ Next question appears ~1.5 seconds after feedback

### API Health
- ✅ Test backend health: http://localhost:3001/api/health
- Should return: `{"status":"ok","message":"Claude chat server is running"}`

### Console Checks
- ✅ No error messages in browser console
- ✅ No error messages in server terminal
- ✅ Should see success logs like:
  - "✅ Knowledge check logged: X/15 (PASSED/FAILED)"

---

## Common Issues & Solutions 🔧

### Issue: Modal doesn't appear
**Solution:** Make sure you're on the LAST section of the lesson. Check browser console for errors.

### Issue: Questions not loading
**Solution:**
1. Verify server.js is running on port 3001
2. Check Anthropic API key in `.env`
3. Test backend health endpoint

### Issue: "Failed to get question" error
**Solution:**
1. Check server logs for API errors
2. Verify lesson context is being passed
3. Try restarting server.js

### Issue: Database logging fails silently
**Solution:**
1. Check Supabase credentials in `.env`
2. Verify table was created correctly
3. Check browser console for Supabase errors
4. Note: This won't break the user experience

### Issue: Wrong user ID in database
**Solution:**
1. Make sure you're logged in
2. Check AuthContext is providing user.id
3. Falls back to "temp-user-id" if not logged in

---

## Success Criteria ✨

You can consider the feature complete when:

- ✅ Knowledge Check modal appears at end of lesson
- ✅ All 15 questions are asked one by one
- ✅ Answers are evaluated correctly by AI
- ✅ Feedback is helpful and encouraging
- ✅ Progress bar and score counter work
- ✅ Pass scenario (≥12/15) navigates to hub
- ✅ Fail scenario (<12/15) offers retake
- ✅ Retake resets and starts over with new questions
- ✅ Results are logged to Supabase database
- ✅ UI matches design (translucent background, etc.)
- ✅ No errors in console or server logs

---

## Next Steps After Testing 🚀

Once testing is complete:

1. **Remove temp user fallback** (optional)
   - Once all users are authenticated, remove `|| 'temp-user-id'` fallbacks

2. **Adjust parameters** (optional)
   - Change `TOTAL_QUESTIONS` from 15
   - Change `PASS_THRESHOLD` from 12
   - Adjust AI evaluation leniency

3. **Add analytics** (future)
   - Create dashboard to view student performance
   - Track average scores per lesson
   - Identify lessons that need improvement

4. **Deploy to production**
   - Test in staging environment first
   - Update API endpoints from localhost
   - Monitor for any production issues

---

## Support 💬

If you encounter issues:
1. Check this checklist first
2. Review `KNOWLEDGE_CHECK_SETUP.md` for detailed info
3. Check browser console and server logs
4. Verify all environment variables are set
5. Test with a simple lesson to isolate issues

Happy testing! 🎉
