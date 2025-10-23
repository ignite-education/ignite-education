# Lesson Cards Redesign Summary

## Overview
Updated the Upcoming Lessons module to match the design shown in the provided image with the structure:
- **Section Number - Lesson Name** as the heading
- **Bullet points listing all sections** in that lesson

---

## Changes Made

### 1. Updated API Function ([src/lib/api.js](src/lib/api.js))

#### Added Lesson Metadata Extraction:
The `getLessonsByModule()` function now adds metadata to each grouped lesson:

```javascript
grouped[moduleKey][lessonKey].lessonName = sections[0].lesson_name || sections[0].title;
grouped[moduleKey][lessonKey].sectionNumber = sections[0].section_number;
```

**Why?** All sections within a lesson share the same `lesson_name` and base `section_number`, so we extract it from the first section for easy access when rendering.

---

### 2. Updated Component Logic ([src/components/ProgressHub.jsx](src/components/ProgressHub.jsx))

#### Enhanced `getCurrentAndNextLesson()`:
Now returns additional metadata:
- `currentLessonName` - Name of the current lesson
- `currentSectionNum` - Section number for display
- `nextLessonName` - Name of the next lesson
- `nextSectionNum` - Next section number
- `nextModuleNum` & `nextLessonNum` - For accurate navigation

---

### 3. Redesigned Lesson Cards

#### New Card Structure:

**Current Lesson (Purple Card):**
```
Section 5 - Classification and Variation
• Meiosis and Genetic Variation
• Mutations
• Genetic Diversity & Natural Selection
• Classification of Organisms
```

**Next Lesson (Gray Card):**
```
Section 6 - Energy Transfers
• Energy Transfer in Ecosystems
• Farming Practices and Production
• Nutrient Cycles
• Fertiliser and Eutrophication
```

#### Design Changes:
- **Larger padding** (`p-6` instead of `p-4`) for better spacing
- **Bigger heading** (`text-lg` for lesson name)
- **Cleaner bullet list** with proper spacing
- **Section titles as bullets** instead of nested content
- **Fallback messages** when no data is available

---

## Database Schema Expected

The component expects the `lessons` table to have:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid/int | Unique identifier |
| `course_id` | text | Course identifier |
| `module_number` | int | Module number (1, 2, 3...) |
| `lesson_number` | int | Lesson within module (1, 2, 3...) |
| `section_number` | int | Section identifier for display |
| `lesson_name` | text | Name of the lesson (e.g., "Classification and Variation") |
| `title` | text | Section title (e.g., "Meiosis and Genetic Variation") |
| `content` | json | Optional array of content (not displayed in this view) |

---

## Data Flow

1. **Fetch**: `getLessonsByModule('product-management')` fetches all lessons
2. **Group**: Lessons are grouped by module → lesson → sections
3. **Extract Metadata**: Lesson name and section number added to each group
4. **Display**: Cards show:
   - Heading: "Section {number} - {lesson_name}"
   - Bullets: Each section's title

---

## Example Data Structure

### Before Grouping (from database):
```javascript
[
  { id: 1, module_number: 1, lesson_number: 1, section_number: 5,
    lesson_name: "Classification and Variation",
    title: "Meiosis and Genetic Variation" },
  { id: 2, module_number: 1, lesson_number: 1, section_number: 5,
    lesson_name: "Classification and Variation",
    title: "Mutations" },
  // ... more sections
]
```

### After Grouping:
```javascript
{
  module_1: {
    lesson_1: [
      { id: 1, title: "Meiosis and Genetic Variation", ... },
      { id: 2, title: "Mutations", ... },
      { id: 3, title: "Genetic Diversity & Natural Selection", ... },
      { id: 4, title: "Classification of Organisms", ... }
    ],
    lessonName: "Classification and Variation",
    sectionNumber: 5
  }
}
```

---

## Troubleshooting

### If Lessons Don't Populate:

1. **Check Database Data**:
   - Verify `course_id` matches `'product-management'`
   - Ensure `lesson_name` field exists and is populated
   - Check that `module_number` and `lesson_number` are correctly set

2. **Check Browser Console**:
   - Look for error messages in `fetchData()`
   - Verify API calls are completing successfully

3. **Check Fallback Messages**:
   - If you see "No lesson data available", the query returned empty
   - Verify your Supabase table has data with correct `course_id`

4. **Debug with Console Logs**:
   ```javascript
   // Add to fetchData() in ProgressHub.jsx
   console.log('Fetched lessons:', lessonsData);
   console.log('Current lesson sections:', currentLessonSections);
   ```

---

## Visual Comparison

### Old Design:
- Showed "Module X - Lesson Y" as heading
- Displayed section titles with nested content bullets
- Smaller padding and text

### New Design (Matches Image):
- Shows "Section X - Lesson Name" as heading
- Lists section titles as simple bullets
- Larger padding and clearer typography
- Matches the purple card / gray card color scheme from image

---

## Build Status
✓ Build successful - no compilation errors

---

## Next Steps

1. **Test with Real Data**: Ensure your Supabase table has the correct schema
2. **Add Lesson Names**: If `lesson_name` column doesn't exist, add it to your database
3. **Populate Data**: Make sure lessons have proper `section_number` and `lesson_name` values
4. **User Testing**: Verify swipe gestures and navigation work correctly
