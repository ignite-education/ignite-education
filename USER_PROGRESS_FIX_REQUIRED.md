# User Progress Table Fix Required

## The Problem

The errors you're seeing:
```
invalid input syntax for type uuid: "product-manager"
Could not find the 'current_lesson' column of 'user_progress' in the schema cache
```

These indicate that the `user_progress` table exists but has the **wrong schema**:
- ❌ `course_id` is UUID (should be TEXT)
- ❌ Column names might be camelCase (should be snake_case)

## Why This Happened

Your database has an existing `user_progress` table that was created with a different schema than what our API code expects. Specifically:

### Current (Wrong) Schema
```sql
user_progress (
  user_id UUID,
  course_id UUID,  -- ❌ WRONG: Can't store "product-manager" as UUID
  ...
)
```

### Required Schema
```sql
user_progress (
  user_id UUID,
  course_id TEXT,  -- ✅ CORRECT: Can store "product-manager", "cybersecurity", etc.
  current_module INTEGER,
  current_lesson INTEGER,
  updated_at TIMESTAMP
)
```

## Quick Fix

### Step 1: Run the Fix Script
```bash
node run-fix-user-progress.js
```

This displays the SQL you need to run.

### Step 2: Apply in Supabase
1. Copy the SQL from terminal
2. Go to **Supabase Dashboard** → **SQL Editor**
3. Click **"New Query"**
4. Paste the SQL
5. Click **"Run"**

### Step 3: Verify
1. Refresh your application
2. Go to Analytics Dashboard
3. Click "Adjust Progress" on a user
4. Should work without errors! ✅

## What the Fix Does

The SQL script will:
1. ✅ Drop the old `user_progress` table
2. ✅ Create new table with `course_id` as TEXT
3. ✅ Ensure all column names use snake_case
4. ✅ Set up proper indexes
5. ✅ Configure Row Level Security policies

## Important Notes

⚠️ **This will delete existing progress data in the `user_progress` table**

However, this is likely acceptable because:
- The old table couldn't work properly anyway (UUID vs TEXT mismatch)
- User lesson completions are stored separately in `lesson_completions` table
- Users' actual course progress is not lost
- The `user_progress` table is just for tracking "current position"

## Alternative: Backup Data First

If you want to preserve existing data:

```sql
-- 1. Backup existing data
CREATE TABLE user_progress_backup AS SELECT * FROM user_progress;

-- 2. Run the fix script

-- 3. Optionally restore data (if course_id can be mapped properly)
-- Note: You'd need to convert UUID course_ids to TEXT course names
```

## After the Fix

Once you run the SQL:
- ✅ Progress adjustment feature works
- ✅ No more UUID errors
- ✅ Column names match API expectations
- ✅ Users can have progress tracked correctly

## Testing

After applying the fix:
1. Open Analytics Dashboard
2. Find a user with an enrolled course
3. Click "Adjust Progress"
4. Modal should open showing current progress
5. Try resetting progress
6. Should succeed! ✅

## Support

The fix script is at: `run-fix-user-progress.js`
The SQL migration is at: `migrations/fix_user_progress_table.sql`

If you still see errors after running this:
1. Check that the table was actually dropped and recreated
2. Verify column names with: `SELECT * FROM user_progress LIMIT 1;`
3. Check browser console for detailed error messages
