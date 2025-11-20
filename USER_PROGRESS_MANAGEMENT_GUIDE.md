# User Progress Management Feature

## Overview
This feature allows administrators to manually adjust user lesson progress in the Analytics Dashboard. You can set a user to any specific lesson or reset their progress back to the beginning of a course.

## The Error You Encountered
The error you saw (`Failed to load resource: the server responded with a status of 400`) occurred because the `user_progress` table doesn't exist in your Supabase database yet. This table is required for the progress management feature to work.

## Quick Fix - Run the Database Migration

### Step 1: Run the Migration Script
```bash
node run-user-progress-migration.js
```

This will display the SQL you need to run.

### Step 2: Apply the SQL in Supabase
1. Copy the SQL from the terminal output
2. Go to your Supabase Dashboard → SQL Editor
3. Click "New Query"
4. Paste the SQL
5. Click "Run"
6. Verify the table was created in the Table Editor

### Step 3: Verify It Works
1. Refresh your application
2. Go to Analytics Dashboard
3. Find a user with an enrolled course
4. Click "Adjust Progress"
5. The modal should open without errors

## What the Migration Creates

The migration creates a `user_progress` table with:

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | References auth.users, tracks which user |
| `course_id` | TEXT | Which course the progress is for |
| `current_module` | INTEGER | Current module number (default: 1) |
| `current_lesson` | INTEGER | Current lesson number (default: 1) |
| `updated_at` | TIMESTAMP | When progress was last updated |

**Primary Key**: `(user_id, course_id)` - one progress record per user per course

### Security Policies
The migration also sets up Row Level Security (RLS):
- ✅ Users can view/update their own progress
- ✅ Admins can view/update/delete any user's progress
- ✅ Users cannot view other users' progress

## How to Use the Feature

### Reset a User's Progress
1. Navigate to **Analytics Dashboard** (admin access required)
2. Scroll to **User Management** section
3. Find the user in the table
4. Ensure they have an enrolled course
5. Click **"Adjust Progress"** in the Progress column
6. In the modal, click **"Reset to Module 1, Lesson 1"**
7. Confirm the action
8. Progress is reset!

### Set Specific Lesson
1. Follow steps 1-5 above
2. In the modal, enter:
   - **Module Number**: Target module (e.g., 3)
   - **Lesson Number**: Target lesson (e.g., 2)
3. Click **"Set Progress"**
4. The user is now on Module 3, Lesson 2

## What Happens When You Adjust Progress

### Setting to a Specific Lesson
When you set progress to Module 3, Lesson 2:
1. ✅ Validates the lesson exists in the course
2. ✅ Deletes all lesson completions at or after Module 3, Lesson 2
3. ✅ Updates `user_progress` table to Module 3, Lesson 2
4. ✅ User's next login will show Module 3, Lesson 2 as current

### Resetting Progress
When you reset to Module 1, Lesson 1:
1. ✅ Deletes ALL lesson completions for that course
2. ✅ Sets `user_progress` to Module 1, Lesson 1
3. ✅ User starts the course from scratch

## Files Modified

### API Functions
**File**: [src/lib/api.js](src/lib/api.js:1620-1763)

Three new functions:
```javascript
getUserProgressDetails(userId, courseId)  // Get current progress
setUserProgress(userId, courseId, targetModule, targetLesson)  // Set to specific lesson
resetUserProgress(userId, courseId)  // Reset to start
```

### Analytics Dashboard
**File**: [src/pages/AnalyticsDashboard.jsx](src/pages/AnalyticsDashboard.jsx)

Changes:
- Added "Progress" column to user table (line 874)
- Added "Adjust Progress" button for each user (lines 829-843)
- Created Progress Adjustment Modal (lines 1182-1301)
- Added modal state management (lines 82-89)
- Added handler functions (lines 315-391)

### Database Migration
**Files**:
- [migrations/create_user_progress_table.sql](migrations/create_user_progress_table.sql)
- [run-user-progress-migration.js](run-user-progress-migration.js)

## Troubleshooting

### "This user is not enrolled in any course"
**Solution**: Assign a course to the user first using the "Enrolled Course" dropdown

### "Lesson X-Y does not exist in course Z"
**Solution**: The lesson numbers you entered don't exist. Check the course structure and use valid module/lesson numbers.

### "Failed to load user progress"
**Solution**:
1. Make sure you ran the migration (see Quick Fix above)
2. Check that the `user_progress` table exists in Supabase
3. Verify RLS policies are enabled

### Modal Won't Open
**Solution**:
1. Ensure the user has an enrolled course
2. Check browser console for errors
3. Verify you're logged in as an admin

## Testing Checklist

- [ ] Database migration completed successfully
- [ ] `user_progress` table exists in Supabase
- [ ] Can open progress modal for enrolled users
- [ ] Modal shows current progress correctly
- [ ] Can set progress to specific lesson
- [ ] Can reset progress to Module 1, Lesson 1
- [ ] Changes persist after refresh
- [ ] Non-admin users cannot access feature
- [ ] Users without enrolled courses show "No course" message

## Architecture Notes

### Why Two Tables?
- **`user_progress`**: Current position (where user is NOW)
- **`lesson_completions`**: History of completed lessons

When you set progress to Module 3, Lesson 2:
- `user_progress` → Updates to 3, 2
- `lesson_completions` → Deletes M3L2 and all lessons after

This ensures:
- ✅ User resumes at the correct lesson
- ✅ Progress percentage is accurate
- ✅ No false "completed" indicators
- ✅ Certificate generation works correctly

### Course ID Format
The `course_id` field uses the course name format from the `courses` table:
- Example: `"product-manager"`, `"software-engineering"`
- NOT the course title: `"Product Manager"`
- This matches the `enrolled_course` field in the `users` table

## Support

If you encounter issues:
1. Check that the migration ran successfully
2. Verify RLS policies are set up correctly
3. Check browser console for detailed error messages
4. Ensure you're testing with admin account
