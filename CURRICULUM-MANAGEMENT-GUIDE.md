# Complete Curriculum Management System Guide

## Overview
You now have a comprehensive system to manage all your course content from one place. This guide will walk you through setting up and using the new system.

---

## Step 1: Database Setup

### Run the SQL Script in Supabase

1. **Open Supabase Dashboard**: Go to https://app.supabase.com
2. **Select your project**
3. **Navigate to SQL Editor**
4. **Create a new query**
5. **Copy and paste** the contents of `complete-reset-and-new-schema.sql`
6. **Click Run** (or press Ctrl+Enter)

This will:
- ✅ Delete all existing lesson data
- ✅ Create a `courses` table
- ✅ Create a `modules` table
- ✅ Create a `lessons_metadata` table
- ✅ Add bullet point support to the `lessons` table
- ✅ Set up proper relationships and security policies
- ✅ Insert the default "product-management" course

---

## Step 2: Access the New Upload Tool

Navigate to: **http://localhost:5174/admin/curriculum**

You'll see 4 tabs:
1. **Courses** - Manage courses
2. **Modules** - Manage modules within courses
3. **Lessons** - Manage lesson metadata and bullet points
4. **Content** - Manage the actual lesson content (text, images, videos, etc.)

---

## Step 3: Create Your Course Structure

### Tab 1: Courses

**Purpose**: Define your courses

**Fields**:
- **Course ID**: Unique identifier (e.g., `product-management`)
- **Course Name**: Display name (e.g., `Product Management`)
- **Description**: Brief course description

**Actions**:
1. Fill in the course information
2. Click "Save Course"
3. Your course will appear in the "Existing Courses" section below

---

### Tab 2: Modules

**Purpose**: Create modules within your course. Modules are the main sections of your course.

**Fields**:
- **Course**: Select from dropdown
- **Module Number**: Sequential number (1, 2, 3...)
- **Module Name**: Name of the module (e.g., "Introduction to Product Management")
- **Description**: What this module covers
- **Bullet Points**: Key topics covered (optional, can add multiple)

**Actions**:
1. Select your course
2. Enter module number
3. Fill in module details
4. Add bullet points (click + to add more)
5. Click "Save Module"

**Example**:
```
Course: product-management
Module Number: 1
Name: Introduction to Product Management
Description: Learn the fundamentals of product management
Bullet Points:
  • What is a Product Manager
  • Core responsibilities
  • Required skills
```

---

### Tab 3: Lessons

**Purpose**: Create lesson metadata and bullet points that appear on the "Upcoming Lessons" cards

**Fields**:
- **Course**: Select from dropdown
- **Module**: Select from dropdown
- **Lesson Number**: Sequential number within the module
- **Lesson Name**: Name of the lesson
- **Description**: What this lesson teaches
- **Bullet Points**: 3 bullet points that will appear on the upcoming lessons card

**Important**: These bullet points are what users see on the "Upcoming Lessons" cards in the Learning Hub!

**Actions**:
1. Select course and module
2. Enter lesson number
3. Fill in lesson details
4. Add exactly 3 bullet points for the card display
5. Click "Save Lesson Info"

**Example**:
```
Course: product-management
Module: Module 1
Lesson Number: 1
Name: What is Product Management?
Description: Introduction to the role of a Product Manager
Bullet Points:
  • Definition of Product Management
  • Product Manager vs Project Manager
  • Day-to-day responsibilities
```

---

### Tab 4: Content

**Purpose**: Create the actual lesson content that users will see when they click on a lesson

**Available Content Types**:

1. **Heading** (H1, H2, H3)
   - Use for section titles
   - Choose heading level

2. **Paragraph**
   - Regular text content
   - Use for explanations and descriptions

3. **Bullet List**
   - Creates a bulleted list
   - Click "+ Add" to add more items
   - Use for listing items, features, benefits

4. **Image**
   - Upload images from your computer
   - Add alt text and optional caption
   - Images are stored in Supabase Storage

5. **YouTube**
   - Embed YouTube videos
   - Enter the video ID (from YouTube URL)
   - Add optional title

