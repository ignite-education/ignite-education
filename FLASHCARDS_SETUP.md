# Flashcards Setup Guide

This guide explains how to set up and populate flashcards for your lessons.

## Overview

The flashcard system now uses a database-backed approach where:
- Each lesson has 15 pre-generated flashcards stored in the database
- Flashcards are fetched from the database (not generated on-the-fly)
- Flashcards are randomly shuffled each time a user opens them
- Questions and answers are based entirely on the lesson content

## Setup Steps

### 1. Run the Database Migration

First, create the flashcards table in your Supabase database. You can do this by:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `migrations/create_flashcards_table.sql`
4. Paste and run the SQL

**Option B: Using Supabase CLI** (if you have it set up)
```bash
supabase db push
```

### 2. Populate Flashcards for Lessons

Use the provided script to generate and store flashcards for each lesson:

```bash
node scripts/populate-flashcards.js <courseId> <moduleNumber> <lessonNumber>
```

**Example:**
```bash
# Generate flashcards for Module 1, Lesson 1 of product-management course
node scripts/populate-flashcards.js product-management 1 1

# Generate for Module 1, Lesson 2
node scripts/populate-flashcards.js product-management 1 2

# Generate for Module 2, Lesson 1
node scripts/populate-flashcards.js product-management 2 1
```

### 3. Bulk Population Script (Optional)

If you want to populate flashcards for all lessons at once, you can create a bash script:

```bash
#!/bin/bash
# populate-all-flashcards.sh

COURSE_ID="product-management"

# Adjust these ranges based on your course structure
for MODULE in {1..5}; do
  for LESSON in {1..8}; do
    echo "Generating flashcards for Module $MODULE, Lesson $LESSON..."
    node scripts/populate-flashcards.js $COURSE_ID $MODULE $LESSON

    # Small delay to avoid rate limiting
    sleep 2
  done
done

echo "All flashcards generated!"
```

Make it executable and run:
```bash
chmod +x populate-all-flashcards.sh
./populate-all-flashcards.sh
```

## How It Works

### Frontend (LearningHub.jsx)
- When user clicks "Flashcards" button, `handleOpenFlashcards()` is called
- Fetches flashcards from database using `getFlashcards(courseId, moduleNumber, lessonNumber)`
- Flashcards are automatically shuffled randomly by the API function
- User can flip through all 15 flashcards

### API (src/lib/api.js)
- `getFlashcards()` - Fetches flashcards from database and shuffles them
- `createFlashcards()` - Stores flashcards in the database (used by the populate script)

### Database Schema
```sql
flashcards
├── id (UUID, primary key)
├── course_id (TEXT)
├── module_number (INTEGER)
├── lesson_number (INTEGER)
├── question (TEXT)
├── answer (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## AI Generation Details

The script uses Claude 3.5 Sonnet to generate flashcards with the following criteria:
- **Exactly 15 questions** per lesson
- **Varied question types**: what, how, why, explain, compare, apply
- **Comprehensive coverage**: from basic concepts to advanced applications
- **Self-contained**: question and answer make sense without additional context
- **Concise answers**: 2-4 sentences each

## Troubleshooting

### "No flashcards found" warning
- Make sure you've run the migration to create the table
- Run the populate script for that specific lesson
- Check Supabase dashboard to verify data was inserted

### "Loading flashcards..." stuck
- Check browser console for errors
- Verify Supabase connection is working
- Check that RLS policies are set correctly (flashcards should be readable by everyone)

### Regenerating flashcards
The populate script automatically deletes and replaces existing flashcards for a lesson, so you can safely re-run it:
```bash
node scripts/populate-flashcards.js product-management 1 1
```

## Future Enhancements

Possible improvements:
- Admin UI to regenerate flashcards without command line
- User feedback on flashcard quality
- Difficulty levels (easy/medium/hard)
- Spaced repetition tracking
- Export flashcards to Anki or other apps
