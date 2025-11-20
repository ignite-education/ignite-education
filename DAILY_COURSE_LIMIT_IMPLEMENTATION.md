# Daily Course Completion Limit Implementation

## Overview
This feature limits users to completing a maximum of 2 courses per day. When a user attempts to access a lesson in a third course on the same day, they see a locked message indicating when they can return.

## Implementation Details

### 1. Database Schema
**Table:** `course_completions`

Located in: [migrations/add_daily_course_completion_limit.sql](migrations/add_daily_course_completion_limit.sql)

```sql
CREATE TABLE course_completions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT unique_user_course_day UNIQUE (user_id, course_id, DATE(completed_at))
);
```

**Key Features:**
- Tracks when users complete entire courses
- Unique constraint prevents duplicate completions on same day
- Indexes for fast lookups by user and date

### 2. API Functions
Located in: [src/lib/api.js](src/lib/api.js)

#### `getCourseCompletionsToday(userId)`
Returns the count of courses completed today (0-2+).

#### `getCoursesCompletedToday(userId)`
Returns array of course IDs completed today.

#### `markCourseComplete(userId, courseId)`
Records a course completion in the database.

#### `getNextAvailableDate()`
Returns tomorrow's date formatted as "Monday, January 22".

#### `checkCourseCompletion(userId, courseId)`
Checks if all lessons in a course are completed.

### 3. Frontend Logic
Located in: [src/components/LearningHub.jsx](src/components/LearningHub.jsx)

#### State Variables (lines 116-120)
```javascript
const [coursesCompletedToday, setCoursesCompletedToday] = useState(0);
const [todaysCompletedCourseIds, setTodaysCompletedCourseIds] = useState([]);
const [dailyLimitReached, setDailyLimitReached] = useState(false);
const [nextAvailableDate, setNextAvailableDate] = useState('');
```

#### Daily Limit Check (lines 534-561)
On component load, checks:
1. How many courses completed today
2. Which course IDs were completed
3. If current course is one of today's completions
4. Sets `dailyLimitReached` if count >= 2 AND current course not completed today

#### Lesson Lock Logic (lines 1901-1942)
Two-tier check:
1. **FIRST:** Daily limit check - if reached, lock ALL lessons
2. **SECOND:** Normal prerequisite check - if previous lesson not complete, lock

#### Locked Overlay UI (lines 2433-2468)
Shows different messages based on `lockReason`:
- **daily_limit:** "You've completed 2 courses today. Come back on {date}..."
- **prerequisite:** "Lesson not available yet" with "Go to Current Lesson" button

#### Course Completion Detection (lines 843-858)
After marking a lesson complete:
1. Checks if all lessons in course are now complete
2. If yes, calls `markCourseComplete()` to record in database
3. Refreshes daily completion count

## How It Works

### User Flow

1. **First Course Completion**
   - User completes all lessons in Course A
   - System detects course completion
   - Records in `course_completions` table
   - Count: 1 course completed today

2. **Second Course Completion**
   - User completes all lessons in Course B
   - System detects course completion
   - Records in `course_completions` table
   - Count: 2 courses completed today

3. **Third Course Attempt**
   - User tries to access lessons in Course C
   - System checks: `coursesCompletedToday >= 2` AND `courseC not in todaysCompletedCourseIds`
   - Locks all lessons with daily limit message
   - Shows: "Come back on Wednesday, November 21 to continue"

4. **Next Day**
   - Date changes to November 21
   - Daily count resets to 0 (new day)
   - User can access Course C normally

### Edge Cases Handled

1. **Same Course Multiple Times**
   - Unique constraint prevents duplicate entries
   - Re-completing a course on same day doesn't count against limit

2. **Timezone Handling**
   - Uses JavaScript `Date` object with local timezone
   - "Today" is based on user's local time, not UTC

3. **Course Switching**
   - Users can freely browse courses they've already completed today
   - Limit only applies to NEW courses started same day

4. **Mid-Course Progress**
   - If user is halfway through a course, they can always continue it
   - Only blocks starting NEW courses after limit reached

## Running the Migration

### Option 1: Automated Script
```bash
node run-course-limit-migration.js
```

### Option 2: Manual (Supabase SQL Editor)
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `migrations/add_daily_course_completion_limit.sql`
4. Execute the SQL

## Testing Checklist

- [ ] Complete first course - verify completion recorded
- [ ] Complete second course - verify completion recorded
- [ ] Try to access third course - should show lock message
- [ ] Verify lock message shows correct date (tomorrow)
- [ ] Check timezone handling (date should be user's local time)
- [ ] Return to already-completed course - should work normally
- [ ] Wait until next day (or adjust system time) - should allow new courses
- [ ] Verify daily count resets properly

## Database Queries for Testing

### Check today's completions for a user
```sql
SELECT * FROM course_completions
WHERE user_id = 'your-user-id'
AND DATE(completed_at) = CURRENT_DATE;
```

### Manually add a course completion (for testing)
```sql
INSERT INTO course_completions (user_id, course_id, completed_at)
VALUES ('your-user-id', 'product-manager', NOW());
```

### Reset completions for a user (for testing)
```sql
DELETE FROM course_completions
WHERE user_id = 'your-user-id'
AND DATE(completed_at) = CURRENT_DATE;
```

## Files Modified

1. **New:** `migrations/add_daily_course_completion_limit.sql` - Database schema
2. **New:** `run-course-limit-migration.js` - Migration runner script
3. **Modified:** `src/lib/api.js` - Added 4 new API functions (lines 1482-1618)
4. **Modified:** `src/components/LearningHub.jsx` - Added limit checking and UI updates
   - Imports updated (line 6)
   - State variables added (lines 116-120)
   - Daily limit check in fetchLessonData (lines 534-561)
   - Lesson lock logic updated (lines 1890-1942)
   - Locked overlay UI updated (lines 2433-2468)
   - Course completion detection (lines 843-858)

## Future Enhancements

1. **Configurable Limit**
   - Store limit (2) in database or environment variable
   - Allow admins to change limit per user or globally

2. **Analytics Dashboard**
   - Track average courses completed per day
   - Show completion trends over time

3. **Grace Period**
   - Allow users to complete a course they're 90%+ through
   - Even if limit reached

4. **Premium Feature**
   - Remove limit for paid users
   - Or increase limit to 5 courses/day for premium

5. **Notification**
   - Email/notification when limit resets
   - Remind users they can continue learning