**Actions**:
1. Select course, module, and lesson from dropdowns
2. Click the content type buttons to add blocks
3. Fill in the content for each block
4. Use ↑ ↓ buttons to reorder blocks
5. Use trash icon to delete blocks
6. Click "Save Lesson Content"

**Important**: When you save, it automatically deletes any previous content for that lesson!

---

## Step 4: How Data Flows to the Learning Hub

### Upcoming Lessons Cards
The bullet points you enter in the **Lessons tab** appear on the cards showing upcoming lessons.

**Data Source**: `lessons_metadata` table → `bullet_points` column

### Lesson Content
The content blocks you create in the **Content tab** appear when users click on a lesson.

**Data Source**: `lessons` table → rendered based on `content_type`

---

## Example Workflow

### Creating a Complete Lesson

1. **Create Course** (if not exists)
   - Tab: Courses
   - ID: `product-management`
   - Name: `Product Management`

2. **Create Module**
   - Tab: Modules
   - Module 1: "Introduction to Product Management"
   - Add bullet points about what the module covers

3. **Create Lesson Metadata**
   - Tab: Lessons
   - Lesson 1: "What is Product Management?"
   - Add 3 bullet points for the card:
     * Definition and overview
     * Core responsibilities
     * Skills required

4. **Add Lesson Content**
   - Tab: Content
   - Select: Course → Module 1 → Lesson 1
   - Add blocks:
     * Heading (H1): "What is Product Management?"
     * Paragraph: Introduction text
     * Heading (H2): "Core Responsibilities"
     * Bullet List: List of responsibilities
     * Image: Relevant diagram
     * YouTube: Introductory video
   - Click "Save Lesson Content"

5. **View Your Lesson**
   - Navigate to: `http://localhost:5174/learn?module=1&lesson=1`
   - You should see all your content beautifully formatted!

---

## Key Features

### ✅ Automatic Deletion
When you save content for a lesson, the system automatically deletes old content first. You never have to manually clean up!

### ✅ Dropdown Navigation
All dropdowns automatically load existing data, making it easy to find and edit content.

### ✅ Live Preview
For YouTube videos and images, you see a preview as soon as you add them.

### ✅ Flexible Content
Mix and match different content types to create engaging lessons.

### ✅ Reorderable Blocks
Use the up/down arrows to change the order of content blocks.

---

## Database Tables

### `courses`
- Stores course-level information
- Fields: id, name, description

### `modules`
- Stores module information within courses
- Fields: course_id, module_number, name, description, bullet_points

### `lessons_metadata`
- Stores lesson metadata and card bullet points
- Fields: course_id, module_number, lesson_number, lesson_name, description, bullet_points

### `lessons`
- Stores actual lesson content blocks
- Fields: course_id, module_number, lesson_number, section_number, content_type, content, etc.

---

## Tips & Best Practices

1. **Always create in order**: Course → Module → Lesson → Content

2. **Use descriptive names**: Make it easy to find content later

3. **Bullet points for cards**: Keep them short and action-oriented

4. **Content variety**: Mix text, images, and videos for engaging lessons

5. **Test as you go**: View lessons in the Learning Hub after creating them

6. **Consistent naming**: Use similar naming patterns across lessons

---

## Troubleshooting

### Problem: Dropdowns are empty
**Solution**: Make sure you created courses/modules first before trying to create lessons

### Problem: Content not showing in Learning Hub
**Solution**:
- Check you selected the correct course/module/lesson
- Verify content was saved (check for success message)
- Try hard refresh: Ctrl+Shift+R

### Problem: Old content still showing
**Solution**: The auto-delete should handle this, but you can run `complete-reset-and-new-schema.sql` again to start fresh

---

## Next Steps

1. ✅ Run the SQL script to set up the database
2. ✅ Create your first course
3. ✅ Add modules to the course
4. ✅ Create lessons with bullet points
5. ✅ Add content blocks to lessons
6. ✅ View your content in the Learning Hub

---

## Support Files Created

- `complete-reset-and-new-schema.sql` - Database setup script
- `CurriculumUploadNew.jsx` - New upload tool (already integrated)
- App routing updated to use new tool

You now have complete control over your course content! 🎉
