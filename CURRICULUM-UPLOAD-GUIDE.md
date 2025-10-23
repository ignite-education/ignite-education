# Curriculum Upload Guide

This guide explains how to upload your curriculum content (titles, subtitles, text, images, and YouTube videos) to the Ignite Learning Platform.

## 🚀 Quick Start

### Step 1: Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `curriculum-content-schema.sql`
4. Click "Run" to create the necessary tables and columns

### Step 2: Access the Upload Interface

Navigate to: **`http://localhost:5174/admin/curriculum`**

(Or your production URL: `https://yourdomain.com/admin/curriculum`)

## 📝 How to Upload Content

### Lesson Information

First, fill in the lesson metadata:

- **Course ID**: Default is `product-management`
- **Module #**: The module number (e.g., 1, 2, 3)
- **Lesson #**: The lesson number within the module (e.g., 1, 2, 3)
- **Lesson Name**: The display name (e.g., "Introduction to Product Management")

### Content Blocks

Your curriculum is composed of different content block types:

#### 1. **Heading Block**
- Select heading level (H1, H2, or H3)
- Enter heading text
- Use for titles and section headers

#### 2. **Paragraph Block**
- Enter plain text content
- Perfect for body text and explanations
- Supports multi-line text

#### 3. **Image Block**
- Click "Choose File" to select an image
- Image is automatically uploaded to Supabase Storage
- Add alt text (for accessibility)
- Add optional caption

**Supported formats**: JPG, PNG, GIF, WebP

#### 4. **YouTube Block**
- Enter YouTube Video ID (from the URL)
  - Example: For `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
  - Video ID is: `dQw4w9WgXcQ`
- Add video title
- Preview appears automatically

### Managing Blocks

- **Add Block**: Click the "+ Heading", "+ Paragraph", "+ Image", or "+ YouTube" buttons
- **Reorder**: Use ↑ and ↓ arrows to move blocks up or down
- **Delete**: Click the trash icon to remove a block
- **Preview**: Click "Preview" to see how content will look

### Saving Content

1. Ensure all required fields are filled
2. Click "Save Lesson"
3. Content is saved to the database
4. Form resets for the next lesson

## 📂 Database Structure

### Option 1: Single Lessons Table (Current)

Each content block is stored as a row in the `lessons` table:

```sql
{
  module_number: 1,
  lesson_number: 1,
  section_number: 1,  -- Order of blocks
  lesson_name: "Introduction",
  title: "Welcome to Product Management",
  content_type: "heading|paragraph|image|youtube",
  content: {
    // Structure varies by type
  }
}
```

### Content Type Structures

**Heading:**
```json
{
  "text": "Introduction to Product Management",
  "level": 1
}
```

**Paragraph:**
```json
"Your text content here..."
```

**Image:**
```json
{
  "url": "https://storage.url/image.jpg",
  "alt": "Description",
  "caption": "Optional caption"
}
```

**YouTube:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Video Title"
}
```

## 🎨 Rendering Content in LearningHub

The `LearningHub` component should be updated to render different content types:

```jsx
// Example rendering logic
{sections.map((section) => {
  switch(section.content_type) {
    case 'heading':
      const HeadingTag = `h${section.content.level}`;
      return <HeadingTag>{section.content.text}</HeadingTag>;

    case 'paragraph':
      return <p>{section.content}</p>;

    case 'image':
      return (
        <figure>
          <img src={section.content.url} alt={section.content.alt} />
          {section.content.caption && <figcaption>{section.content.caption}</figcaption>}
        </figure>
      );

    case 'youtube':
      return (
        <iframe
          src={`https://www.youtube.com/embed/${section.content.videoId}`}
          title={section.content.title}
          allowFullScreen
        />
      );
  }
})}
```

## 🔒 Security & Permissions

### Current Setup
- All authenticated users can upload content
- This is for development/testing only

### Production Setup
You should implement admin-only access:

1. Create an `admin_users` table in Supabase
2. Update RLS policies to check admin status
3. Add admin check in the upload route:

```jsx
// In ProtectedRoute or similar
const isAdmin = user?.email === 'admin@ignite.education';
if (!isAdmin) {
  return <Navigate to="/" />;
}
```

## 💾 Image Storage

Images are stored in Supabase Storage in the `assets` bucket:
- Path: `curriculum/{timestamp}.{ext}`
- Public URLs are generated automatically
- Supported formats: JPG, PNG, GIF, WebP

### Storage Bucket Setup

If not already created:
1. Go to Supabase Storage
2. Create a bucket named `assets`
3. Set it to **public** access
4. Configure CORS if needed

## 📊 Example Workflow

### Creating Module 1, Lesson 1: "Introduction"

1. Set Module # = 1, Lesson # = 1
2. Set Lesson Name = "Introduction"
3. Add blocks in order:
   - Heading (H1): "Welcome to Product Management"
   - Paragraph: "In this course, you'll learn..."
   - Image: Upload course overview diagram
   - YouTube: Add intro video
   - Heading (H2): "What You'll Learn"
   - Paragraph: "This course covers..."
4. Click "Save Lesson"

### Creating Module 1, Lesson 2: "Core Concepts"

1. Set Module # = 1, Lesson # = 2
2. Set Lesson Name = "Core Concepts"
3. Add content blocks...
4. Click "Save Lesson"

## 🐛 Troubleshooting

### Images not uploading?
- Check Supabase Storage bucket exists
- Verify bucket is set to public
- Check file size (max 50MB by default)

### YouTube videos not showing?
- Verify Video ID is correct (11 characters)
- Check network connection
- Ensure iframe is allowed in your CSP policy

### Content not saving?
- Check browser console for errors
- Verify all required fields are filled
- Check Supabase logs for database errors

## 🔄 Migrating Existing Content

If you have existing content in a different format:

1. Export to JSON/CSV
2. Write a migration script to transform data
3. Bulk insert using Supabase API
4. Or use the upload interface for manual entry

## 🎯 Best Practices

1. **Consistent Structure**: Keep similar lessons structured the same way
2. **Image Optimization**: Compress images before upload
3. **YouTube**: Use unlisted videos for course-only content
4. **Headings**: Use H1 for main titles, H2 for sections, H3 for subsections
5. **Testing**: Preview before saving to ensure correct formatting

## 📱 Mobile Responsiveness

The upload interface is desktop-focused. For best experience:
- Use desktop/laptop for uploading
- Mobile devices can view content in LearningHub
- Consider tablet for quick edits

## 🚀 Next Steps

1. Run the database schema SQL
2. Access `/admin/curriculum`
3. Start uploading your first lesson
4. Update LearningHub to render new content types
5. Test on different devices

---

**Need Help?** Check the console logs or contact support at hello@ignite.education
