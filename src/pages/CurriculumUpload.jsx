import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, MoveUp, MoveDown, Save, Eye, ArrowLeft, Image as ImageIcon, Youtube, PlusCircle, History, RotateCcw, Clock, X } from 'lucide-react';
import CourseManagement from '../components/CourseManagement';
import { createLessonBackup, getLessonBackups, restoreLessonFromBackup, deleteLessonBackup } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const CurriculumUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [courseId, setCourseId] = useState('product-management');
  const [moduleNumber, setModuleNumber] = useState(1);
  const [lessonNumber, setLessonNumber] = useState(1);
  const [lessonName, setLessonName] = useState('');
  const [contentBlocks, setContentBlocks] = useState([
    { id: Date.now(), type: 'heading', content: '', level: 1 }
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Dropdown data
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  const [availableLessons, setAvailableLessons] = useState([]);
  const [existingLessonNames, setExistingLessonNames] = useState([]);

  // Modal states for creating new items
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [showNewModuleModal, setShowNewModuleModal] = useState(false);
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [newModuleNum, setNewModuleNum] = useState('');
  const [newLessonNum, setNewLessonNum] = useState('');

  // Version history states
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [lessonBackups, setLessonBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(null);
  const [selectedBackupPreview, setSelectedBackupPreview] = useState(null);

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
  }, []);

  // Update available modules when course changes
  useEffect(() => {
    if (courseId) {
      loadModulesForCourse(courseId);
    }
  }, [courseId]);

  // Update available lessons when module changes
  useEffect(() => {
    if (courseId && moduleNumber) {
      loadLessonsForModule(courseId, moduleNumber);
    }
  }, [courseId, moduleNumber]);

  // Load lesson names when lesson number changes
  useEffect(() => {
    if (courseId && moduleNumber && lessonNumber) {
      loadLessonNames(courseId, moduleNumber, lessonNumber);
    }
  }, [courseId, moduleNumber, lessonNumber]);

  const loadExistingData = async () => {
    try {
      // Get unique course IDs
      const { data: courses, error: coursesError } = await supabase
        .from('lessons')
        .select('course_id')
        .order('course_id');

      if (coursesError) throw coursesError;

      const uniqueCourses = [...new Set(courses?.map(c => c.course_id).filter(Boolean) || [])];

      // Always ensure current courseId is in the list
      if (!uniqueCourses.includes(courseId)) {
        uniqueCourses.push(courseId);
      }

      setAvailableCourses(uniqueCourses);

      // Load modules for the current course
      if (courseId) {
        await loadModulesForCourse(courseId);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      // On error, ensure current courseId is available
      setAvailableCourses([courseId]);
      setAvailableModules([moduleNumber]);
      setAvailableLessons([lessonNumber]);
    }
  };

  const loadModulesForCourse = async (course) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('module_number')
        .eq('course_id', course)
        .order('module_number');

      if (error) throw error;

      const uniqueModules = [...new Set(data?.map(m => m.module_number) || [])];

      // Always ensure current moduleNumber is in the list
      if (!uniqueModules.includes(moduleNumber)) {
        uniqueModules.push(moduleNumber);
        uniqueModules.sort((a, b) => a - b);
      }

      setAvailableModules(uniqueModules);
    } catch (error) {
      console.error('Error loading modules:', error);
      setAvailableModules([moduleNumber]);
    }
  };

  const loadLessonsForModule = async (course, module) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('lesson_number')
        .eq('course_id', course)
        .eq('module_number', module)
        .order('lesson_number');

      if (error) throw error;

      const uniqueLessons = [...new Set(data?.map(l => l.lesson_number) || [])];

      // Always ensure current lessonNumber is in the list
      if (!uniqueLessons.includes(lessonNumber)) {
        uniqueLessons.push(lessonNumber);
        uniqueLessons.sort((a, b) => a - b);
      }

      setAvailableLessons(uniqueLessons);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setAvailableLessons([lessonNumber]);
    }
  };

  const loadLessonNames = async (course, module, lesson) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('lesson_name')
        .eq('course_id', course)
        .eq('module_number', module)
        .eq('lesson_number', lesson)
        .order('lesson_name');

      if (error) throw error;

      const uniqueNames = [...new Set(data?.map(l => l.lesson_name).filter(Boolean) || [])];
      setExistingLessonNames(uniqueNames);
    } catch (error) {
      console.error('Error loading lesson names:', error);
    }
  };

  const createNewCourse = () => {
    if (newCourseId.trim()) {
      setAvailableCourses([...availableCourses, newCourseId.trim()]);
      setCourseId(newCourseId.trim());
      setNewCourseId('');
      setShowNewCourseModal(false);
    }
  };

  const createNewModule = () => {
    const moduleNum = parseInt(newModuleNum);
    if (moduleNum && !availableModules.includes(moduleNum)) {
      setAvailableModules([...availableModules, moduleNum].sort((a, b) => a - b));
      setModuleNumber(moduleNum);
      setNewModuleNum('');
      setShowNewModuleModal(false);
    }
  };

  const createNewLesson = () => {
    const lessonNum = parseInt(newLessonNum);
    if (lessonNum && !availableLessons.includes(lessonNum)) {
      setAvailableLessons([...availableLessons, lessonNum].sort((a, b) => a - b));
      setLessonNumber(lessonNum);
      setNewLessonNum('');
      setShowNewLessonModal(false);
    }
  };

  // Add a new content block
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'youtube' ? { videoId: '', title: '' } :
              type === 'image' ? { url: '', alt: '', caption: '' } :
              type === 'heading' ? { text: '', level: 2 } :
              type === 'list' ? { type: 'unordered', items: [''] } : ''
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  // Remove a block
  const removeBlock = (id) => {
    setContentBlocks(contentBlocks.filter(block => block.id !== id));
  };

  // Move block up
  const moveBlockUp = (index) => {
    if (index === 0) return;
    const newBlocks = [...contentBlocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setContentBlocks(newBlocks);
  };

  // Move block down
  const moveBlockDown = (index) => {
    if (index === contentBlocks.length - 1) return;
    const newBlocks = [...contentBlocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setContentBlocks(newBlocks);
  };

  // Update block content
  const updateBlock = (id, content) => {
    setContentBlocks(contentBlocks.map(block =>
      block.id === id ? { ...block, content } : block
    ));
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file, blockId) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `curriculum/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

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

  // Load version history for current lesson
  const loadVersionHistory = async () => {
    setLoadingBackups(true);
    try {
      const backups = await getLessonBackups(courseId, moduleNumber, lessonNumber);
      setLessonBackups(backups);
    } catch (error) {
      console.error('Error loading version history:', error);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Handle opening version history modal
  const handleOpenVersionHistory = async () => {
    setShowVersionHistory(true);
    await loadVersionHistory();
  };

  // Handle restoring from a backup
  const handleRestoreBackup = async (backupId, versionNumber) => {
    if (!confirm(`Are you sure you want to restore to version ${versionNumber}?\n\nThe current content will be backed up before restoring.`)) {
      return;
    }

    setRestoringBackup(backupId);
    try {
      const result = await restoreLessonFromBackup(backupId, user?.id);
      alert(`Successfully restored to version ${versionNumber}!\n\n${result.blockCount} content blocks restored.`);
      setShowVersionHistory(false);
      setSelectedBackupPreview(null);
      // Refresh the version history
      await loadVersionHistory();
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert(`Failed to restore backup: ${error.message}`);
    } finally {
      setRestoringBackup(null);
    }
  };

  // Handle deleting a backup
  const handleDeleteBackup = async (backupId, versionNumber) => {
    if (!confirm(`Are you sure you want to delete version ${versionNumber}?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      await deleteLessonBackup(backupId);
      setLessonBackups(lessonBackups.filter(b => b.id !== backupId));
      if (selectedBackupPreview?.id === backupId) {
        setSelectedBackupPreview(null);
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert(`Failed to delete backup: ${error.message}`);
    }
  };

  // Create a manual backup
  const handleCreateManualBackup = async () => {
    try {
      const backup = await createLessonBackup(courseId, moduleNumber, lessonNumber, 'manual', user?.id);
      if (backup) {
        alert(`Manual backup created (Version ${backup.version_number})`);
        await loadVersionHistory();
      } else {
        alert('No existing content to backup for this lesson.');
      }
    } catch (error) {
      console.error('Error creating manual backup:', error);
      alert(`Failed to create backup: ${error.message}`);
    }
  };

  // Format backup reason for display
  const formatBackupReason = (reason) => {
    switch (reason) {
      case 'manual': return 'Manual backup';
      case 'auto_before_save': return 'Auto (before save)';
      case 'auto_before_audio': return 'Auto (before audio gen)';
      case 'auto_before_restore': return 'Auto (before restore)';
      default: return reason || 'Unknown';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Save curriculum to database
  const saveCurriculum = async () => {
    if (!lessonName.trim()) {
      alert('Please enter a lesson name');
      return;
    }

    setIsUploading(true);
    try {
      // Step 0: Create automatic backup before saving
      try {
        const backup = await createLessonBackup(courseId, moduleNumber, lessonNumber, 'auto_before_save', user?.id);
        if (backup) {
          console.log('📦 Auto-backup created:', backup.version_number);
        }
      } catch (backupError) {
        console.error('Backup creation failed (continuing with save):', backupError);
        // Don't block save if backup fails
      }

      // Step 1: Delete all existing content for this lesson
      const { error: deleteError } = await supabase
        .from('lessons')
        .delete()
        .eq('course_id', courseId)
        .eq('module_number', moduleNumber)
        .eq('lesson_number', lessonNumber);

      if (deleteError) {
        console.error('Error deleting old content:', deleteError);
        // Continue anyway - might just be no existing content
      }

      // Step 2: Insert new content blocks for this lesson
      const blocksToInsert = contentBlocks.map((block, index) => ({
        course_id: courseId,
        module_number: moduleNumber,
        lesson_number: lessonNumber,
        section_number: index + 1,
        lesson_name: lessonName,
        title: block.type === 'heading' ? (typeof block.content === 'object' ? block.content.text : block.content) : `Section ${index + 1}`,
        content_type: block.type,
        content: typeof block.content === 'object' ? block.content : { text: block.content },
        content_text: typeof block.content === 'string' ? block.content :
                     block.type === 'heading' && block.content.text ? block.content.text :
                     block.type === 'youtube' && block.content.title ? block.content.title : '',
        order_index: index
      }));

      const { data, error } = await supabase
        .from('lessons')
        .insert(blocksToInsert)
        .select();

      if (error) throw error;

      alert(`Successfully saved ${data.length} content blocks for ${lessonName}!\n\nA backup of the previous version was automatically created.`);

      // Reset form
      setLessonName('');
      setContentBlocks([{ id: Date.now(), type: 'heading', content: { text: '', level: 1 } }]);
    } catch (error) {
      console.error('Error saving curriculum:', error);
      alert(`Failed to save curriculum: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Render block editor based on type
  const renderBlockEditor = (block, index) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <select
                value={typeof block.content === 'object' ? block.content.level : 1}
                onChange={(e) => updateBlock(block.id, {
                  text: typeof block.content === 'object' ? block.content.text : block.content,
                  level: parseInt(e.target.value)
                })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
              <input
                type="text"
                placeholder="Heading text..."
                value={typeof block.content === 'object' ? block.content.text : block.content}
                onChange={(e) => updateBlock(block.id, {
                  text: e.target.value,
                  level: typeof block.content === 'object' ? block.content.level : 1
                })}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
        );

      case 'paragraph':
        return (
          <textarea
            placeholder="Enter paragraph text..."
            value={block.content}
            onChange={(e) => updateBlock(block.id, e.target.value)}
            className="w-full px-4 py-2 border rounded-lg min-h-[100px]"
          />
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
                <img src={block.content.url} alt={block.content.alt} className="max-w-md rounded-lg" />
                <input
                  type="text"
                  placeholder="Alt text"
                  value={block.content.alt}
                  onChange={(e) => updateBlock(block.id, { ...block.content, alt: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={block.content.caption || ''}
                  onChange={(e) => updateBlock(block.id, { ...block.content, caption: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
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
              placeholder="Video title"
              value={block.content.title || ''}
              onChange={(e) => updateBlock(block.id, { ...block.content, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
            {block.content.videoId && (
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${block.content.videoId}`}
                  title={block.content.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-lg">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold">Curriculum Management</h1>
          </div>
          {activeTab === 'lessons' && (
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Eye size={20} />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={saveCurriculum}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
              >
                <Save size={20} />
                {isUploading ? 'Saving...' : 'Save Lesson'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('courses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'courses'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => setActiveTab('lessons')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === 'lessons'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Lesson Content
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'courses' ? (
          <CourseManagement />
        ) : (
          <>
            {/* Lesson Metadata */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Lesson Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Course ID</label>
              <div className="flex gap-2">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  {availableCourses.length === 0 && (
                    <option value="">No courses found</option>
                  )}
                  {availableCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewCourseModal(true)}
                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  title="Create new course"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Module #</label>
              <div className="flex gap-2">
                <select
                  value={moduleNumber}
                  onChange={(e) => setModuleNumber(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  {availableModules.length === 0 && (
                    <option value="">No modules found</option>
                  )}
                  {availableModules.map((module) => (
                    <option key={module} value={module}>
                      Module {module}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewModuleModal(true)}
                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  title="Create new module"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lesson #</label>
              <div className="flex gap-2">
                <select
                  value={lessonNumber}
                  onChange={(e) => setLessonNumber(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  {availableLessons.length === 0 && (
                    <option value="">No lessons found</option>
                  )}
                  {availableLessons.map((lesson) => (
                    <option key={lesson} value={lesson}>
                      Lesson {lesson}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewLessonModal(true)}
                  className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  title="Create new lesson"
                >
                  <PlusCircle size={20} />
                </button>
                <button
                  onClick={handleOpenVersionHistory}
                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  title="View version history"
                >
                  <History size={20} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lesson Name</label>
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={lessonName}
                  onChange={(e) => setLessonName(e.target.value)}
                  placeholder="e.g., Introduction"
                  className="w-full px-3 py-2 border rounded-lg"
                  list="lesson-names"
                />
                <datalist id="lesson-names">
                  {existingLessonNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {existingLessonNames.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Existing: {existingLessonNames.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals for creating new items */}
        {showNewCourseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Create New Course</h3>
              <input
                type="text"
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
                placeholder="Enter course ID (e.g., product-manager)"
                className="w-full px-3 py-2 border rounded-lg mb-4"
                onKeyPress={(e) => e.key === 'Enter' && createNewCourse()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewCourseModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewCourse}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewModuleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Create New Module</h3>
              <input
                type="number"
                value={newModuleNum}
                onChange={(e) => setNewModuleNum(e.target.value)}
                placeholder="Enter module number (e.g., 2)"
                className="w-full px-3 py-2 border rounded-lg mb-4"
                min="1"
                onKeyPress={(e) => e.key === 'Enter' && createNewModule()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewModuleModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewModule}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showNewLessonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Create New Lesson</h3>
              <input
                type="number"
                value={newLessonNum}
                onChange={(e) => setNewLessonNum(e.target.value)}
                placeholder="Enter lesson number (e.g., 3)"
                className="w-full px-3 py-2 border rounded-lg mb-4"
                min="1"
                onKeyPress={(e) => e.key === 'Enter' && createNewLesson()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewLessonModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewLesson}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Blocks */}
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Content Blocks</h2>
            <div className="flex gap-2">
              <button onClick={() => addBlock('heading')} className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
                + Heading
              </button>
              <button onClick={() => addBlock('paragraph')} className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
                + Paragraph
              </button>
              <button onClick={() => addBlock('image')} className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm flex items-center gap-1">
                <ImageIcon size={14} /> Image
              </button>
              <button onClick={() => addBlock('youtube')} className="px-3 py-1 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm flex items-center gap-1">
                <Youtube size={14} /> YouTube
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {contentBlocks.map((block, index) => (
              <div key={block.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600 capitalize">{block.type}</span>
                  <div className="flex gap-2">
                    <button onClick={() => moveBlockUp(index)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <MoveUp size={16} />
                    </button>
                    <button onClick={() => moveBlockDown(index)} disabled={index === contentBlocks.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30">
                      <MoveDown size={16} />
                    </button>
                    <button onClick={() => removeBlock(block.id)} className="p-1 hover:bg-red-100 text-red-600 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {renderBlockEditor(block, index)}
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {/* Version History Modal */}
        {showVersionHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-xl font-semibold">Version History</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {courseId} / Module {moduleNumber} / Lesson {lessonNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateManualBackup}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
                  >
                    <Save size={16} />
                    Create Backup
                  </button>
                  <button
                    onClick={() => {
                      setShowVersionHistory(false);
                      setSelectedBackupPreview(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex">
                {/* Backup List */}
                <div className="w-1/2 border-r overflow-y-auto p-4">
                  {loadingBackups ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : lessonBackups.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-medium">No backups yet</p>
                      <p className="text-sm mt-1">Backups are created automatically when you save changes.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lessonBackups.map((backup) => (
                        <div
                          key={backup.id}
                          className={`border rounded-lg p-4 cursor-pointer transition ${
                            selectedBackupPreview?.id === backup.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedBackupPreview(backup)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Version {backup.version_number}</span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                  {formatBackupReason(backup.backup_reason)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                <Clock size={14} />
                                {formatDate(backup.created_at)}
                              </div>
                              {backup.lesson_name && (
                                <p className="text-sm text-gray-600 mt-1">"{backup.lesson_name}"</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {backup.content_blocks?.length || 0} content blocks
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreBackup(backup.id, backup.version_number);
                                }}
                                disabled={restoringBackup === backup.id}
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg disabled:opacity-50"
                                title="Restore this version"
                              >
                                {restoringBackup === backup.id ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <RotateCcw size={16} />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBackup(backup.id, backup.version_number);
                                }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                title="Delete this backup"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preview Panel */}
                <div className="w-1/2 overflow-y-auto p-4 bg-gray-50">
                  {selectedBackupPreview ? (
                    <div>
                      <h4 className="font-medium mb-4">Preview - Version {selectedBackupPreview.version_number}</h4>
                      <div className="space-y-3">
                        {selectedBackupPreview.content_blocks?.map((block, index) => (
                          <div key={index} className="bg-white border rounded-lg p-3">
                            <div className="text-xs text-gray-400 mb-1 uppercase">{block.content_type}</div>
                            {block.content_type === 'heading' && (
                              <div className={`font-semibold ${
                                block.content?.level === 1 ? 'text-xl' :
                                block.content?.level === 2 ? 'text-lg' : 'text-base'
                              }`}>
                                {block.content?.text || block.title || '(Empty heading)'}
                              </div>
                            )}
                            {block.content_type === 'paragraph' && (
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {block.content?.text || block.content_text || '(Empty paragraph)'}
                              </div>
                            )}
                            {block.content_type === 'image' && (
                              <div className="text-sm text-gray-500">
                                <ImageIcon size={16} className="inline mr-1" />
                                Image: {block.content?.alt || block.content?.url || '(No description)'}
                              </div>
                            )}
                            {block.content_type === 'youtube' && (
                              <div className="text-sm text-gray-500">
                                <Youtube size={16} className="inline mr-1" />
                                Video: {block.content?.title || block.content?.videoId || '(No title)'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <button
                          onClick={() => handleRestoreBackup(selectedBackupPreview.id, selectedBackupPreview.version_number)}
                          disabled={restoringBackup === selectedBackupPreview.id}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {restoringBackup === selectedBackupPreview.id ? (
                            <>
                              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RotateCcw size={18} />
                              Restore This Version
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <Eye size={48} className="mx-auto mb-3 opacity-30" />
                        <p>Select a version to preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurriculumUpload;
