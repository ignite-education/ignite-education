# Custom Suggested Questions Feature

This feature allows you to add custom suggested questions to **H2 heading sections** in the curriculum. These questions will appear in the Learning Hub when users scroll to that H2 section.

**Key Points:**
- Only **H2 headings** can have suggested questions
- Questions can be manually entered or auto-generated based on the section content
- The system only uses custom suggested questions (no auto-generated fallbacks)
- If an H2 section doesn't have a suggested question, no question button will be shown

## Setup Instructions

### 1. Apply Database Migration

You need to add a `suggested_question` column to the `lessons` table. Run the following SQL in your Supabase SQL Editor:

```sql
-- Add suggested_question column to lessons table
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS suggested_question TEXT;

-- Add comment to document the column
COMMENT ON COLUMN lessons.suggested_question IS 'Custom suggested question that appears when users scroll to this content section in the learning hub';
```

Alternatively, you can run the migration file directly:
- Navigate to your Supabase project dashboard
- Go to SQL Editor
- Click "New Query"
- Copy and paste the contents of `migrations/add_suggested_question.sql`
- Click "Run" to execute the migration

### 2. How to Use

#### Adding Suggested Questions (Curriculum Upload Page)

1. Navigate to `/admin/curriculum` in your application
2. Select the **Content** tab
3. Choose your course, module, and lesson
4. For each **H2 heading** block, you'll see a **"Suggested Question (Optional)"** section with:
   - An input field to manually enter a question
   - An **"Auto-generate"** button to generate a question based on the section content
5. To manually add a question: Type it into the input field
6. To auto-generate a question: Click the "Auto-generate" button
   - The system will analyze all content between this H2 and the next H2 (paragraphs, H3s, bullet lists, images, videos)
   - It will generate a thoughtful, open-ended question using AI
   - You can edit the generated question if needed
7. Save the lesson content

**Note:** Only H2 headings show the suggested question field. H1s, H3s, paragraphs, and other content types do not have this option.

#### How It Works (Learning Hub)

When users study content in the Learning Hub:
1. As they scroll through the lesson, the system tracks which H2 section is currently visible
2. When an H2 heading becomes the most visible (closest to the center of the viewport):
   - If you've added a **custom suggested question** for that H2 section, it will appear as a purple button in the chat sidebar
   - If the H2 has no custom question, **no suggested question will be shown** (the button will be hidden)
   - The question updates dynamically as users scroll to different H2 sections
3. Users can click the suggested question button to ask it to the AI tutor

**Important:** Only H2 headings trigger suggested questions. H1s, H3s, paragraphs, and other content do not show suggested questions even if scrolled to.

### 3. Features

- **H2-specific**: Only H2 headings can have suggested questions, keeping the interface focused on major sections
- **AI-powered generation**: Auto-generate questions based on section content with one click
- **Fully customizable**: Manually edit or write questions from scratch
- **Context-aware**: Auto-generated questions analyze all content between H2 sections (including H3s, paragraphs, bullet lists, images, and videos)
- **Clean interface**: When no suggested question is defined, the button is hidden rather than showing a generic prompt
- **Seamless integration**: Questions update automatically as users scroll through H2 sections
- **No breaking changes**: Existing content without suggested questions will simply not show a suggested question button

### 4. Best Practices

When writing suggested questions:
- Keep them concise and focused on the current section
- Frame them to encourage deeper understanding (e.g., "Why is X important?" instead of "What is X?")
- Use questions that the AI can answer based on the lesson context
- Avoid yes/no questions - prefer open-ended questions

### 5. Examples

**For an H2 heading "Product-Market Fit" (with subsections about definition, metrics, and examples):**
- Good: "How can I tell if my product has achieved product-market fit?"
- Good: "What metrics should I track to measure product-market fit?"
- Okay: "What is product-market fit?"

**For an H2 heading "User Research Methods" (with paragraphs about interviews, surveys, and usability testing):**
- Good: "What are effective ways to conduct user research on a limited budget?"
- Good: "How do I choose between interviews and surveys for my research?"
- Okay: "Can you explain more about user research?"

**For an H2 heading "The Product Development Lifecycle" (with a diagram and bullet points):**
- Good: "How can I apply this framework to my own product?"
- Good: "What stage is most critical in the product development lifecycle?"
- Okay: "What does this lifecycle include?"

## Technical Details

### Database Schema

The `lessons` table now includes:
- `suggested_question` (TEXT, nullable): Stores the custom suggested question for each content block

### Code Changes

1. **CurriculumUploadNew.jsx** ([src/pages/CurriculumUploadNew.jsx](src/pages/CurriculumUploadNew.jsx))
   - Added `suggestedQuestion` field to content blocks state
   - Added UI input field **only for H2 headings**
   - Added "Auto-generate" button that calls the backend API
   - Added `generateQuestionForH2()` function that extracts content between H2 sections
   - Updated save/load functions to handle suggested questions

2. **server.js** ([server.js](server.js))
   - Added new endpoint: `POST /api/generate-suggested-question`
   - Uses Claude AI (Haiku model) to generate contextual questions
   - Analyzes section content and generates open-ended questions focused on understanding and application

3. **LearningHub.jsx** ([src/components/LearningHub.jsx](src/components/LearningHub.jsx))
   - Updated `generateQuestionForSection()` to **only check H2 headings** for custom suggested questions
   - Removed all auto-generated question logic
   - Suggested question button is conditionally rendered (only shows when an H2 has a custom question)

### Backward Compatibility

- Existing lessons without suggested questions will not show a suggested question button
- The chat input remains available at all times for user-initiated questions
- No data migration needed for existing content
