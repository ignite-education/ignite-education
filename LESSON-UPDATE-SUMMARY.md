# Upcoming Lessons Module Update

## Summary

The "Upcoming Lessons" section in ProgressHub has been updated to properly fetch and display lesson data from Supabase tables using the new grouped structure (Module → Lesson → Sections).

## Changes Made

### 1. API Functions ([src/lib/api.js](src/lib/api.js))
- Created `getLessonsByModule(courseId)` function that fetches lessons grouped by:
  - **Module number** (module_1, module_2, etc.)
  - **Lesson number** (lesson_1, lesson_2, etc.)
  - **Sections** (array of section objects within each lesson)

### 2. ProgressHub Component Updates ([src/components/ProgressHub.jsx](src/components/ProgressHub.jsx))

#### State Changes:
- **Removed**: `lessons` (flat array), `lessonIndex`
- **Added**:
  - `groupedLessons` - nested object structure from Supabase
  - `currentModule` - tracks which module user is viewing (default: 1)
  - `currentLesson` - tracks which lesson within module (default: 1)

#### Data Fetching:
- Now uses `getLessonsByModule()` instead of `getLessons()`
- Fetches data organized by module/lesson hierarchy
- Data structure:
  ```javascript
  {
    module_1: {
      lesson_1: [section1, section2, ...],
      lesson_2: [section1, section2, ...]
    },
    module_2: {
      lesson_1: [...]
    }
  }
  ```

#### UI Improvements:

**Navigation Controls:**
- Added chevron buttons (◀ ▶) to navigate between lessons
- Displays current position: "Module X, Lesson Y"
- Previous button navigates to previous lesson or last lesson of previous module
- Next button navigates to next lesson or first lesson of next module

**Current Lesson Card (Left):**
- Shows "Current Lesson" label
- Displays "Module X - Lesson Y" heading
- Lists all sections in the lesson with:
  - Section titles (bold)
  - Content bullets from database
  - Purple accent border on left

**Next Lesson Card (Right):**
- Shows "Up Next" label
- Displays next lesson's module/lesson number
- Preview of upcoming sections (first 2 bullets only)
- Greyed out appearance for "preview" effect

## Database Schema Expected

The component expects lessons table with these columns:
- `course_id` - string identifier for the course
- `module_number` - integer (1, 2, 3, etc.)
- `lesson_number` - integer (1, 2, 3, etc.)
- `section_number` - integer (1, 2, 3, etc.)
- `title` - section title
- `content` - JSON array of bullet points/text content
- `order_index` - overall ordering

## How It Works

1. On component mount, fetches all lessons for 'product-management' course
2. Groups lessons by module → lesson → sections hierarchy
3. User can navigate through lessons using arrow buttons
4. Current lesson shows all sections with full content
5. Next lesson shows preview with limited content
6. Automatically handles module boundaries (e.g., last lesson of module 1 → first lesson of module 2)

## Future Enhancements

- Replace hardcoded `courseId` with authenticated user's enrolled course
- Add progress tracking to highlight completed lessons
- Store user's current position in database
- Add lesson completion buttons
- Show total lesson count and progress indicator
