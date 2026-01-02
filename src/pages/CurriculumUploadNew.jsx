import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, MoveUp, MoveDown, Save, ArrowLeft, Image as ImageIcon, Youtube, List as ListIcon, Edit, User, Volume2, History, RotateCcw, Clock, X } from 'lucide-react';
import CourseManagement from '../components/CourseManagement';
import { getAllCoaches, createCoach, updateCoach, deleteCoach, createLessonBackup, getLessonBackups, restoreLessonFromBackup } from '../lib/api';

// API URL for backend calls
const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

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

  // Module state (from module_structure in courses table)
  const [moduleStructure, setModuleStructure] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModuleNumber, setSelectedModuleNumber] = useState(1);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [moduleName, setModuleName] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleBulletPoints, setModuleBulletPoints] = useState(['']);

  // Lesson state
  const [lessons, setLessons] = useState([]);
  const [selectedLessonNumber, setSelectedLessonNumber] = useState(1);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
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

  // Knowledge check questions state
  const [questionStatus, setQuestionStatus] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [editingQuestionDifficulty, setEditingQuestionDifficulty] = useState('medium');
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Audio generation state
  const [audioStatus, setAudioStatus] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Coaches state
  const [coaches, setCoaches] = useState([]);
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
  const [coachImageFile, setCoachImageFile] = useState(null);
  const [isUploadingCoachImage, setIsUploadingCoachImage] = useState(false);
  const [coachForm, setCoachForm] = useState({
    name: '',
    position: '',
    description: '',
    image_url: '',
    linkedin_url: '',
    course_id: ''
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'coaches') {
      loadCoaches();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedCourseId) {
      loadModules(selectedCourseId);
      // Load course details when course is selected
      const selectedCourse = courses.find(c => c.name === selectedCourseId);
      if (selectedCourse) {
        setCourseName(selectedCourse.name || '');
        setCourseDescription(selectedCourse.description || '');
        setTutorName(selectedCourse.tutor_name || '');
        setTutorPosition(selectedCourse.tutor_position || '');
        setTutorDescription(selectedCourse.tutor_description || '');
        setTutorImage(selectedCourse.tutor_image || '');
        setLinkedinLink(selectedCourse.linkedin_link || '');
        setCalendlyLink(selectedCourse.calendly_link || '');

        // Load module structure from course
        if (selectedCourse.module_structure && Array.isArray(selectedCourse.module_structure)) {
          console.log('Loading module_structure from course:', selectedCourse.module_structure);
          setModuleStructure(selectedCourse.module_structure);

          // Only reset selections if we don't have a current selection (initial load)
          if (selectedCourse.module_structure.length > 0) {
            // Preserve current selections if they exist and are valid
            const hasCurrentModuleSelection = selectedModuleIndex !== null && selectedModuleIndex >= 0;
            const hasCurrentLessonSelection = selectedLessonIndex !== null && selectedLessonIndex >= 0;

            if (!hasCurrentModuleSelection) {
              // No current module selected, initialize to first module
              setSelectedModuleIndex(0);
              setSelectedModuleNumber(1);
            } else {
              // Validate current module selection is still valid
              if (selectedModuleIndex >= selectedCourse.module_structure.length) {
                setSelectedModuleIndex(0);
                setSelectedModuleNumber(1);
              }
            }

            // Handle lesson selection
            const currentModuleIdx = hasCurrentModuleSelection && selectedModuleIndex < selectedCourse.module_structure.length
              ? selectedModuleIndex
              : 0;
            const currentModule = selectedCourse.module_structure[currentModuleIdx];

            if (currentModule?.lessons && currentModule.lessons.length > 0) {
              if (!hasCurrentLessonSelection) {
                // No current lesson selected, initialize to first lesson
                setSelectedLessonIndex(0);
                setSelectedLessonNumber(1);
              } else {
                // Validate current lesson selection is still valid
                if (selectedLessonIndex >= currentModule.lessons.length) {
                  setSelectedLessonIndex(0);
                  setSelectedLessonNumber(1);
                }
                // Otherwise keep current lesson selection unchanged
              }
            }
          }
        } else {
          setModuleStructure([]);
        }
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
      checkAudioStatus(); // Check if audio exists for this lesson
      checkQuestionStatus(selectedCourseId, selectedModuleNumber, selectedLessonNumber); // Check if questions exist
      loadQuestions(selectedCourseId, selectedModuleNumber, selectedLessonNumber); // Load existing questions
    }
  }, [selectedCourseId, selectedModuleNumber, selectedLessonNumber]);

  // Auto-resize textareas using ResizeObserver to avoid layout shifts
  useEffect(() => {
    const resizeObserverMap = new Map();

    const resizeTextarea = (textarea) => {
      // Store current scroll position to prevent jumping
      const scrollY = window.scrollY;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };

    contentBlocks.forEach((block) => {
      if (block.type === 'paragraph') {
        const textarea = document.getElementById(`paragraph-${block.id}`);
        if (textarea && !resizeObserverMap.has(textarea)) {
          // Initial resize
          resizeTextarea(textarea);

          // Create ResizeObserver for this textarea
          const observer = new ResizeObserver(() => {
            // Only resize if content changed, not if we're the ones changing height
            if (textarea.scrollHeight > parseInt(textarea.style.height || '0')) {
              resizeTextarea(textarea);
            }
          });

          observer.observe(textarea);
          resizeObserverMap.set(textarea, observer);
        }
      }
    });

    return () => {
      resizeObserverMap.forEach((observer) => observer.disconnect());
    };
  }, [contentBlocks]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('display_order');
      if (error) throw error;
      console.log('Fetched courses:', data);
      if (data && data.length > 0) {
        console.log('First course module_structure:', data[0].module_structure);
      }
      setCourses(data || []);
      if (data && data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data[0].name);
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
      // Get the selected course's module structure
      const selectedCourse = courses.find(c => c.name === courseId);

      if (selectedCourse?.module_structure && Array.isArray(selectedCourse.module_structure)) {
        // Use module_structure from the course
        const moduleData = selectedCourse.module_structure[moduleNumber - 1];

        if (moduleData && moduleData.lessons && Array.isArray(moduleData.lessons)) {
          // Transform lessons from module_structure format to match expected format
          const transformedLessons = moduleData.lessons.map((lesson, index) => ({
            course_id: courseId,
            module_number: moduleNumber,
            lesson_number: index + 1,
            lesson_name: lesson.name || `Lesson ${index + 1}`,
            description: lesson.description || '',
            bullet_points: lesson.bullet_points || ['', '', '']
          }));
          setLessons(transformedLessons);
          return;
        }
      }

      // Fallback to lessons_metadata table if module_structure doesn't exist
      const { data, error } = await supabase
        .from('lessons_metadata')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .order('lesson_number');

      if (error) {
        console.error('Error loading lessons from lessons_metadata:', error);
        setLessons([]);
        return;
      }

      setLessons(data || []);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setLessons([]);
    }
  };

  const loadLessonContent = async (courseId, moduleNumber, lessonNumber) => {
    setIsLoadingContent(true);
    try {
      // Try to load lesson metadata from module_structure first
      const selectedCourse = courses.find(c => c.name === courseId);
      let metadata = null;

      if (selectedCourse?.module_structure && Array.isArray(selectedCourse.module_structure)) {
        const moduleData = selectedCourse.module_structure[moduleNumber - 1];
        if (moduleData && moduleData.lessons && Array.isArray(moduleData.lessons)) {
          const lessonData = moduleData.lessons[lessonNumber - 1];
          if (lessonData) {
            metadata = {
              lesson_name: lessonData.name || '',
              description: lessonData.description || '',
              bullet_points: lessonData.bullet_points || ['', '', '']
            };
          }
        }
      }

      // Fallback to lessons_metadata table if not found in module_structure
      if (!metadata) {
        const { data: metadataFromTable, error: metadataError } = await supabase
          .from('lessons_metadata')
          .select('*')
          .eq('course_id', courseId)
          .eq('module_number', moduleNumber)
          .eq('lesson_number', lessonNumber)
          .single();

        if (metadataError && metadataError.code !== 'PGRST116') {
          console.error('Error loading lesson metadata:', metadataError);
        }

        metadata = metadataFromTable;
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

  // Check question status for current lesson
  const checkQuestionStatus = async (courseId, moduleNumber, lessonNumber) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/lesson-questions-status/${courseId}/${moduleNumber}/${lessonNumber}`
      );
      if (response.ok) {
        const data = await response.json();
        setQuestionStatus(data);
      } else {
        setQuestionStatus(null);
      }
    } catch (error) {
      console.error('Error checking question status:', error);
      setQuestionStatus(null);
    }
  };

  // Load generated questions for current lesson
  const loadQuestions = async (courseId, moduleNumber, lessonNumber) => {
    try {
      const { data, error } = await supabase
        .from('lesson_questions')
        .select('*')
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber)
        .order('created_at');

      if (error) {
        console.error('Error loading questions:', error);
        setGeneratedQuestions([]);
        return;
      }

      setGeneratedQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      setGeneratedQuestions([]);
    }
  };

  // Generate knowledge check questions for current lesson
  const handleGenerateQuestions = async () => {
    if (!selectedCourseId || !selectedModuleNumber || !selectedLessonNumber) {
      alert('Please select a course, module, and lesson first');
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/generate-lesson-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          moduleNumber: selectedModuleNumber,
          lessonNumber: selectedLessonNumber,
          forceRegenerate: true
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Successfully generated ${data.questionCount} knowledge check questions!`);
        await checkQuestionStatus(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
        await loadQuestions(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
      } else {
        alert(`Failed to generate questions: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      alert(`Error generating questions: ${error.message}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startEditingQuestion = (question) => {
    setEditingQuestionId(question.id);
    setEditingQuestionText(question.question_text);
    setEditingQuestionDifficulty(question.difficulty || 'medium');
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestionText('');
    setEditingQuestionDifficulty('medium');
  };

  const saveEditedQuestion = async () => {
    if (!editingQuestionId || !editingQuestionText.trim()) return;

    setIsSavingQuestion(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/lesson-questions/${editingQuestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: editingQuestionText,
          difficulty: editingQuestionDifficulty
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the question in local state
        setGeneratedQuestions(prev =>
          prev.map(q => q.id === editingQuestionId ? data.question : q)
        );
        cancelEditingQuestion();
      } else {
        alert(`Failed to save question: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert(`Error saving question: ${error.message}`);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const deleteAndRegenerateQuestion = async (questionToDelete) => {
    if (!confirm('Delete this question and generate a new one?')) return;

    setIsSavingQuestion(true);
    try {
      // 1. Delete the question
      const deleteResponse = await fetch(`${API_URL}/api/admin/lesson-questions/${questionToDelete.id}`, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        const data = await deleteResponse.json();
        throw new Error(data.error || 'Failed to delete question');
      }

      // 2. Generate a new question with the same difficulty
      const existingQuestions = generatedQuestions
        .filter(q => q.id !== questionToDelete.id)
        .map(q => q.question_text);

      const generateResponse = await fetch(`${API_URL}/api/admin/generate-single-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          moduleNumber: selectedModuleNumber,
          lessonNumber: selectedLessonNumber,
          difficulty: questionToDelete.difficulty,
          existingQuestions
        })
      });

      const generateData = await generateResponse.json();

      if (generateResponse.ok && generateData.success) {
        // Update local state: remove old question, add new one
        setGeneratedQuestions(prev => {
          const filtered = prev.filter(q => q.id !== questionToDelete.id);
          return [...filtered, generateData.question];
        });
      } else {
        // Question was deleted but regeneration failed - reload questions
        alert(`Question deleted but failed to generate new one: ${generateData.error || 'Unknown error'}`);
        await loadQuestions(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
      }
    } catch (error) {
      console.error('Error deleting/regenerating question:', error);
      alert(`Error: ${error.message}`);
      // Reload questions to ensure consistent state
      await loadQuestions(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const deleteQuestion = async (questionToDelete) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;

    setIsSavingQuestion(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/lesson-questions/${questionToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete question');
      }

      // Remove from local state
      setGeneratedQuestions(prev => prev.filter(q => q.id !== questionToDelete.id));
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSavingQuestion(false);
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
          name: selectedCourseId,
          title: courseName,
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
      // Get the current course data
      const selectedCourse = courses.find(c => c.name === selectedCourseId);

      if (!selectedCourse) {
        throw new Error('Course not found');
      }

      // Check if we should update module_structure or lessons_metadata table
      if (selectedCourse.module_structure && Array.isArray(selectedCourse.module_structure)) {
        // Update module_structure in courses table
        const updatedModuleStructure = [...selectedCourse.module_structure];

        // Ensure the module exists
        if (!updatedModuleStructure[selectedModuleNumber - 1]) {
          throw new Error(`Module ${selectedModuleNumber} not found in course structure`);
        }

        // Ensure lessons array exists
        if (!updatedModuleStructure[selectedModuleNumber - 1].lessons) {
          updatedModuleStructure[selectedModuleNumber - 1].lessons = [];
        }

        // Update or create the lesson in the module structure
        const lessonIndex = selectedLessonNumber - 1;
        const lessonsArray = updatedModuleStructure[selectedModuleNumber - 1].lessons;

        // Ensure the lesson slot exists
        while (lessonsArray.length <= lessonIndex) {
          lessonsArray.push({ name: '', description: '', bullet_points: ['', '', ''] });
        }

        // Update the lesson data
        lessonsArray[lessonIndex] = {
          name: lessonName,
          description: lessonDescription,
          bullet_points: lessonBulletPoints
        };

        // Save back to database
        const { error: updateError } = await supabase
          .from('courses')
          .update({ module_structure: updatedModuleStructure })
          .eq('name', selectedCourseId);

        if (updateError) throw updateError;

        alert('Lesson metadata saved successfully!');
        await loadCourses(); // Reload courses to get updated module_structure
      } else {
        // Fallback to old lessons_metadata table
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
      }
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
      suggestedQuestion: ''
    };
    setContentBlocks(prevBlocks => [...prevBlocks, newBlock]);
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
    setContentBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks.splice(index, 0, newBlock);
      return newBlocks;
    });
  };

  const removeBlock = (id) => {
    setContentBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
  };

  const moveBlockUp = (index) => {
    setContentBlocks(prevBlocks => {
      if (index === 0) return prevBlocks;
      const newBlocks = [...prevBlocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  };

  const moveBlockDown = (index) => {
    setContentBlocks(prevBlocks => {
      if (index === prevBlocks.length - 1) return prevBlocks;
      const newBlocks = [...prevBlocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  };

  const updateBlock = (id, content) => {
    setContentBlocks(prevBlocks => prevBlocks.map(block =>
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
      const response = await fetch(`${API_URL}/api/generate-suggested-question`, {
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

      console.log('📤 Uploading image:', { fileName, contentType: file.type, size: file.size });

      // Convert file to arrayBuffer for reliable upload (same pattern as BlogManagement)
      const arrayBuffer = await file.arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false
        });

      console.log('📤 Upload result:', { uploadData, uploadError });

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

      console.log('📤 Public URL:', data.publicUrl);

      // Test if the URL is accessible
      try {
        const testResponse = await fetch(data.publicUrl, { method: 'HEAD' });
        console.log('📤 URL test response:', { status: testResponse.status, contentType: testResponse.headers.get('content-type') });
      } catch (testErr) {
        console.error('📤 URL test failed:', testErr);
      }

      // Use functional update to merge with existing content (preserving width, etc.)
      setContentBlocks(prevBlocks => prevBlocks.map(block =>
        block.id === blockId
          ? { ...block, content: { ...block.content, url: data.publicUrl } }
          : block
      ));
      alert('Image uploaded successfully! Check console for URL details.');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload image: ${error.message}`);
    }
  };

  // Check audio status when lesson changes
  const checkAudioStatus = async () => {
    if (!selectedCourseId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/lesson-audio-status/${selectedCourseId}/${selectedModuleNumber}/${selectedLessonNumber}`
      );

      if (response.ok) {
        const data = await response.json();
        setAudioStatus(data);
        console.log('Audio status:', data);
      } else {
        setAudioStatus(null);
      }
    } catch (error) {
      console.error('Error checking audio status:', error);
      setAudioStatus(null);
    }
  };

  // Generate audio for current lesson
  const handleGenerateAudio = async () => {
    if (!selectedCourseId) {
      alert('Please select a course first');
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/generate-lesson-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          moduleNumber: selectedModuleNumber,
          lessonNumber: selectedLessonNumber,
          forceRegenerate: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Audio generated successfully! Duration: ${data.lessonAudio?.duration_seconds?.toFixed(1)}s`);
        checkAudioStatus(); // Refresh status
      } else {
        const error = await response.json();
        alert(`Failed to generate audio: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert(`Failed to generate audio: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const saveContent = async () => {
    if (!selectedCourseId || !lessonName.trim()) {
      alert('Please select a course and enter lesson name');
      return;
    }

    setIsUploading(true);
    try {
      // First, create a backup of existing content before deleting
      const { data: existingContent } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', selectedCourseId)
        .eq('module_number', selectedModuleNumber)
        .eq('lesson_number', selectedLessonNumber)
        .order('section_number');

      if (existingContent && existingContent.length > 0) {
        try {
          await createLessonBackup(
            selectedCourseId,
            selectedModuleNumber,
            selectedLessonNumber,
            existingContent[0]?.lesson_name || lessonName,
            'auto_before_save',
            existingContent
          );
          console.log('Backup created before save');
        } catch (backupError) {
          console.error('Backup failed (continuing with save):', backupError);
        }
      }

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
      await loadLessonContent(selectedCourseId, selectedModuleNumber, selectedLessonNumber);
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
      const response = await fetch(`${API_URL}/api/generate-flashcards`, {
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

  // Version History Functions
  const loadVersionHistory = async () => {
    if (!selectedCourseId) return;

    setIsLoadingVersions(true);
    try {
      const backups = await getLessonBackups(
        selectedCourseId,
        selectedModuleNumber,
        selectedLessonNumber
      );
      setVersionHistory(backups || []);
    } catch (error) {
      console.error('Error loading version history:', error);
      setVersionHistory([]);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleShowVersionHistory = async () => {
    setShowVersionHistory(true);
    await loadVersionHistory();
  };

  const handleRestoreVersion = async (backup) => {
    if (!confirm(`Restore to version ${backup.version_number} from ${new Date(backup.created_at).toLocaleString()}?\n\nThis will replace the current content. A backup of the current state will be created first.`)) {
      return;
    }

    setIsRestoringVersion(true);
    try {
      // First, create a backup of current state
      if (contentBlocks.length > 0) {
        const currentContent = contentBlocks.map((block, index) => ({
          course_id: selectedCourseId,
          module_number: selectedModuleNumber,
          lesson_number: selectedLessonNumber,
          section_number: index + 1,
          lesson_name: lessonName,
          content_type: block.type,
          content: typeof block.content === 'object' ? block.content : { text: block.content },
          order_index: index
        }));

        await createLessonBackup(
          selectedCourseId,
          selectedModuleNumber,
          selectedLessonNumber,
          lessonName,
          'auto_before_restore',
          currentContent
        );
      }

      // Now restore from the selected backup
      await restoreLessonFromBackup(backup.id);

      // Reload the lesson content
      await loadLessonContent(selectedCourseId, selectedModuleNumber, selectedLessonNumber);

      // Refresh version history
      await loadVersionHistory();

      alert('Content restored successfully!');
    } catch (error) {
      console.error('Error restoring version:', error);
      alert(`Failed to restore version: ${error.message}`);
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const formatBackupReason = (reason) => {
    const reasons = {
      'manual': 'Manual backup',
      'auto_before_save': 'Auto (before save)',
      'auto_before_restore': 'Auto (before restore)',
      'auto_before_audio': 'Auto (before audio)',
      'initial_backup': 'Initial backup'
    };
    return reasons[reason] || reason || 'Unknown';
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
              const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\[(?:[^\]]+)\]\((?:[^)]+)\)|(?<!\*)\*(?!\*)([^*]+)\*(?!\*))/g);

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
                      style={{ aspectRatio: 'auto', maxWidth: '100%', height: 'auto' }}
                      loading="lazy"
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
                  <div className="aspect-w-16 aspect-h-9" style={{ minHeight: '384px' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={videoData.title || 'YouTube video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-96 rounded-lg shadow-lg"
                      loading="lazy"
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

  // =====================================================
  // COACHES FUNCTIONS
  // =====================================================

  const loadCoaches = async () => {
    setIsLoadingCoaches(true);
    try {
      const data = await getAllCoaches();
      setCoaches(data);
    } catch (error) {
      console.error('Error loading coaches:', error);
    } finally {
      setIsLoadingCoaches(false);
    }
  };

  const handleCoachImageUpload = async (file) => {
    try {
      setIsUploadingCoachImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `coach_${Date.now()}.${fileExt}`;
      const filePath = `coaches/${fileName}`;

      // Convert file to arrayBuffer for reliable upload
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          throw new Error('Permission denied: Please configure Row-Level Security policies in Supabase for the assets bucket.');
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setCoachForm({ ...coachForm, image_url: data.publicUrl });
      setCoachImageFile(null);
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading coach image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setIsUploadingCoachImage(false);
    }
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();

    if (!coachForm.name || !coachForm.course_id) {
      alert('Please fill in at least the coach name and select a course');
      return;
    }

    try {
      // Upload image if a new file is selected
      if (coachImageFile) {
        await handleCoachImageUpload(coachImageFile);
        return; // The form will be submitted after image upload via state update
      }

      if (editingCoach) {
        // Update existing coach
        await updateCoach(editingCoach.id, coachForm);
        alert('Coach updated successfully!');
      } else {
        // Create new coach
        await createCoach(coachForm);
        alert('Coach created successfully!');
      }

      // Reset form and reload coaches
      setCoachForm({
        name: '',
        position: '',
        description: '',
        image_url: '',
        linkedin_url: '',
        course_id: ''
      });
      setEditingCoach(null);
      setCoachImageFile(null);
      await loadCoaches();
    } catch (error) {
      console.error('Error saving coach:', error);
      alert('Error saving coach: ' + error.message);
    }
  };

  const handleEditCoach = (coach) => {
    setEditingCoach(coach);
    setCoachForm({
      name: coach.name,
      position: coach.position || '',
      description: coach.description || '',
      image_url: coach.image_url || '',
      linkedin_url: coach.linkedin_url || '',
      course_id: coach.course_id
    });
  };

  const handleDeleteCoach = async (coachId) => {
    if (!confirm('Are you sure you want to delete this coach?')) {
      return;
    }

    try {
      await deleteCoach(coachId);
      alert('Coach deleted successfully!');
      await loadCoaches();
    } catch (error) {
      console.error('Error deleting coach:', error);
      alert('Error deleting coach: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingCoach(null);
    setCoachImageFile(null);
    setCoachForm({
      name: '',
      position: '',
      description: '',
      image_url: '',
      linkedin_url: '',
      course_id: ''
    });
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

                    // Restore cursor position after the underline markers - prevent scroll
                    setTimeout(() => {
                      const scrollY = window.scrollY;
                      input.focus({ preventScroll: true });
                      input.setSelectionRange(end + 4, end + 4);
                      window.scrollTo(0, scrollY);
                    }, 0);
                  } else {
                    // Insert underline markers at cursor position
                    const newText = text.substring(0, start) + '____' + text.substring(end);
                    updateBlock(block.id, {
                      text: newText,
                      level: typeof block.content === 'object' ? block.content.level : 2
                    });

                    // Place cursor between the markers - prevent scroll
                    setTimeout(() => {
                      const scrollY = window.scrollY;
                      input.focus({ preventScroll: true });
                      input.setSelectionRange(start + 2, start + 2);
                      window.scrollTo(0, scrollY);
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
              }}
              onInput={(e) => {
                // Auto-resize on input - store scroll position to prevent jumping
                const scrollY = window.scrollY;
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                window.scrollTo(0, scrollY);
              }}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none min-h-[100px] resize-none overflow-hidden transition-[height] duration-75 ease-out"
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

                      // Restore cursor position after the bold markers - prevent scroll
                      setTimeout(() => {
                        const scrollY = window.scrollY;
                        textarea.focus({ preventScroll: true });
                        textarea.setSelectionRange(end + 4, end + 4);
                        window.scrollTo(0, scrollY);
                      }, 0);
                    } else {
                      // Insert bold markers at cursor position
                      const newText = text.substring(0, start) + '****' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Place cursor between the markers - prevent scroll
                      setTimeout(() => {
                        const scrollY = window.scrollY;
                        textarea.focus({ preventScroll: true });
                        textarea.setSelectionRange(start + 2, start + 2);
                        window.scrollTo(0, scrollY);
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

                      // Restore cursor position after the italic markers - prevent scroll
                      setTimeout(() => {
                        const scrollY = window.scrollY;
                        textarea.focus({ preventScroll: true });
                        textarea.setSelectionRange(end + 2, end + 2);
                        window.scrollTo(0, scrollY);
                      }, 0);
                    } else {
                      // Insert italic markers at cursor position
                      const newText = text.substring(0, start) + '**' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Place cursor between the markers - prevent scroll
                      setTimeout(() => {
                        const scrollY = window.scrollY;
                        textarea.focus({ preventScroll: true });
                        textarea.setSelectionRange(start + 1, start + 1);
                        window.scrollTo(0, scrollY);
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

                      // Restore cursor position after the underline markers - prevent scroll
                      setTimeout(() => {
                        const scrollY = window.scrollY;
                        textarea.focus({ preventScroll: true });
                        textarea.setSelectionRange(end + 4, end + 4);
                        window.scrollTo(0, scrollY);
                      }, 0);
                    } else {
                      // Insert underline markers at cursor position
                      const newText = text.substring(0, start) + '____' + text.substring(end);
                      updateBlock(block.id, newText);

                      // Place cursor between the markers - prevent scroll
                      setTimeout(() => {
                        const scrollY = window.scrollY;
                        textarea.focus({ preventScroll: true });
                        textarea.setSelectionRange(start + 2, start + 2);
                        window.scrollTo(0, scrollY);
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

                        // Restore cursor position after the link - prevent scroll
                        setTimeout(() => {
                          const scrollY = window.scrollY;
                          textarea.focus({ preventScroll: true });
                          const newPos = start + selectedText.length + url.length + 4;
                          textarea.setSelectionRange(newPos, newPos);
                          window.scrollTo(0, scrollY);
                        }, 0);
                      }
                    } else {
                      // Insert link template at cursor position
                      const url = prompt('Enter URL (e.g., https://example.com):');
                      if (url) {
                        const linkText = prompt('Enter link text:') || 'link';
                        const newText = text.substring(0, start) + '[' + linkText + '](' + url + ')' + text.substring(end);
                        updateBlock(block.id, newText);

                        // Place cursor after the inserted link - prevent scroll
                        setTimeout(() => {
                          const scrollY = window.scrollY;
                          textarea.focus({ preventScroll: true });
                          const newPos = start + linkText.length + url.length + 4;
                          textarea.setSelectionRange(newPos, newPos);
                          window.scrollTo(0, scrollY);
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
                  alt={block.content.alt || 'Uploaded image'}
                  className={`rounded-lg ${
                    block.content.width === 'small' ? 'max-w-sm' :
                    block.content.width === 'medium' ? 'max-w-md' :
                    block.content.width === 'large' ? 'max-w-lg' :
                    block.content.width === 'xl' ? 'max-w-xl' :
                    block.content.width === '2xl' ? 'max-w-2xl' :
                    block.content.width === 'full' ? 'max-w-full' :
                    'max-w-md'
                  }`}
                  style={{ aspectRatio: 'auto', maxWidth: '100%', height: 'auto' }}
                  loading="lazy"
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
              <div className="aspect-w-16 aspect-h-9" style={{ minHeight: '256px' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${block.content.videoId}`}
                  title={block.content.title || 'YouTube video'}
                  className="w-full h-64 rounded-lg"
                  allowFullScreen
                  loading="lazy"
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
            {['courses', 'content', 'coaches'].map((tab) => (
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

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4 text-white">Manage Lesson Content</h2>

                {/* Lesson Selection */}
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg space-y-3">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-300">Course</label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      >
                        {courses.map((course) => (
                          <option key={course.name} value={course.name}>
                            {course.title || course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-300">Module</label>
                      <select
                        value={selectedModuleIndex}
                        onChange={(e) => {
                          const moduleIdx = parseInt(e.target.value);
                          setSelectedModuleIndex(moduleIdx);
                          setSelectedModuleNumber(moduleIdx + 1);
                          // Reset lesson selection to first lesson in this module
                          if (moduleStructure[moduleIdx]?.lessons?.length > 0) {
                            setSelectedLessonIndex(0);
                            setSelectedLessonNumber(1);
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      >
                        {moduleStructure.map((module, idx) => (
                          <option key={idx} value={idx}>
                            {module.name || `Module ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1 text-gray-300">Lesson</label>
                      <select
                        value={selectedLessonIndex}
                        onChange={(e) => {
                          const lessonIdx = parseInt(e.target.value);
                          setSelectedLessonIndex(lessonIdx);
                          setSelectedLessonNumber(lessonIdx + 1);
                          // Content will be loaded automatically by useEffect
                        }}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      >
                        {moduleStructure[selectedModuleIndex]?.lessons?.map((lesson, idx) => (
                          <option key={idx} value={idx}>
                            {lesson.name || `Lesson ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-shrink-0">
                      <label className="block text-sm font-medium mb-1 text-gray-300">&nbsp;</label>
                      <button
                        onClick={handleShowVersionHistory}
                        disabled={!selectedCourseId}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                        title="View version history"
                      >
                        <History className="w-4 h-4" />
                        History
                      </button>
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
                    <label className="block text-sm font-medium mb-1 text-gray-300">Lesson Name *</label>
                    <p className="text-xs text-gray-500 mb-2">The name that will appear on the lesson card</p>
                    <input
                      type="text"
                      value={lessonName}
                      onChange={(e) => setLessonName(e.target.value)}
                      placeholder="e.g., Introduction to Product Management"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none mb-4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Bullet Points (for Upcoming Lessons Card) *</label>
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
                    <button
                      onClick={handleGenerateAudio}
                      disabled={isGeneratingAudio}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium whitespace-nowrap transition"
                      title="Generate narration audio for this lesson"
                    >
                      <Volume2 size={16} />
                      {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
                    </button>
                    {audioStatus && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        audioStatus.needsRegeneration
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : audioStatus.hasAudio
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-gray-700 text-gray-400'
                      }`}>
                        {audioStatus.hasAudio
                          ? (audioStatus.needsRegeneration ? '⚠️ Content changed' : '✅ Audio ready')
                          : '❌ No audio'}
                      </span>
                    )}
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
                                setContentBlocks(prevBlocks => prevBlocks.map(b =>
                                  b.id === block.id ? { ...b, suggestedQuestion: questionText } : b
                                ));
                              }}
                              className="text-xs px-3 py-1 bg-purple-900/30 text-purple-400 rounded-lg hover:bg-purple-900/50 transition"
                            >
                              Auto-generate
                            </button>
                          </div>
                          <input
                            type="text"
                            value={block.suggestedQuestion || ''}
                            maxLength={55}
                            onChange={(e) => {
                              const value = e.target.value;
                              setContentBlocks(prevBlocks => prevBlocks.map(b =>
                                b.id === block.id ? { ...b, suggestedQuestion: value } : b
                              ));
                            }}
                            placeholder="e.g., What are the key concepts in this section?"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This question will appear when users scroll to this H2 section in the learning hub ({(block.suggestedQuestion || '').length}/55 characters)
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

                {/* Knowledge Check Questions Section */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Knowledge Check Questions</h3>
                      {questionStatus ? (
                        <p className="text-sm text-gray-400 mt-1">
                          {questionStatus.hasQuestions
                            ? `${questionStatus.questionCount} questions generated`
                            : 'No questions generated yet'}
                          {questionStatus.needsRegeneration && questionStatus.hasQuestions && (
                            <span className="text-orange-400 ml-2">(Content changed - regenerate recommended)</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">Loading status...</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGeneratingQuestions}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating 10 Questions...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                        Generate 10 Questions
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-400 text-center mt-2">
                    Generate knowledge check questions after saving your lesson content
                  </p>

                  {/* Questions Display */}
                  {generatedQuestions.length > 0 && (
                    <div className="mt-6 border-t border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                          Generated Questions ({generatedQuestions.length})
                        </h3>
                        <button
                          onClick={() => setShowQuestions(!showQuestions)}
                          className="text-sm text-purple-400 hover:text-purple-300 font-medium transition"
                        >
                          {showQuestions ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      {showQuestions && (
                        <div className="space-y-3">
                          {generatedQuestions.map((question, index) => (
                            <div
                              key={question.id}
                              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition"
                            >
                              {editingQuestionId === question.id ? (
                                /* Editing mode */
                                <div className="space-y-3">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                      {index + 1}
                                    </div>
                                    <textarea
                                      value={editingQuestionText}
                                      onChange={(e) => setEditingQuestionText(e.target.value)}
                                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                      rows={3}
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between pl-11">
                                    <select
                                      value={editingQuestionDifficulty}
                                      onChange={(e) => setEditingQuestionDifficulty(e.target.value)}
                                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-2 focus:ring-purple-500"
                                    >
                                      <option value="easy">Easy</option>
                                      <option value="medium">Medium</option>
                                    </select>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={cancelEditingQuestion}
                                        className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition"
                                        disabled={isSavingQuestion}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={saveEditedQuestion}
                                        disabled={isSavingQuestion || !editingQuestionText.trim()}
                                        className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                                      >
                                        {isSavingQuestion ? 'Saving...' : 'Save'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Display mode */
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-gray-200">{question.question_text}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                                        question.difficulty === 'easy' ? 'bg-green-900 text-green-300' :
                                        question.difficulty === 'hard' ? 'bg-red-900 text-red-300' :
                                        'bg-yellow-900 text-yellow-300'
                                      }`}>
                                        {question.difficulty}
                                      </span>
                                      <button
                                        onClick={() => startEditingQuestion(question)}
                                        className="text-xs text-purple-400 hover:text-purple-300 transition"
                                        disabled={isSavingQuestion}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deleteAndRegenerateQuestion(question)}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition"
                                        disabled={isSavingQuestion}
                                      >
                                        Regenerate
                                      </button>
                                      <button
                                        onClick={() => deleteQuestion(question)}
                                        className="text-xs text-red-400 hover:text-red-300 transition"
                                        disabled={isSavingQuestion}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coaches Tab */}
            {activeTab === 'coaches' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white">Manage Office Hours Coaches</h2>
                </div>

                {/* Coach Form */}
                <form onSubmit={handleCoachSubmit} className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {editingCoach ? 'Edit Coach' : 'Add New Coach'}
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={coachForm.name}
                        onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Position</label>
                      <input
                        type="text"
                        value={coachForm.position}
                        onChange={(e) => setCoachForm({ ...coachForm, position: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                        placeholder="Senior Product Manager"
                      />
                    </div>
                  </div>

                  {/* Course Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={coachForm.course_id}
                      onChange={(e) => setCoachForm({ ...coachForm, course_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      required
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.name} value={course.name}>
                          {course.title || course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">
                      Description
                      <span className="text-gray-400 text-xs ml-2">
                        ({coachForm.description.length}/185 characters)
                      </span>
                    </label>
                    <textarea
                      value={coachForm.description}
                      onChange={(e) => {
                        if (e.target.value.length <= 185) {
                          setCoachForm({ ...coachForm, description: e.target.value });
                        }
                      }}
                      maxLength={185}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      placeholder="Brief bio about the coach..."
                      rows={3}
                    />
                  </div>

                  {/* Image Upload/URL */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Coach Image</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setCoachImageFile(e.target.files[0]);
                            // Create preview URL
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setCoachForm({ ...coachForm, image_url: event.target.result });
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id="coach-image-upload"
                      />
                      <label
                        htmlFor="coach-image-upload"
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition cursor-pointer flex items-center gap-2"
                      >
                        <ImageIcon size={16} />
                        {isUploadingCoachImage ? 'Uploading...' : 'Upload Image'}
                      </label>
                      <span className="text-gray-400 text-sm flex items-center">or enter URL below</span>
                    </div>
                    <input
                      type="url"
                      value={coachImageFile ? '' : coachForm.image_url}
                      onChange={(e) => {
                        setCoachImageFile(null);
                        setCoachForm({ ...coachForm, image_url: e.target.value });
                      }}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      placeholder="https://example.com/photo.jpg"
                      disabled={coachImageFile !== null}
                    />
                    {coachImageFile && (
                      <p className="text-sm text-gray-400 mt-1">Selected file: {coachImageFile.name}</p>
                    )}
                    {coachForm.image_url && (
                      <img
                        src={coachForm.image_url}
                        alt="Preview"
                        className="mt-2 w-20 h-20 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                  </div>

                  {/* LinkedIn URL */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={coachForm.linkedin_url}
                      onChange={(e) => setCoachForm({ ...coachForm, linkedin_url: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition flex items-center gap-2"
                    >
                      <Save size={16} />
                      {editingCoach ? 'Update Coach' : 'Add Coach'}
                    </button>
                    {editingCoach && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                {/* Coaches List */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Existing Coaches</h3>

                  {isLoadingCoaches ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                      <p className="text-gray-400 mt-2">Loading coaches...</p>
                    </div>
                  ) : coaches.length === 0 ? (
                    <div className="text-center py-8">
                      <User size={48} className="mx-auto text-gray-600 mb-2" />
                      <p className="text-gray-400">No coaches added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {coaches.map((coach) => {
                        const course = courses.find(c => c.name === coach.course_id);
                        return (
                          <div
                            key={coach.id}
                            className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:bg-gray-850 transition"
                          >
                            <div className="flex items-start gap-4">
                              {coach.image_url && (
                                <img
                                  src={coach.image_url}
                                  alt={coach.name}
                                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/64';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-white font-semibold">{coach.name}</h4>
                                    {coach.position && (
                                      <p className="text-gray-400 text-sm">{coach.position}</p>
                                    )}
                                    <p className="text-pink-400 text-sm mt-1">
                                      {course?.title || coach.course_id}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => handleEditCoach(coach)}
                                      className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                                      title="Edit coach"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCoach(coach.id)}
                                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                      title="Delete coach"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                {coach.description && (
                                  <p className="text-gray-300 text-sm mt-2 line-clamp-2">{coach.description}</p>
                                )}
                                {coach.linkedin_url && (
                                  <a
                                    href={coach.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-pink-400 hover:text-pink-300 text-sm mt-1 inline-block"
                                  >
                                    View LinkedIn Profile →
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Version History
              </h2>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
              <p className="text-gray-300 text-sm">
                <span className="font-medium">{selectedCourseId}</span> → Module {selectedModuleNumber} → Lesson {selectedLessonNumber}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Backups are created automatically before saves and restores
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingVersions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                  <span className="ml-3 text-gray-400">Loading versions...</span>
                </div>
              ) : versionHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No backups found for this lesson</p>
                  <p className="text-sm mt-1">Backups will be created when you save content</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versionHistory.map((backup) => (
                    <div
                      key={backup.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">
                              Version {backup.version_number}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                              {formatBackupReason(backup.backup_reason)}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            {new Date(backup.created_at).toLocaleString()}
                          </p>
                          {backup.lesson_name && (
                            <p className="text-gray-500 text-xs mt-1">
                              "{backup.lesson_name}"
                            </p>
                          )}
                          <p className="text-gray-600 text-xs mt-1">
                            {backup.content_blocks?.length || 0} content blocks
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreVersion(backup)}
                          disabled={isRestoringVersion}
                          className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <button
                onClick={() => setShowVersionHistory(false)}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumUploadNew;
