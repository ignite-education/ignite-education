import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, MoveUp, MoveDown, Save, ArrowLeft, Image as ImageIcon, Youtube, List as ListIcon } from 'lucide-react';
import CourseManagement from '../components/CourseManagement';

const CurriculumUploadNew = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses'); // 'courses', 'modules', 'lessons', 'content'

  // Course state
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [tutorPosition, setTutorPosition] = useState('');
  const [tutorDescription, setTutorDescription] = useState('');
  const [tutorImage, setTutorImage] = useState('');
  const [linkedinLink, setLinkedinLink] = useState('');
  const [calendlyLink, setCalendlyLink] = useState('');

  // Module state
  const [modules, setModules] = useState([]);
  const [selectedModuleNumber, setSelectedModuleNumber] = useState(1);
  const [moduleName, setModuleName] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleBulletPoints, setModuleBulletPoints] = useState(['']);

  // Lesson state
  const [lessons, setLessons] = useState([]);
  const [selectedLessonNumber, setSelectedLessonNumber] = useState(1);
  const [lessonName, setLessonName] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonBulletPoints, setLessonBulletPoints] = useState(['', '', '']); // 3 bullet points for cards

  // Content state
  const [contentBlocks, setContentBlocks] = useState([
    { id: Date.now(), type: 'heading', content: { text: '', level: 2 } }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [generatedFlashcards, setGeneratedFlashcards] = useState([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadModules(selectedCourseId);
      // Load course details when course is selected
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      if (selectedCourse) {
        setCourseName(selectedCourse.name || '');
        setCourseDescription(selectedCourse.description || '');
        setTutorName(selectedCourse.tutor_name || '');
        setTutorPosition(selectedCourse.tutor_position || '');
        setTutorDescription(selectedCourse.tutor_description || '');
        setTutorImage(selectedCourse.tutor_image || '');
        setLinkedinLink(selectedCourse.linkedin_link || '');
        setCalendlyLink(selectedCourse.calendly_link || '');
      }
    }
  }, [selectedCourseId, courses]);

  useEffect(() => {
    if (selectedCourseId && selectedModuleNumber) {
      loadLessons(selectedCourseId, selectedModuleNumber);
    }
  }, [selectedCourseId, selectedModuleNumber]);

  useEffect(() => {
    if (selectedCourseId && selectedModuleNumber && selectedLessonNumber) {
      loadLessonContent(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
      loadFlashcards(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
    }
  }, [selectedCourseId, selectedModuleNumber, selectedLessonNumber]);

  // Auto-resize all paragraph textareas when content loads
  useEffect(() => {
    const resizeTextareas = () => {
      contentBlocks.forEach((block) => {
        if (block.type === 'paragraph') {
          const textarea = document.getElementById(`paragraph-${block.id}`);
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
          }
        }
      });
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(resizeTextareas, 100);
    return () => clearTimeout(timer);
  }, [contentBlocks]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('id');
      if (error) throw error;
      setCourses(data || []);
      if (data && data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadModules = async (courseId) => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_number');
      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadLessons = async (courseId, moduleNumber) => {
    try {
      const { data, error } = await supabase
        .from('lessons_metadata')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .order('lesson_number');
      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const loadLessonContent = async (courseId, moduleNumber, lessonNumber) => {
    setIsLoadingContent(true);
    try {
      // Load lesson metadata
      const { data: metadata, error: metadataError } = await supabase
        .from('lessons_metadata')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber)
        .single();

      if (metadataError && metadataError.code !== 'PGRST116') {
        console.error('Error loading lesson metadata:', metadataError);
      }

      if (metadata) {
        setLessonName(metadata.lesson_name || '');
        setLessonDescription(metadata.description || '');
        setLessonBulletPoints(metadata.bullet_points || ['', '', '']);
      } else {
        // No metadata exists, reset to defaults
        setLessonName('');
        setLessonDescription('');
        setLessonBulletPoints(['', '', '']);
      }

      // Load lesson content blocks
      const { data: content, error: contentError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber)
        .order('section_number');

      if (contentError) {
        console.error('Error loading lesson content:', contentError);
        setIsLoadingContent(false);
        return;
      }

      if (content && content.length > 0) {
        // Convert database content to content blocks
        const blocks = content.map((section, index) => {
          let blockContent;

          // Handle different content types
          if (section.content_type === 'paragraph') {
            // Paragraphs expect a plain string
            blockContent = section.content_text ||
                          (typeof section.content === 'string' ? section.content :
                           (section.content?.text || ''));
          } else {
            // Other types (heading, bulletlist, image, youtube) expect objects
            blockContent = section.content || { text: section.content_text || '' };
          }

          return {
            id: section.id || Date.now() + index,
            type: section.content_type || 'paragraph',
            content: blockContent,
            suggestedQuestion: section.suggested_question || '' // Load suggested question from database
          };
        });
        setContentBlocks(blocks);
      } else {
        // No existing content, reset to default
        setContentBlocks([
          { id: Date.now(), type: 'heading', content: { text: '', level: 2 }, suggestedQuestion: '' }
        ]);
      }
    } catch (error) {
      console.error('Error loading lesson content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const loadFlashcards = async (courseId, moduleNumber, lessonNumber) => {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber)
        .order('created_at');

      if (error) {
        console.error('Error loading flashcards:', error);
        setGeneratedFlashcards([]);
        return;
      }

      setGeneratedFlashcards(data || []);
    } catch (error) {
      console.error('Error loading flashcards:', error);
      setGeneratedFlashcards([]);
    }
  };

  // Course management
  const saveCourse = async () => {
    if (!selectedCourseId.trim() || !courseName.trim()) {
      alert('Please enter course ID and name');
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('courses')
        .upsert({
          id: selectedCourseId,
          name: courseName,
          description: courseDescription,
          tutor_name: tutorName,
          tutor_position: tutorPosition,
          tutor_description: tutorDescription,
          tutor_image: tutorImage,
          linkedin_link: linkedinLink,
          calendly_link: calendlyLink
        });

      if (error) throw error;
      alert('Course saved successfully!');
      await loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert(`Failed to save course: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Module management
  const saveModule = async () => {
    if (!selectedCourseId || !moduleName.trim()) {
      alert('Please select a course and enter module name');
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('modules')
        .upsert({
          course_id: selectedCourseId,
          module_number: selectedModuleNumber,
          name: moduleName,
          description: moduleDescription,
          bullet_points: moduleBulletPoints.filter(bp => bp.trim())
        }, {
          onConflict: 'course_id,module_number'
        });

      if (error) throw error;
      alert('Module saved successfully!');
      await loadModules(selectedCourseId);
      setModuleName('');
      setModuleDescription('');
      setModuleBulletPoints(['']);
    } catch (error) {
      console.error('Error saving module:', error);
      alert(`Failed to save module: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete functions
  const deleteCourse = async (courseId) => {
    if (!confirm(`Are you sure you want to delete the course "${courseId}"? This will delete ALL modules, lessons, and content associated with it.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
      alert('Course deleted successfully!');
      await loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(`Failed to delete course: ${error.message}`);
    }
  };

  const deleteModule = async (moduleId, moduleName) => {
    if (!confirm(`Are you sure you want to delete "${moduleName}"? This will delete ALL lessons and content in this module.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      alert('Module deleted successfully!');
      await loadModules(selectedCourseId);
    } catch (error) {
      console.error('Error deleting module:', error);
      alert(`Failed to delete module: ${error.message}`);
    }
  };

  const deleteLesson = async (lessonId, lessonName) => {
    if (!confirm(`Are you sure you want to delete "${lessonName}"? This will delete the lesson metadata and ALL content for this lesson.`)) {
      return;
    }

    try {
      // Delete lesson metadata
      const { error: metadataError } = await supabase
        .from('lessons_metadata')
        .delete()
        .eq('id', lessonId);

      if (metadataError) throw metadataError;

      // Delete lesson content
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson) {
        const { error: contentError } = await supabase
          .from('lessons')
          .delete()
          .eq('course_id', lesson.course_id)
          .eq('module_number', lesson.module_number)
          .eq('lesson_number', lesson.lesson_number);

        if (contentError) console.error('Error deleting lesson content:', contentError);
      }

      alert('Lesson deleted successfully!');
      await loadLessons(selectedCourseId, selectedModuleNumber);
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert(`Failed to delete lesson: ${error.message}`);
    }
  };

  // Lesson metadata management
  const saveLessonMetadata = async () => {
    if (!selectedCourseId || !lessonName.trim()) {
      alert('Please select a course and enter lesson name');
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from('lessons_metadata')
        .upsert({
          course_id: selectedCourseId,
          module_number: selectedModuleNumber,
          lesson_number: selectedLessonNumber,
          lesson_name: lessonName,
          description: lessonDescription,
          bullet_points: lessonBulletPoints.filter(bp => bp.trim())
        }, {
          onConflict: 'course_id,module_number,lesson_number'
        });

      if (error) throw error;
      alert('Lesson metadata saved successfully!');
      await loadLessons(selectedCourseId, selectedModuleNumber);
      setLessonName('');
      setLessonDescription('');
      setLessonBulletPoints(['', '', '']);
    } catch (error) {
      console.error('Error saving lesson metadata:', error);
      alert(`Failed to save lesson: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Content management
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'youtube' ? { videoId: '', title: '' } :
              type === 'image' ? { url: '', alt: '', caption: '', width: 'medium' } :
              type === 'heading' ? { text: '', level: 2 } :
              type === 'bulletlist' ? { items: [''] } :
              type === 'list' ? { type: 'unordered', items: [''] } : '',
      suggestedQuestion: '' // Add suggested question field
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const addBlockAt = (type, index) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'youtube' ? { videoId: '', title: '' } :
              type === 'image' ? { url: '', alt: '', caption: '', width: 'medium' } :
              type === 'heading' ? { text: '', level: 2 } :
              type === 'bulletlist' ? { items: [''] } :
              type === 'list' ? { type: 'unordered', items: [''] } : '',
      suggestedQuestion: ''
    };
    const newBlocks = [...contentBlocks];
    newBlocks.splice(index, 0, newBlock);
    setContentBlocks(newBlocks);
  };

  const removeBlock = (id) => {
    setContentBlocks(contentBlocks.filter(block => block.id !== id));
  };

  const moveBlockUp = (index) => {
    if (index === 0) return;
    const newBlocks = [...contentBlocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setContentBlocks(newBlocks);
  };

  const moveBlockDown = (index) => {
    if (index === contentBlocks.length - 1) return;
    const newBlocks = [...contentBlocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setContentBlocks(newBlocks);
  };

  const updateBlock = (id, content) => {
    setContentBlocks(contentBlocks.map(block =>
      block.id === id ? { ...block, content } : block
    ));
  };

  // Generate a suggested question for an H2 heading based on content between H2s
  const generateQuestionForH2 = async (h2Index) => {
    const h2Block = contentBlocks[h2Index];
    if (!h2Block || h2Block.type !== 'heading' || h2Block.content?.level !== 2) {
      return '';
    }

    // Find all content blocks between this H2 and the next H2 (or end)
    let nextH2Index = contentBlocks.findIndex((block, idx) =>
      idx > h2Index && block.type === 'heading' && block.content?.level === 2
    );
    if (nextH2Index === -1) nextH2Index = contentBlocks.length;

    const sectionBlocks = contentBlocks.slice(h2Index, nextH2Index);

    // Extract content as text
    const sectionContent = sectionBlocks.map(block => {
      if (block.type === 'heading') {
        const level = block.content?.level || 2;
        const text = block.content?.text || '';
        return `${'#'.repeat(level)} ${text}`;
      } else if (block.type === 'paragraph') {
        return block.content || '';
      } else if (block.type === 'bulletlist') {
        return block.content?.items?.map(item => `• ${item}`).join('\n') || '';
      } else if (block.type === 'youtube') {
        return `[Video: ${block.content?.title || 'YouTube video'}]`;
      } else if (block.type === 'image') {
        return `[Image: ${block.content?.caption || block.content?.alt || 'Image'}]`;
      }
      return '';
    }).filter(Boolean).join('\n\n');

    // Call API to generate question
    try {
      const response = await fetch('https://ignite-education-api.onrender.com/api/generate-suggested-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionContent })
      });

      const data = await response.json();
      if (data.success) {
        return data.question;
      } else {
        alert('Failed to generate question: ' + (data.error || 'Unknown error'));
        return '';
      }
    } catch (error) {
      console.error('Error generating question:', error);
      alert('Error generating question. Make sure the backend server is running.');
      return '';
    }
  };

  const uploadImage = async (file, blockId) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `curriculum/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) {
        // Provide specific error message for RLS policy violations
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          throw new Error('Permission denied: Please configure Row-Level Security policies in Supabase for the assets bucket. You need an INSERT policy for authenticated users.');
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      updateBlock(blockId, { url: data.publicUrl, alt: '', caption: '' });
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
    }
  };

  const saveContent = async () => {
    if (!selectedCourseId || !lessonName.trim()) {
      alert('Please select a course and enter lesson name');
      return;
    }

    setIsUploading(true);
    try {
      // Delete existing content for this lesson
      const { error: deleteError } = await supabase
        .from('lessons')
        .delete()
        .eq('course_id', selectedCourseId)
        .eq('module_number', selectedModuleNumber)
        .eq('lesson_number', selectedLessonNumber);

      if (deleteError) console.error('Error deleting old content:', deleteError);

      // Insert new content blocks
      const blocksToInsert = contentBlocks.map((block, index) => ({
        course_id: selectedCourseId,
        module_number: selectedModuleNumber,
        lesson_number: selectedLessonNumber,
        section_number: index + 1,
        lesson_name: lessonName,
        title: block.type === 'heading' ? (typeof block.content === 'object' ? block.content.text : block.content) : `Section ${index + 1}`,
        content_type: block.type,
        content: typeof block.content === 'object' ? block.content : { text: block.content },
        content_text: typeof block.content === 'string' ? block.content :
                     block.type === 'heading' && block.content.text ? block.content.text :
                     block.type === 'youtube' && block.content.title ? block.content.title :
                     block.type === 'bulletlist' && block.content.items ? block.content.items.join(', ') : '',
        order_index: index,
        suggested_question: block.suggestedQuestion || null // Save suggested question
      }));

      const { data, error } = await supabase
        .from('lessons')
        .insert(blocksToInsert)
        .select();

      if (error) throw error;

      alert(`Successfully saved ${data.length} content blocks!`);
      setContentBlocks([{ id: Date.now(), type: 'heading', content: { text: '', level: 2 } }]);
    } catch (error) {
      console.error('Error saving content:', error);
      alert(`Failed to save content: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const generateFlashcards = async () => {
    if (!selectedCourseId || !lessonName.trim() || contentBlocks.length === 0) {
      alert('Please select a course, enter lesson name, and add content before generating flashcards');
      return;
    }

    if (!confirm('This will generate 15 flashcards based on the current lesson content. Continue?')) {
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      // Build lesson context from content blocks
      const lessonContext = `
Lesson: ${lessonName}
Module: ${selectedModuleNumber}

Sections:
${contentBlocks.map((block, index) => {
  let blockContent = '';
  if (block.type === 'heading') {
    const text = typeof block.content === 'object' ? block.content.text : block.content;
    const level = typeof block.content === 'object' ? block.content.level : 2;
    blockContent = `${'#'.repeat(level)} ${text}`;
  } else if (block.type === 'text') {
    blockContent = typeof block.content === 'object' ? block.content.text : block.content;
  } else if (block.type === 'bulletlist') {
    const items = typeof block.content === 'object' ? block.content.items : [];
    blockContent = items.map(item => `• ${item}`).join('\n');
  } else if (block.type === 'youtube') {
    const title = typeof block.content === 'object' ? block.content.title : '';
    blockContent = `[Video: ${title}]`;
  }
  return `Section ${index + 1}:\n${blockContent}`;
}).join('\n\n---\n\n')}
      `.trim();

      // Call API to generate flashcards
      const response = await fetch('https://ignite-education-api.onrender.com/api/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          moduleNumber: selectedModuleNumber,
          lessonNumber: selectedLessonNumber,
          lessonContext
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Server error response:', data);
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (!data.success || !data.flashcards || data.flashcards.length === 0) {
        throw new Error(data.error || 'Failed to generate flashcards');
      }

      // Delete existing flashcards for this lesson
      const { error: deleteError } = await supabase
        .from('flashcards')
        .delete()
        .eq('course_id', selectedCourseId)
        .eq('module_number', selectedModuleNumber)
        .eq('lesson_number', selectedLessonNumber);

      if (deleteError) console.warn('Warning deleting existing flashcards:', deleteError);

      // Insert new flashcards
      const flashcardsToInsert = data.flashcards.map(card => ({
        course_id: selectedCourseId,
        module_number: selectedModuleNumber,
        lesson_number: selectedLessonNumber,
        question: card.question,
        answer: card.answer
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('flashcards')
        .insert(flashcardsToInsert)
        .select();

      if (insertError) throw insertError;

      // Reload flashcards to display them
      await loadFlashcards(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
      setShowFlashcards(true);

      // Show count and warn if not exactly 15
      const successMessage = insertedData.length === 15
        ? `✅ Successfully generated and saved ${insertedData.length} flashcards!\n\nYou can view them below.`
        : `⚠️ Generated ${insertedData.length} flashcards (expected 15).\n\nThe AI might need more content to generate 15 quality questions. Consider adding more detail to your lesson or try regenerating.\n\nFlashcards have been saved and you can view them below.`;

      alert(successMessage);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert(`Failed to generate flashcards: ${error.message}`);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Helper to render text with highlights (for preview)
  const renderTextWithHighlight = (text) => {
    if (!text) return null;
    return text;
  };

  // Preview modal rendering function (matches LearningHub rendering)
  const renderPreviewContent = () => {
    if (!lessonName || contentBlocks.length === 0) {
      return (
        <div className="text-center text-gray-400 py-12">
          <p>No content to preview yet.</p>
          <p className="text-sm mt-2">Add a lesson name and content blocks to see the preview.</p>
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {/* Lesson Title */}
        <div style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
          <p className="text-xl font-medium" style={{ color: '#EF0B72', marginBottom: '0.25rem' }}>
            Lesson {selectedLessonNumber}
          </p>
          <div className="bg-black text-white px-3 flex items-center" style={{ borderRadius: '0.2rem', paddingTop: '1rem', paddingBottom: '1rem', maxWidth: '750px', width: 'fit-content' }}>
            <h1 className="text-3xl font-medium text-left">{lessonName}</h1>
          </div>
        </div>

        {/* Content Blocks */}
        {contentBlocks.map((block, index) => {
          if (block.type === 'heading') {
            const level = block.content?.level || 2;
            const text = block.content?.text || '';

            // Render heading text with underline formatting
            const renderHeadingText = (text) => {
              const parts = text.split(/(__[^_]+__)/g);
              return parts.map((part, i) => {
                if (part.startsWith('__') && part.endsWith('__')) {
                  const innerText = part.slice(2, -2);
                  return <u key={i}>{innerText}</u>;
                }
                return <span key={i}>{part}</span>;
              });
            };

            // For h2 headings, wrap in black box
            if (level === 2) {
              return (
                <div key={index} className="bg-black text-white flex items-center mb-2" style={{ borderRadius: '0.2rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', paddingLeft: '0.5rem', paddingRight: '0.5rem', maxWidth: '750px', width: 'fit-content', marginTop: '3rem' }}>
                  <h2 className="font-medium" style={{ fontSize: '1.4rem' }}>
                    {renderHeadingText(text)}
                  </h2>
                </div>
              );
            }

            const HeadingTag = `h${level}`;
            return React.createElement(HeadingTag, {
              key: index,
              className: level === 3 ? 'text-xl font-bold mt-8 mb-2' : 'text-3xl font-bold mt-8 mb-2'
            }, renderHeadingText(text));
          }

          if (block.type === 'paragraph') {
            const text = block.content || '';

            // Helper function to render text with bold, underline, italic, and link formatting
            const renderTextWithBold = (text) => {
              const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\[([^\]]+)\]\(([^)]+)\)|(?<!\*)\*(?!\*)([^*]+)\*(?!\*))/g);

              return parts.map((part, i) => {
                if (part === undefined) return null;

                // Check for link format [text](url)
                const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

                if (linkMatch) {
                  const linkText = linkMatch[1];
                  const url = linkMatch[2];
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {linkText}
                    </a>
                  );
                } else if (part.startsWith('**') && part.endsWith('**')) {
                  const innerText = part.slice(2, -2);
                  return <strong key={i} className="font-semibold">{innerText}</strong>;
                } else if (part.startsWith('__') && part.endsWith('__')) {
                  const innerText = part.slice(2, -2);
                  return <u key={i}>{innerText}</u>;
                } else if (part.match(/^(?<!\*)\*(?!\*)([^*]+)\*(?!\*)$/)) {
                  const innerText = part.slice(1, -1);
                  return <em key={i}>{innerText}</em>;
                }
                return <span key={i}>{part}</span>;
              });
            };

            // Check if text contains bullet points or newlines
            const lines = text.split('\n');
            const hasBullets = lines.some(line => /^[•\-]\s/.test(line.trim()));
            const hasMultipleLines = lines.filter(line => line.trim()).length > 1;

            if (hasBullets || hasMultipleLines) {
              return (
                <div key={index} className="mb-6">
                  {lines.map((line, idx) => {
                    const trimmedLine = line.trim();
                    if (/^[•\-]\s/.test(trimmedLine)) {
                      const bulletText = trimmedLine.replace(/^[•\-]\s+/, '');
                      return (
                        <div key={idx} className="flex items-start gap-2 mb-1">
                          <span className="text-black mt-1">•</span>
                          <span className="text-base leading-relaxed flex-1">
                            {renderTextWithBold(bulletText)}
                          </span>
                        </div>
                      );
                    } else if (trimmedLine) {
                      return (
                        <p key={idx} className="text-base leading-relaxed mb-2">
                          {renderTextWithBold(line)}
                        </p>
                      );
                    } else if (hasMultipleLines) {
                      return <div key={idx} className="h-2"></div>;
                    }
                    return null;
                  })}
                </div>
              );
            }

            return (
              <p key={index} className="text-base leading-relaxed mb-6">
                {renderTextWithBold(text)}
              </p>
            );
          }

          if (block.type === 'bulletlist') {
            const items = block.content?.items || [];
            return (
              <ul key={index} className="list-disc list-inside space-y-2 mb-6">
                {items.map((item, idx) => (
                  <li key={idx} className="text-base leading-relaxed">{item}</li>
                ))}
              </ul>
            );
          }

          if (block.type === 'image') {
            const imageData = block.content || {};
            const widthClass =
              imageData.width === 'small' ? 'max-w-sm' :
              imageData.width === 'medium' ? 'max-w-md' :
              imageData.width === 'large' ? 'max-w-lg' :
              imageData.width === 'xl' ? 'max-w-xl' :
              imageData.width === '2xl' ? 'max-w-2xl' :
              imageData.width === 'full' ? 'max-w-full' :
              'max-w-lg';

            return (
              <div key={index} className="my-8 flex flex-col items-center">
                {imageData.url && (
                  <>
                    <img
                      src={imageData.url}
                      alt={imageData.alt || ''}
                      className={`${widthClass} rounded-lg shadow-lg`}
                    />
                    {imageData.caption && (
                      <p className="text-sm text-gray-600 mt-2 italic">{imageData.caption}</p>
                    )}
                  </>
                )}
              </div>
            );
          }

          if (block.type === 'youtube') {
            const videoData = block.content || {};
            const videoId = videoData.videoId;

            return (
              <div key={index} className="my-8">
                {videoData.title && (
                  <h3 className="text-xl font-bold mb-4">{videoData.title}</h3>
                )}
                {videoId && (
                  <div className="aspect-w-16 aspect-h-9">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={videoData.title || 'YouTube video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-96 rounded-lg shadow-lg"
                    />
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const renderBlockEditor = (block, index) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <select
                value={typeof block.content === 'object' ? block.content.level : 2}
                onChange={(e) => updateBlock(block.id, {
                  text: typeof block.content === 'object' ? block.content.text : block.content,
                  level: parseInt(e.target.value)
                })}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
              >
                <option value={2} className="bg-gray-900 text-white">H2</option>
                <option value={3} className="bg-gray-900 text-white">H3</option>
              </select>
              <input
                id={`heading-${block.id}`}
                type="text"
                placeholder="Heading text... (Use __text__ for underline)"
                value={typeof block.content === 'object' ? block.content.text : block.content}
                onChange={(e) => updateBlock(block.id, {
                  text: e.target.value,
                  level: typeof block.content === 'object' ? block.content.level : 2
                })}
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(`heading-${block.id}`);
                  const start = input.selectionStart;
                  const end = input.selectionEnd;
                  const text = (typeof block.content === 'object' ? block.content.text : block.content) || '';
                  const selectedText = text.substring(start, end);

                  if (selectedText) {
                    // Wrap selected text in underline markers
                    const newText = text.substring(0, start) + '__' + selectedText + '__' + text.substring(end);
                    updateBlock(block.id, {
                      text: newText,
                      level: typeof block.content === 'object' ? block.content.level : 2
                    });

                    // Restore cursor position after the underline markers
                    setTimeout(() => {
                      input.focus();
                      input.setSelectionRange(end + 4, end + 4);
                    }, 0);
                  } else {
                    // Insert underline markers at cursor position
                    const newText = text.substring(0, start) + '____' + text.substring(end);
                    updateBlock(block.id, {
                      text: newText,
                      level: typeof block.content === 'object' ? block.content.level : 2
                    });

                    // Place cursor between the markers
                    setTimeout(() => {
                      input.focus();
                      input.setSelectionRange(start + 2, start + 2);
                    }, 0);
                  }
                }}
                className="px-3 py-2 text-pink-400 hover:text-pink-300 font-medium bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
              >
                <u>U</u> Underline
              </button>
            </div>
            <div className="text-xs text-gray-400">
              Use __text__ to <u>underline</u> heading text
            </div>
          </div>
        );

      case 'paragraph':
        return (
          <div className="space-y-2">
            <textarea
              id={`paragraph-${block.id}`}
              placeholder="Enter paragraph text... (Use • or - for bullets, **text** for bold, *text* for italic, __text__ for underline)"
              value={block.content}
              onChange={(e) => {
                updateBlock(block.id, e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onInput={(e) => {
                // Auto-resize on input as well
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none min-h-[100px] resize-none overflow-hidden"
              style={{ height: 'auto' }}
            />
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex gap-4 items-center">
                <span>💡 Tips:</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentContent = block.content || '';
                    const lines = currentContent.split('\n');
                    const lastLine = lines[lines.length - 1];
                    const newContent = lastLine.trim() === ''
                      ? currentContent + '• '
                      : currentContent + '\n• ';
                    updateBlock(block.id, newContent);
                  }}
                  className="text-pink-400 hover:text-pink-300 font-medium transition"
                >
                  + Add bullet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.getElementById(`paragraph-${block.id}`);
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = block.content || '';
                    const selectedText = text.substring(start, end);

                    if (selectedText) {
                      // Wrap selected text in bold markers
                      const newText = text.substring(0, start) + '**' + selectedText + '**' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Restore cursor position after the bold markers
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(end + 4, end + 4);
                      }, 0);
                    } else {
                      // Insert bold markers at cursor position
                      const newText = text.substring(0, start) + '****' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Place cursor between the markers
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 2, start + 2);
                      }, 0);
                    }
                  }}
                  className="text-pink-400 hover:text-pink-300 font-medium transition"
                >
                  <strong>B</strong> Make bold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.getElementById(`paragraph-${block.id}`);
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = block.content || '';
                    const selectedText = text.substring(start, end);

                    if (selectedText) {
                      // Wrap selected text in italic markers
                      const newText = text.substring(0, start) + '*' + selectedText + '*' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Restore cursor position after the italic markers
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(end + 2, end + 2);
                      }, 0);
                    } else {
                      // Insert italic markers at cursor position
                      const newText = text.substring(0, start) + '**' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Place cursor between the markers
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 1, start + 1);
                      }, 0);
                    }
                  }}
                  className="text-pink-400 hover:text-pink-300 font-medium transition"
                >
                  <em>I</em> Make italic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.getElementById(`paragraph-${block.id}`);
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = block.content || '';
                    const selectedText = text.substring(start, end);

                    if (selectedText) {
                      // Wrap selected text in underline markers
                      const newText = text.substring(0, start) + '__' + selectedText + '__' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Restore cursor position after the underline markers
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(end + 4, end + 4);
                      }, 0);
                    } else {
                      // Insert underline markers at cursor position
                      const newText = text.substring(0, start) + '____' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Place cursor between the markers
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 2, start + 2);
                      }, 0);
                    }
                  }}
                  className="text-pink-400 hover:text-pink-300 font-medium transition"
                >
                  <u>U</u> Make underline
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const textarea = document.getElementById(`paragraph-${block.id}`);
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = block.content || '';
                    const selectedText = text.substring(start, end);

                    if (selectedText) {
                      // Prompt for URL
                      const url = prompt('Enter URL (e.g., https://example.com):');
                      if (url) {
                        // Wrap selected text in link markers [text](url)
                        const newText = text.substring(0, start) + '[' + selectedText + '](' + url + ')' + text.substring(end);
                        updateBlock(block.id, newText);

                        // Restore cursor position after the link
                        setTimeout(() => {
                          textarea.focus();
                          const newPos = start + selectedText.length + url.length + 4;
                          textarea.setSelectionRange(newPos, newPos);
                        }, 0);
                      }
                    } else {
                      // Insert link template at cursor position
                      const url = prompt('Enter URL (e.g., https://example.com):');
                      if (url) {
                        const linkText = prompt('Enter link text:') || 'link';
                        const newText = text.substring(0, start) + '[' + linkText + '](' + url + ')' + text.substring(end);
                        updateBlock(block.id, newText);

                        // Place cursor after the inserted link
                        setTimeout(() => {
                          textarea.focus();
                          const newPos = start + linkText.length + url.length + 4;
                          textarea.setSelectionRange(newPos, newPos);
                        }, 0);
                      }
                    }
                  }}
                  className="text-pink-400 hover:text-pink-300 font-medium bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 hover:bg-gray-700 transition"
                >
                  🔗 Add link
                </button>
              </div>
              <div className="text-gray-400">
                Use **text** for <strong>bold</strong> • Use *text* for <em>italic</em> • Use __text__ for <u>underline</u> • Use [text](url) for <a href="#" className="text-blue-600 underline">links</a> • Use • or - for bullet points
              </div>
            </div>
          </div>
        );

      case 'bulletlist':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Bullet Points:</label>
            {(block.content.items || ['']).map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Bullet point ${idx + 1}...`}
                  value={item}
                  onChange={(e) => {
                    const newItems = [...block.content.items];
                    newItems[idx] = e.target.value;
                    updateBlock(block.id, { items: newItems });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
                {idx === block.content.items.length - 1 && (
                  <button
                    onClick={() => updateBlock(block.id, { items: [...block.content.items, ''] })}
                    className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                  >
                    + Add
                  </button>
                )}
                {block.content.items.length > 1 && (
                  <button
                    onClick={() => {
                      const newItems = block.content.items.filter((_, i) => i !== idx);
                      updateBlock(block.id, { items: newItems });
                    }}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  uploadImage(e.target.files[0], block.id);
                }
              }}
              className="block w-full text-sm"
            />
            {block.content.url && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Image Size</label>
                  <select
                    value={block.content.width || 'medium'}
                    onChange={(e) => updateBlock(block.id, { ...block.content, width: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                  >
                    <option value="small">Small (max-w-sm - 384px)</option>
                    <option value="medium">Medium (max-w-md - 448px)</option>
                    <option value="large">Large (max-w-lg - 512px)</option>
                    <option value="xl">Extra Large (max-w-xl - 576px)</option>
                    <option value="2xl">2X Large (max-w-2xl - 672px)</option>
                    <option value="full">Full Width (max-w-full)</option>
                  </select>
                </div>
                <img
                  src={block.content.url}
                  alt={block.content.alt}
                  className={`rounded-lg ${
                    block.content.width === 'small' ? 'max-w-sm' :
                    block.content.width === 'medium' ? 'max-w-md' :
                    block.content.width === 'large' ? 'max-w-lg' :
                    block.content.width === 'xl' ? 'max-w-xl' :
                    block.content.width === '2xl' ? 'max-w-2xl' :
                    block.content.width === 'full' ? 'max-w-full' :
                    'max-w-md'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Alt text"
                  value={block.content.alt}
                  onChange={(e) => updateBlock(block.id, { ...block.content, alt: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={block.content.caption || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, caption: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </>
            )}
          </div>
        );

      case 'youtube':
        return (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="YouTube Video ID (e.g., dQw4w9WgXcQ)"
              value={block.content.videoId || ''}
              onChange={(e) => updateBlock(block.id, { ...block.content, videoId: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Video title (optional)"
              value={block.content.title || ''}
              onChange={(e) => updateBlock(block.id, { ...block.content, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            {block.content.videoId && (
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src={`https://www.youtube.com/embed/${block.content.videoId}`}
                  title={block.content.title || 'YouTube video'}
                  className="w-full h-64 rounded-lg"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-900 rounded-lg transition text-white">
              <ArrowLeft size={24} />
            </button>
            <div
              style={{
                backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                width: '108.8px',
                height: '36px',
                marginLeft: '-5.44px'
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 mb-6">
          <div className="flex border-b border-gray-800">
            {['courses', 'modules', 'lessons', 'content'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-pink-500 text-pink-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <CourseManagement />
            )}

            {/* Modules Tab */}
            {activeTab === 'modules' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-white">Manage Modules</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Module Number</label>
                    <input
                      type="number"
                      value={selectedModuleNumber}
                      onChange={(e) => setSelectedModuleNumber(parseInt(e.target.value))}
                      min="1"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Module Name</label>
                    <input
                      type="text"
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                      placeholder="e.g., Introduction to Product Manager"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                    <textarea
                      value={moduleDescription}
                      onChange={(e) => setModuleDescription(e.target.value)}
                      placeholder="Module description..."
                      className="w-full px-4 py-2 border rounded-lg min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Bullet Points</label>
                    {moduleBulletPoints.map((bp, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={bp}
                          onChange={(e) => {
                            const newBps = [...moduleBulletPoints];
                            newBps[idx] = e.target.value;
                            setModuleBulletPoints(newBps);
                          }}
                          placeholder={`Bullet point ${idx + 1}...`}
                          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                        />
                        {idx === moduleBulletPoints.length - 1 && (
                          <button
                            onClick={() => setModuleBulletPoints([...moduleBulletPoints, ''])}
                            className="px-3 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                          >
                            +
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={saveModule}
                    disabled={isUploading}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 transition"
                  >
                    {isUploading ? 'Saving...' : 'Save Module'}
                  </button>
                </div>

                {/* Existing Modules */}
                {modules.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-white">Existing Modules</h3>
                    <div className="space-y-2">
                      {modules.map((module) => (
                        <div key={module.id} className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-white">Module {module.module_number}: {module.name}</div>
                            {module.description && (
                              <div className="text-sm text-gray-600 mt-1">{module.description}</div>
                            )}
                            {module.bullet_points && module.bullet_points.length > 0 && (
                              <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                                {module.bullet_points.map((bp, idx) => (
                                  <li key={idx}>{bp}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <button
                            onClick={() => deleteModule(module.id, module.name)}
                            className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lessons Tab */}
            {activeTab === 'lessons' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-white">Manage Lessons</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Module</label>
                    <select
                      value={selectedModuleNumber}
                      onChange={(e) => setSelectedModuleNumber(parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    >
                      {modules.map((module) => (
                        <option key={module.module_number} value={module.module_number}>
                          Module {module.module_number}: {module.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Lesson Number</label>
                    <input
                      type="number"
                      value={selectedLessonNumber}
                      onChange={(e) => setSelectedLessonNumber(parseInt(e.target.value))}
                      min="1"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Lesson Name</label>
                    <input
                      type="text"
                      value={lessonName}
                      onChange={(e) => setLessonName(e.target.value)}
                      placeholder="e.g., What is a Product Manager?"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                    <textarea
                      value={lessonDescription}
                      onChange={(e) => setLessonDescription(e.target.value)}
                      placeholder="Lesson description..."
                      className="w-full px-4 py-2 border rounded-lg min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Bullet Points (for Upcoming Lessons Card)</label>
                    <p className="text-xs text-gray-500 mb-2">Add 3 bullet points that will appear on the upcoming lessons card</p>
                    {lessonBulletPoints.map((bp, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={bp}
                        onChange={(e) => {
                          const newBps = [...lessonBulletPoints];
                          newBps[idx] = e.target.value;
                          setLessonBulletPoints(newBps);
                        }}
                        placeholder={`Bullet point ${idx + 1}...`}
                        className="w-full px-4 py-2 border rounded-lg mb-2"
                      />
                    ))}
                  </div>
                  <button
                    onClick={saveLessonMetadata}
                    disabled={isUploading}
                    className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 transition"
                  >
                    {isUploading ? 'Saving...' : 'Save Lesson Info'}
                  </button>
                </div>

                {/* Existing Lessons */}
                {lessons.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-white">Existing Lessons</h3>
                    <div className="space-y-2">
                      {lessons.map((lesson) => (
                        <div key={lesson.id} className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-white">Lesson {lesson.lesson_number}: {lesson.lesson_name}</div>
                            {lesson.description && (
                              <div className="text-sm text-gray-600 mt-1">{lesson.description}</div>
                            )}
                            {lesson.bullet_points && lesson.bullet_points.length > 0 && (
                              <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                                {lesson.bullet_points.map((bp, idx) => (
                                  <li key={idx}>{bp}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <button
                            onClick={() => deleteLesson(lesson.id, lesson.lesson_name)}
                            className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-white">Manage Lesson Content</h2>

                {/* Lesson Selection */}
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Course</label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      >
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Module</label>
                      <select
                        value={selectedModuleNumber}
                        onChange={(e) => setSelectedModuleNumber(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      >
                        {modules.map((module) => (
                          <option key={module.module_number} value={module.module_number}>
                            Module {module.module_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Lesson</label>
                      <select
                        value={selectedLessonNumber}
                        onChange={(e) => {
                          const lessonNum = parseInt(e.target.value);
                          setSelectedLessonNumber(lessonNum);
                          // Content will be loaded automatically by useEffect
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      >
                        {lessons.map((lesson) => (
                          <option key={lesson.lesson_number} value={lesson.lesson_number}>
                            Lesson {lesson.lesson_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Loading Indicator */}
                {isLoadingContent && (
                  <div className="bg-purple-900/30 border border-purple-500/50 text-purple-200 px-4 py-3 rounded-lg flex items-center justify-center gap-3">
                    <img
                      src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_S_5.png"
                      alt="Loading"
                      className="w-8 h-8 object-contain animate-pulse"
                    />
                    <span>Loading lesson content...</span>
                  </div>
                )}

                {/* Lesson Metadata Section */}
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg space-y-3">
                  <h3 className="text-md font-semibold text-white mb-3">Lesson Information</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Bullet Points (for Upcoming Lessons Card)</label>
                    <p className="text-xs text-gray-500 mb-2">Add 3 bullet points that will appear on the upcoming lessons card</p>
                    {lessonBulletPoints.map((bp, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={bp}
                        onChange={(e) => {
                          const newBps = [...lessonBulletPoints];
                          newBps[idx] = e.target.value;
                          setLessonBulletPoints(newBps);
                        }}
                        placeholder={`Bullet point ${idx + 1}...`}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none mb-2"
                      />
                    ))}
                  </div>
                  <button
                    onClick={saveLessonMetadata}
                    disabled={isUploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {isUploading ? 'Saving...' : 'Save Lesson Info'}
                  </button>
                </div>

                {/* Content Block Buttons - Sticky */}
                <div className="sticky top-0 z-10 bg-gray-900 border border-gray-800 py-3 -mx-8 px-8 shadow-sm flex gap-2 flex-wrap items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => addBlock('heading')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm text-white transition">
                      + Heading
                    </button>
                    <button onClick={() => addBlock('paragraph')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm text-white transition">
                      + Paragraph
                    </button>
                    <button onClick={() => addBlock('bulletlist')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm flex items-center gap-1 text-white transition">
                      <ListIcon size={14} /> Bullet List
                    </button>
                    <button onClick={() => addBlock('image')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm flex items-center gap-1 text-white transition">
                      <ImageIcon size={14} /> Image
                    </button>
                    <button onClick={() => addBlock('youtube')} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm flex items-center gap-1 text-white transition">
                      <Youtube size={14} /> YouTube
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(true)}
                      disabled={!lessonName || contentBlocks.length === 0}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium whitespace-nowrap transition"
                      title="Preview how the lesson will look to users"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      Preview
                    </button>
                    <button
                      onClick={saveContent}
                      disabled={isUploading}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium whitespace-nowrap transition"
                    >
                      <Save size={16} />
                      {isUploading ? 'Saving...' : 'Save Lesson'}
                    </button>
                  </div>
                </div>

                {/* Content Blocks */}
                <div className="space-y-4">
                  {contentBlocks.map((block, index) => (
                    <div key={block.id}>
                      {/* Insert Above Buttons */}
                      <div className="flex justify-center mb-2">
                        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
                          <button
                            onClick={() => addBlockAt('heading', index)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                            title="Insert Heading Above"
                          >
                            + H2
                          </button>
                          <button
                            onClick={() => addBlockAt('paragraph', index)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                            title="Insert Paragraph Above"
                          >
                            + Para
                          </button>
                          <button
                            onClick={() => addBlockAt('bulletlist', index)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                            title="Insert Bullet List Above"
                          >
                            + List
                          </button>
                          <button
                            onClick={() => addBlockAt('image', index)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                            title="Insert Image Above"
                          >
                            + Img
                          </button>
                          <button
                            onClick={() => addBlockAt('youtube', index)}
                            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                            title="Insert YouTube Above"
                          >
                            + Video
                          </button>
                        </div>
                      </div>

                      {/* Content Block */}
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-300 capitalize">{block.type}</span>
                          <div className="flex gap-2">
                            <button onClick={() => moveBlockUp(index)} disabled={index === 0} className="p-1 hover:bg-gray-700 text-gray-300 rounded disabled:opacity-30">
                              <MoveUp size={16} />
                            </button>
                            <button onClick={() => moveBlockDown(index)} disabled={index === contentBlocks.length - 1} className="p-1 hover:bg-gray-700 text-gray-300 rounded disabled:opacity-30">
                              <MoveDown size={16} />
                            </button>
                            <button onClick={() => removeBlock(block.id)} className="p-1 hover:bg-red-900/30 text-red-400 rounded">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {renderBlockEditor(block, index)}

                      {/* Suggested Question Field - Only for H2 Headings */}
                      {block.type === 'heading' && block.content?.level === 2 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-300">
                              Suggested Question (Optional)
                            </label>
                            <button
                              type="button"
                              onClick={async () => {
                                // Auto-generate question based on content between this H2 and the next
                                const questionText = await generateQuestionForH2(index);
                                const newBlocks = contentBlocks.map(b =>
                                  b.id === block.id ? { ...b, suggestedQuestion: questionText } : b
                                );
                                setContentBlocks(newBlocks);
                              }}
                              className="text-xs px-3 py-1 bg-purple-900/30 text-purple-400 rounded-lg hover:bg-purple-900/50 transition"
                            >
                              Auto-generate
                            </button>
                          </div>
                          <input
                            type="text"
                            value={block.suggestedQuestion || ''}
                            maxLength={60}
                            onChange={(e) => {
                              const newBlocks = contentBlocks.map(b =>
                                b.id === block.id ? { ...b, suggestedQuestion: e.target.value } : b
                              );
                              setContentBlocks(newBlocks);
                            }}
                            placeholder="e.g., What are the key concepts in this section?"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This question will appear when users scroll to this H2 section in the learning hub ({(block.suggestedQuestion || '').length}/60 characters)
                          </p>
                        </div>
                      )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPreview(true)}
                      disabled={!lessonName || contentBlocks.length === 0}
                      className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition flex items-center justify-center gap-2"
                      title="Preview how the lesson will look to users"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      Preview Lesson
                    </button>
                    <button
                      onClick={saveContent}
                      disabled={isUploading}
                      className="flex-1 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 font-medium transition"
                    >
                      {isUploading ? 'Saving...' : 'Save Lesson Content'}
                    </button>
                  </div>

                  <button
                    onClick={generateFlashcards}
                    disabled={isGeneratingFlashcards || !selectedCourseId || !lessonName.trim()}
                    className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition"
                  >
                    {isGeneratingFlashcards ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating 15 Flashcards...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                        Generate 15 Flashcards
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-400 text-center">
                    Generate flashcards after saving your lesson content
                  </p>
                </div>

                {/* Flashcards Display */}
                {generatedFlashcards.length > 0 && (
                  <div className="mt-6 border-t border-gray-800 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Generated Flashcards ({generatedFlashcards.length})
                      </h3>
                      <button
                        onClick={() => setShowFlashcards(!showFlashcards)}
                        className="text-sm text-pink-400 hover:text-pink-300 font-medium transition"
                      >
                        {showFlashcards ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {showFlashcards && (
                      <div className="space-y-4">
                        {generatedFlashcards.map((card, index) => (
                          <div
                            key={card.id}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="mb-3">
                                  <p className="text-sm font-semibold text-white mb-2">Question</p>
                                  <p className="font-medium text-gray-200">{card.question}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white mb-2">Answer</p>
                                  <div className="text-sm text-gray-300 space-y-1">
                                    {card.answer.split('\n').map((line, idx) => {
                                      if (line.trim().startsWith('•')) {
                                        return (
                                          <div key={idx} className="flex gap-2">
                                            <span className="text-pink-400 flex-shrink-0">•</span>
                                            <span>{line.trim().substring(1).trim()}</span>
                                          </div>
                                        );
                                      } else if (line.trim()) {
                                        return <p key={idx} className="mt-2 italic">{line}</p>;
                                      }
                                      return null;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-black text-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-2xl font-semibold">Lesson Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition"
                title="Close preview"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-16 py-8" style={{ scrollbarWidth: 'thin' }}>
              <div className="max-w-4xl mx-auto">
                {renderPreviewContent()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <p className="text-sm text-gray-400">
                This is how your lesson will appear to students in the learning hub
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    saveContent();
                  }}
                  disabled={isUploading}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 transition flex items-center gap-2"
                >
                  <Save size={16} />
                  Save Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumUploadNew;
