import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states for new/edit course
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    status: 'requested',
    modules: [{ name: '', lessons: 0 }], // Array of modules with lesson counts
    description: ''
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
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (courseId, newStatus) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: newStatus })
        .eq('id', courseId);

      if (error) throw error;

      // Update local state
      setCourses(courses.map(course =>
        course.id === courseId ? { ...course, status: newStatus } : course
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
      modules: [{ name: '', lessons: 0 }],
      description: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);

    // Parse existing modules/lessons into array format
    let modulesArray = [{ name: '', lessons: 0 }];
    if (course.modules && course.lessons) {
      // If modules is a number like "3", create that many module entries
      if (!isNaN(course.modules)) {
        const moduleCount = parseInt(course.modules);
        const lessonsPerModule = Math.ceil(course.lessons / moduleCount);
        modulesArray = Array.from({ length: moduleCount }, (_, i) => ({
          name: `Module ${i + 1}`,
          lessons: i === moduleCount - 1 ? course.lessons - (lessonsPerModule * (moduleCount - 1)) : lessonsPerModule
        }));
      } else if (course.modules.toLowerCase() === 'multiple') {
        // For "Multiple", create one entry
        modulesArray = [{ name: 'Module 1', lessons: course.lessons || 0 }];
      }
    }

    setFormData({
      name: course.name || '',
      title: course.title || '',
      status: course.status || 'requested',
      modules: modulesArray,
      description: course.description || ''
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
      modules: [{ name: '', lessons: 0 }],
      description: ''
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

      // Calculate total modules and lessons
      const totalModules = formData.modules.length;
      const totalLessons = formData.modules.reduce((sum, mod) => sum + (parseInt(mod.lessons) || 0), 0);

      // Get next display order
      const maxOrder = courses.reduce((max, course) => Math.max(max, course.display_order || 0), 0);

      const courseData = {
        name: generatedName,
        title: formData.title,
        status: formData.status,
        modules: totalModules > 1 ? String(totalModules) : 'Multiple',
        lessons: totalLessons,
        description: formData.description,
        display_order: maxOrder + 1
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

      // Calculate total modules and lessons
      const totalModules = formData.modules.length;
      const totalLessons = formData.modules.reduce((sum, mod) => sum + (parseInt(mod.lessons) || 0), 0);

      const courseData = {
        title: formData.title,
        status: formData.status,
        modules: totalModules > 1 ? String(totalModules) : 'Multiple',
        lessons: totalLessons,
        description: formData.description
      };

      const { error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', selectedCourse.id);

      if (error) throw error;

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
        .eq('id', courseId);

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
          className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
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
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{course.title}</div>
                      <div className="text-xs text-gray-500">{course.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={course.status}
                      onChange={(e) => handleStatusChange(course.id, e.target.value)}
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
                        onClick={() => handleDeleteCourse(course.id, course.title)}
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

              {/* Modules Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modules & Lessons</label>
                {formData.modules.map((module, index) => (
                  <div key={index} className="flex gap-3 mb-3">
                    <input
                      type="text"
                      value={module.name}
                      onChange={(e) => {
                        const newModules = [...formData.modules];
                        newModules[index].name = e.target.value;
                        setFormData({ ...formData, modules: newModules });
                      }}
                      placeholder={`Module ${index + 1} name (optional)`}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                    />
                    <input
                      type="number"
                      value={module.lessons}
                      onChange={(e) => {
                        const newModules = [...formData.modules];
                        newModules[index].lessons = parseInt(e.target.value) || 0;
                        setFormData({ ...formData, modules: newModules });
                      }}
                      placeholder="# lessons"
                      min="0"
                      className="w-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                    />
                    {formData.modules.length > 1 && (
                      <button
                        onClick={() => {
                          const newModules = formData.modules.filter((_, i) => i !== index);
                          setFormData({ ...formData, modules: newModules });
                        }}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove module"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, modules: [...formData.modules, { name: '', lessons: 0 }] })}
                  className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                >
                  + Add Another Module
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter course description..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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

              {/* Modules Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modules & Lessons</label>
                {formData.modules.map((module, index) => (
                  <div key={index} className="flex gap-3 mb-3">
                    <input
                      type="text"
                      value={module.name}
                      onChange={(e) => {
                        const newModules = [...formData.modules];
                        newModules[index].name = e.target.value;
                        setFormData({ ...formData, modules: newModules });
                      }}
                      placeholder={`Module ${index + 1} name (optional)`}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                    />
                    <input
                      type="number"
                      value={module.lessons}
                      onChange={(e) => {
                        const newModules = [...formData.modules];
                        newModules[index].lessons = parseInt(e.target.value) || 0;
                        setFormData({ ...formData, modules: newModules });
                      }}
                      placeholder="# lessons"
                      min="0"
                      className="w-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                    />
                    {formData.modules.length > 1 && (
                      <button
                        onClick={() => {
                          const newModules = formData.modules.filter((_, i) => i !== index);
                          setFormData({ ...formData, modules: newModules });
                        }}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove module"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, modules: [...formData.modules, { name: '', lessons: 0 }] })}
                  className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                >
                  + Add Another Module
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter course description..."
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModals}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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
