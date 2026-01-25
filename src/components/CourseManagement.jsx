import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { generateCourseDescription } from '../lib/claude';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Form states for new/edit course
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    status: 'requested',
    course_type: 'specialism',
    structure_type: 'modules_and_lessons',
    modules: [{ name: '', lessons: [{ name: '' }] }], // Array of modules with nested lessons
    description: '',
    reddit_channel: '',
    reddit_url: '',
    reddit_read_url: '',
    reddit_post_url: '',
    calendly_url: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      console.log('Fetched courses:', data);
      console.log('First course module_structure:', data?.[0]?.module_structure);
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (courseName, newStatus) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: newStatus })
        .eq('name', courseName);

      if (error) throw error;

      // Update local state
      setCourses(courses.map(course =>
        course.name === courseName ? { ...course, status: newStatus } : course
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  // Helper function to generate course ID from title
  const generateCourseId = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      title: '',
      status: 'requested',
      course_type: 'specialism',
      structure_type: 'modules_and_lessons',
      modules: [{ name: '', lessons: [{ name: '' }] }],
      description: '',
      reddit_channel: '',
      reddit_url: '',
      reddit_read_url: '',
      reddit_post_url: '',
      calendly_url: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);

    console.log('Opening edit modal for course:', course);
    console.log('Course module_structure:', course.module_structure);

    // Parse existing modules/lessons into array format with nested lessons
    let modulesArray = [{ name: '', lessons: [{ name: '' }] }];

    // First, check if we have the detailed module_structure
    if (course.module_structure && Array.isArray(course.module_structure)) {
      console.log('Loading from module_structure');
      modulesArray = course.module_structure;
    } else if (course.modules && course.lessons) {
      console.log('Loading from old format (modules/lessons count)');
      // Fall back to old format: If modules is a number like "3", create that many module entries
      if (!isNaN(course.modules)) {
        const moduleCount = parseInt(course.modules);
        const lessonsPerModule = Math.ceil(course.lessons / moduleCount);
        modulesArray = Array.from({ length: moduleCount }, (_, i) => ({
          name: `Module ${i + 1}`,
          lessons: Array.from({ length: i === moduleCount - 1 ? course.lessons - (lessonsPerModule * (moduleCount - 1)) : lessonsPerModule }, (_, j) => ({
            name: `Lesson ${j + 1}`
          }))
        }));
      } else if (course.modules.toLowerCase() === 'multiple') {
        // For "Multiple", create one module with all lessons
        modulesArray = [{
          name: 'Module 1',
          lessons: Array.from({ length: course.lessons || 1 }, (_, i) => ({ name: `Lesson ${i + 1}` }))
        }];
      }
    }

    setFormData({
      name: course.name || '',
      title: course.title || '',
      status: course.status || 'requested',
      course_type: course.course_type || 'specialism',
      structure_type: course.structure_type || 'modules_and_lessons',
      modules: modulesArray,
      description: course.description || '',
      reddit_channel: course.reddit_channel || '',
      reddit_url: course.reddit_url || '',
      reddit_read_url: course.reddit_read_url || '',
      reddit_post_url: course.reddit_post_url || '',
      calendly_url: course.calendly_link || ''
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedCourse(null);
    setFormData({
      name: '',
      title: '',
      status: 'requested',
      course_type: 'specialism',
      structure_type: 'modules_and_lessons',
      modules: [{ name: '', lessons: [{ name: '' }] }],
      description: '',
      reddit_channel: '',
      reddit_url: '',
      reddit_read_url: '',
      reddit_post_url: '',
      calendly_url: ''
    });
  };

  const handleAddCourse = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a course title');
      return;
    }

    try {
      setSaving(true);

      // Auto-generate course ID from title
      const generatedName = generateCourseId(formData.title);

      // Calculate total modules and lessons from nested structure
      const totalModules = formData.modules.length;
      const totalLessons = formData.modules.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0);

      // Get next display order
      const maxOrder = courses.reduce((max, course) => Math.max(max, course.display_order || 0), 0);

      const courseData = {
        name: generatedName,
        title: formData.title,
        status: formData.status,
        course_type: formData.course_type || 'specialism',
        structure_type: formData.structure_type || 'modules_and_lessons',
        modules: totalModules > 1 ? String(totalModules) : 'Multiple',
        lessons: totalLessons,
        description: formData.description,
        display_order: maxOrder + 1,
        module_structure: formData.modules, // Save the full nested structure
        reddit_channel: formData.reddit_channel,
        reddit_url: formData.reddit_url,
        reddit_read_url: formData.reddit_read_url,
        reddit_post_url: formData.reddit_post_url,
        calendly_link: formData.calendly_url
      };

      const { error } = await supabase
        .from('courses')
        .insert([courseData]);

      if (error) throw error;

      alert('Course added successfully!');
      closeModals();
      fetchCourses();
    } catch (error) {
      console.error('Error adding course:', error);
      alert(`Failed to add course: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a course title');
      return;
    }

    try {
      setSaving(true);

      // Calculate total modules and lessons from nested structure
      const totalModules = formData.modules.length;
      const totalLessons = formData.modules.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0);

      const courseData = {
        title: formData.title,
        status: formData.status,
        course_type: formData.course_type || 'specialism',
        structure_type: formData.structure_type || 'modules_and_lessons',
        modules: totalModules > 1 ? String(totalModules) : 'Multiple',
        lessons: totalLessons,
        description: formData.description,
        module_structure: formData.modules, // Save the full nested structure
        reddit_channel: formData.reddit_channel,
        reddit_url: formData.reddit_url,
        reddit_read_url: formData.reddit_read_url,
        reddit_post_url: formData.reddit_post_url,
        calendly_link: formData.calendly_url
      };

      console.log('Saving course data:', courseData);
      console.log('Module structure being saved:', JSON.stringify(formData.modules, null, 2));

      const { data, error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('name', selectedCourse.name)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Updated course data from database:', data);

      alert('Course updated successfully!');
      closeModals();
      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
      alert(`Failed to update course: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!window.confirm(`Are you sure you want to delete "${courseName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('name', courseId);

      if (error) throw error;

      alert('Course deleted successfully!');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(`Failed to delete course: ${error.message}`);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'coming_soon':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'requested':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'live':
        return 'Live';
      case 'coming_soon':
        return 'Coming Soon';
      case 'requested':
        return 'Requested';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
          <p className="text-gray-600 mt-1">Manage all courses, their status, and details</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-black rounded-lg hover:bg-pink-600 transition"
        >
          <Plus size={20} />
          Add New Course
        </button>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Modules
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lessons
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {courses.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  No courses found. Click "Add New Course" to create one.
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{course.title}</div>
                      <div className="text-xs text-gray-500">{course.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={course.status}
                      onChange={(e) => handleStatusChange(course.name, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(course.status)} cursor-pointer`}
                    >
                      <option value="live">Live</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="requested">Requested</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {course.modules || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {course.lessons || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {course.display_order}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(course)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit course"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.name, course.title)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold">Add New Course</h3>
              <button onClick={closeModals} className="p-1 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Product Manager"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">The course ID will be auto-generated from this title</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                >
                  <option value="requested">Requested</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="live">Live</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Type</label>
                <select
                  value={formData.course_type || 'specialism'}
                  onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                >
                  <option value="specialism">Specialism</option>
                  <option value="skill">Skill</option>
                  <option value="subject">Subject</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Specialism: Career-focused (e.g., Product Manager) • Skill: Specific ability (e.g., Excel) • Subject: Academic topic (e.g., Statistics)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Display Structure</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      // When switching to modules_and_lessons, ensure proper structure
                      if (formData.structure_type === 'lessons_only') {
                        // Flatten all lessons into one module
                        const allLessons = formData.modules.flatMap(m => m.lessons || []);
                        setFormData({
                          ...formData,
                          structure_type: 'modules_and_lessons',
                          modules: allLessons.length > 0 ? [{ name: '', lessons: allLessons }] : [{ name: '', lessons: [{ name: '' }] }]
                        });
                      } else {
                        setFormData({ ...formData, structure_type: 'modules_and_lessons' });
                      }
                    }}
                    className={`px-4 py-3 border-2 rounded-lg text-left transition ${
                      formData.structure_type === 'modules_and_lessons'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">Modules & Lessons</div>
                    <div className="text-xs text-gray-600">Hierarchical structure with grouped lessons</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // When switching to lessons_only, flatten all lessons
                      if (formData.structure_type === 'modules_and_lessons') {
                        const allLessons = formData.modules.flatMap(m => m.lessons || []);
                        setFormData({
                          ...formData,
                          structure_type: 'lessons_only',
                          modules: [{ name: 'Default Module', lessons: allLessons.length > 0 ? allLessons : [{ name: '' }] }]
                        });
                      } else {
                        setFormData({ ...formData, structure_type: 'lessons_only' });
                      }
                    }}
                    className={`px-4 py-3 border-2 rounded-lg text-left transition ${
                      formData.structure_type === 'lessons_only'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">Lessons Only</div>
                    <div className="text-xs text-gray-600">Flat list without module grouping</div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This affects how content is displayed on course pages.
                </p>
              </div>

              {/* Conditional rendering based on structure type */}
              {formData.structure_type === 'lessons_only' ? (
                // Lessons Only Mode
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lessons</label>
                  <div className="space-y-2">
                    {formData.modules[0]?.lessons.map((lesson, lessonIndex) => (
                      <div key={lessonIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={lesson.name}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[0].lessons[lessonIndex].name = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          placeholder={`Lesson ${lessonIndex + 1} name`}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                        />
                        {formData.modules[0].lessons.length > 1 && (
                          <button
                            onClick={() => {
                              const newModules = [...formData.modules];
                              newModules[0].lessons = newModules[0].lessons.filter((_, i) => i !== lessonIndex);
                              setFormData({ ...formData, modules: newModules });
                            }}
                            className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove lesson"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newModules = [...formData.modules];
                        newModules[0].lessons.push({ name: '' });
                        setFormData({ ...formData, modules: newModules });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 border-2 border-pink-500 text-pink-600 rounded-lg hover:bg-pink-200 transition text-sm font-medium"
                    >
                      <Plus size={16} />
                      Add Lesson
                    </button>
                  </div>
                </div>
              ) : (
                // Modules & Lessons Mode
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modules & Lessons</label>
                  {formData.modules.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="mb-4 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                      {/* Module Header */}
                      <div className="flex gap-3 mb-3">
                        <input
                          type="text"
                          value={module.name}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].name = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          placeholder={`Module ${moduleIndex + 1} name`}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900 font-medium"
                        />
                        {formData.modules.length > 1 && (
                          <button
                            onClick={() => {
                              const newModules = formData.modules.filter((_, i) => i !== moduleIndex);
                              setFormData({ ...formData, modules: newModules });
                            }}
                            className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove module"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>

                      {/* Lessons for this module */}
                      <div className="ml-4 space-y-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Lessons</label>
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div key={lessonIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={lesson.name}
                              onChange={(e) => {
                                const newModules = [...formData.modules];
                                newModules[moduleIndex].lessons[lessonIndex].name = e.target.value;
                                setFormData({ ...formData, modules: newModules });
                              }}
                              placeholder={`Lesson ${lessonIndex + 1} name`}
                              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900 text-sm"
                            />
                            {module.lessons.length > 1 && (
                              <button
                                onClick={() => {
                                  const newModules = [...formData.modules];
                                  newModules[moduleIndex].lessons = newModules[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
                                  setFormData({ ...formData, modules: newModules });
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Remove lesson"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].lessons.push({ name: '' });
                            setFormData({ ...formData, modules: newModules });
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 border-2 border-pink-500 text-pink-600 rounded-lg hover:bg-pink-200 transition text-sm font-medium"
                        >
                          <Plus size={16} />
                          Add Lesson
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData({ ...formData, modules: [...formData.modules, { name: '', lessons: [{ name: '' }] }] })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    <Plus size={16} />
                    Add Another Module
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.title.trim()) {
                        alert('Please enter a course title first');
                        return;
                      }

                      if (formData.modules.length === 0 ||
                          !formData.modules[0].name ||
                          formData.modules[0].lessons.length === 0) {
                        alert('Please add at least one module and lesson first');
                        return;
                      }

                      try {
                        setGeneratingDescription(true);
                        const description = await generateCourseDescription(
                          formData.title,
                          formData.course_type || 'specialism',
                          formData.modules
                        );
                        setFormData({ ...formData, description });
                      } catch (error) {
                        alert(error.message || 'Failed to generate description');
                      } finally {
                        setGeneratingDescription(false);
                      }
                    }}
                    disabled={generatingDescription}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingDescription ? (
                      <>
                        <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto-Generate with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter course description..."
                  rows="4"
                  maxLength="250"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/250 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Channel</label>
                <input
                  type="text"
                  value={formData.reddit_channel}
                  onChange={(e) => setFormData({ ...formData, reddit_channel: e.target.value })}
                  placeholder="e.g., r/ProductManagement"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Format: r/channelname (will be displayed in community forum)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Channel URL (Legacy)</label>
                <input
                  type="text"
                  value={formData.reddit_url}
                  onChange={(e) => setFormData({ ...formData, reddit_url: e.target.value })}
                  placeholder="e.g., https://www.reddit.com/r/ProductManagement/"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Legacy field - kept for backward compatibility</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Thread for Display</label>
                <input
                  type="text"
                  value={formData.reddit_read_url}
                  onChange={(e) => setFormData({ ...formData, reddit_read_url: e.target.value })}
                  placeholder="e.g., https://www.reddit.com/r/ProductManagement/"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Full Reddit URL for the subreddit to fetch and display posts from</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Thread for Posting</label>
                <input
                  type="text"
                  value={formData.reddit_post_url}
                  onChange={(e) => setFormData({ ...formData, reddit_post_url: e.target.value })}
                  placeholder="e.g., https://www.reddit.com/r/PMcareers/"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Full Reddit URL for the subreddit where user posts will be submitted</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Calendly URL</label>
                <input
                  type="text"
                  value={formData.calendly_url}
                  onChange={(e) => setFormData({ ...formData, calendly_url: e.target.value })}
                  placeholder="e.g., https://calendly.com/your-team/office-hours"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Round-robin Calendly link for office hours booking</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCourse}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold">Edit Course</h3>
              <button onClick={closeModals} className="p-1 hover:bg-gray-100 rounded">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course ID (Cannot be changed)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Product Manager"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                >
                  <option value="requested">Requested</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="live">Live</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Type</label>
                <select
                  value={formData.course_type || 'specialism'}
                  onChange={(e) => setFormData({ ...formData, course_type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                >
                  <option value="specialism">Specialism</option>
                  <option value="skill">Skill</option>
                  <option value="subject">Subject</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Specialism: Career-focused (e.g., Product Manager) • Skill: Specific ability (e.g., Excel) • Subject: Academic topic (e.g., Statistics)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content Display Structure</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      // When switching to modules_and_lessons, ensure proper structure
                      if (formData.structure_type === 'lessons_only') {
                        // Flatten all lessons into one module
                        const allLessons = formData.modules.flatMap(m => m.lessons || []);
                        setFormData({
                          ...formData,
                          structure_type: 'modules_and_lessons',
                          modules: allLessons.length > 0 ? [{ name: '', lessons: allLessons }] : [{ name: '', lessons: [{ name: '' }] }]
                        });
                      } else {
                        setFormData({ ...formData, structure_type: 'modules_and_lessons' });
                      }
                    }}
                    className={`px-4 py-3 border-2 rounded-lg text-left transition ${
                      formData.structure_type === 'modules_and_lessons'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">Modules & Lessons</div>
                    <div className="text-xs text-gray-600">Hierarchical structure with grouped lessons</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // When switching to lessons_only, flatten all lessons
                      if (formData.structure_type === 'modules_and_lessons') {
                        const allLessons = formData.modules.flatMap(m => m.lessons || []);
                        setFormData({
                          ...formData,
                          structure_type: 'lessons_only',
                          modules: [{ name: 'Default Module', lessons: allLessons.length > 0 ? allLessons : [{ name: '' }] }]
                        });
                      } else {
                        setFormData({ ...formData, structure_type: 'lessons_only' });
                      }
                    }}
                    className={`px-4 py-3 border-2 rounded-lg text-left transition ${
                      formData.structure_type === 'lessons_only'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">Lessons Only</div>
                    <div className="text-xs text-gray-600">Flat list without module grouping</div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This affects how content is displayed on course pages.
                </p>
              </div>

              {/* Conditional rendering based on structure type */}
              {formData.structure_type === 'lessons_only' ? (
                // Lessons Only Mode
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lessons</label>
                  <div className="space-y-2">
                    {formData.modules[0]?.lessons.map((lesson, lessonIndex) => (
                      <div key={lessonIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={lesson.name}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[0].lessons[lessonIndex].name = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          placeholder={`Lesson ${lessonIndex + 1} name`}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                        />
                        {formData.modules[0].lessons.length > 1 && (
                          <button
                            onClick={() => {
                              const newModules = [...formData.modules];
                              newModules[0].lessons = newModules[0].lessons.filter((_, i) => i !== lessonIndex);
                              setFormData({ ...formData, modules: newModules });
                            }}
                            className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove lesson"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newModules = [...formData.modules];
                        newModules[0].lessons.push({ name: '' });
                        setFormData({ ...formData, modules: newModules });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 border-2 border-pink-500 text-pink-600 rounded-lg hover:bg-pink-200 transition text-sm font-medium"
                    >
                      <Plus size={16} />
                      Add Lesson
                    </button>
                  </div>
                </div>
              ) : (
                // Modules & Lessons Mode
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modules & Lessons</label>
                  {formData.modules.map((module, moduleIndex) => (
                    <div key={moduleIndex} className="mb-4 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                      {/* Module Header */}
                      <div className="flex gap-3 mb-3">
                        <input
                          type="text"
                          value={module.name}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].name = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          placeholder={`Module ${moduleIndex + 1} name`}
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900 font-medium"
                        />
                        {formData.modules.length > 1 && (
                          <button
                            onClick={() => {
                              const newModules = formData.modules.filter((_, i) => i !== moduleIndex);
                              setFormData({ ...formData, modules: newModules });
                            }}
                            className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove module"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>

                      {/* Lessons for this module */}
                      <div className="ml-4 space-y-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Lessons</label>
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div key={lessonIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={lesson.name}
                              onChange={(e) => {
                                const newModules = [...formData.modules];
                                newModules[moduleIndex].lessons[lessonIndex].name = e.target.value;
                                setFormData({ ...formData, modules: newModules });
                              }}
                              placeholder={`Lesson ${lessonIndex + 1} name`}
                              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900 text-sm"
                            />
                            {module.lessons.length > 1 && (
                              <button
                                onClick={() => {
                                  const newModules = [...formData.modules];
                                  newModules[moduleIndex].lessons = newModules[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
                                  setFormData({ ...formData, modules: newModules });
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Remove lesson"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].lessons.push({ name: '' });
                            setFormData({ ...formData, modules: newModules });
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 border-2 border-pink-500 text-pink-600 rounded-lg hover:bg-pink-200 transition text-sm font-medium"
                        >
                          <Plus size={16} />
                          Add Lesson
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData({ ...formData, modules: [...formData.modules, { name: '', lessons: [{ name: '' }] }] })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-400 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    <Plus size={16} />
                    Add Another Module
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!formData.title.trim()) {
                        alert('Please enter a course title first');
                        return;
                      }

                      if (formData.modules.length === 0 ||
                          !formData.modules[0].name ||
                          formData.modules[0].lessons.length === 0) {
                        alert('Please add at least one module and lesson first');
                        return;
                      }

                      try {
                        setGeneratingDescription(true);
                        const description = await generateCourseDescription(
                          formData.title,
                          formData.course_type || 'specialism',
                          formData.modules
                        );
                        setFormData({ ...formData, description });
                      } catch (error) {
                        alert(error.message || 'Failed to generate description');
                      } finally {
                        setGeneratingDescription(false);
                      }
                    }}
                    disabled={generatingDescription}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-300 rounded-lg hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingDescription ? (
                      <>
                        <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto-Generate with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter course description..."
                  rows="4"
                  maxLength="250"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/250 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Channel</label>
                <input
                  type="text"
                  value={formData.reddit_channel}
                  onChange={(e) => setFormData({ ...formData, reddit_channel: e.target.value })}
                  placeholder="e.g., r/ProductManagement"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Format: r/channelname (will be displayed in community forum)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Channel URL (Legacy)</label>
                <input
                  type="text"
                  value={formData.reddit_url}
                  onChange={(e) => setFormData({ ...formData, reddit_url: e.target.value })}
                  placeholder="e.g., https://www.reddit.com/r/ProductManagement/"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Legacy field - kept for backward compatibility</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Thread for Display</label>
                <input
                  type="text"
                  value={formData.reddit_read_url}
                  onChange={(e) => setFormData({ ...formData, reddit_read_url: e.target.value })}
                  placeholder="e.g., https://www.reddit.com/r/ProductManagement/"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Full Reddit URL for the subreddit to fetch and display posts from</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reddit Thread for Posting</label>
                <input
                  type="text"
                  value={formData.reddit_post_url}
                  onChange={(e) => setFormData({ ...formData, reddit_post_url: e.target.value })}
                  placeholder="e.g., https://www.reddit.com/r/PMcareers/"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Full Reddit URL for the subreddit where user posts will be submitted</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Calendly URL</label>
                <input
                  type="text"
                  value={formData.calendly_url}
                  onChange={(e) => setFormData({ ...formData, calendly_url: e.target.value })}
                  placeholder="e.g., https://calendly.com/your-team/office-hours"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Round-robin Calendly link for office hours booking</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCourse}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
