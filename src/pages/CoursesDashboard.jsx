import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Edit2, Plus, Save, X, Trash2 } from 'lucide-react';

const CoursesDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filter, setFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    status: 'requested',
    modules: '',
    lessons: 0,
    description: ''
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    setEditingId(course.id);
    setEditForm({
      title: course.title,
      status: course.status,
      modules: course.modules,
      lessons: course.lessons,
      description: course.description
    });
  };

  const handleSave = async (id) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setCourses(courses.map(c => c.id === id ? { ...c, ...editForm } : c));
      setEditingId(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCourses(courses.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const handleAdd = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([{
          ...newCourse,
          display_order: courses.length + 1
        }])
        .select();

      if (error) throw error;

      setCourses([...courses, data[0]]);
      setIsAdding(false);
      setNewCourse({
        title: '',
        status: 'requested',
        modules: '',
        lessons: 0,
        description: ''
      });
    } catch (error) {
      console.error('Error adding course:', error);
      alert('Failed to add course');
    }
  };

  const filteredCourses = filter === 'all'
    ? courses
    : courses.filter(c => c.status === filter);

  const getStatusBadge = (status) => {
    const styles = {
      live: 'bg-green-100 text-green-700',
      coming_soon: 'bg-blue-100 text-blue-700',
      requested: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      live: 'Live',
      coming_soon: 'Coming Soon',
      requested: 'Requested'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Courses Dashboard</h1>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition"
          >
            <Plus size={20} />
            Add Course
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'live', 'coming_soon', 'requested'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === filterOption
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {filterOption === 'all' ? 'All' : filterOption === 'coming_soon' ? 'Coming Soon' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Add Course Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">Add New Course</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={newCourse.status}
                    onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="live">Live</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="requested">Requested</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modules</label>
                  <input
                    type="text"
                    value={newCourse.modules}
                    onChange={(e) => setNewCourse({ ...newCourse, modules: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 3 or Multiple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lessons</label>
                  <input
                    type="number"
                    value={newCourse.lessons}
                    onChange={(e) => setNewCourse({ ...newCourse, lessons: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleAdd}
                  className="flex-1 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition"
                >
                  Add Course
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Courses Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modules</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessons</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  {editingId === course.id ? (
                    // Edit Mode
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                        >
                          <option value="live">Live</option>
                          <option value="coming_soon">Coming Soon</option>
                          <option value="requested">Requested</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.modules}
                          onChange={(e) => setEditForm({ ...editForm, modules: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={editForm.lessons}
                          onChange={(e) => setEditForm({ ...editForm, lessons: parseInt(e.target.value) || 0 })}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full border rounded px-2 py-1"
                          rows={2}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(course.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.title}</td>
                      <td className="px-6 py-4">{getStatusBadge(course.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{course.modules}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{course.lessons}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{course.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(course)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCourses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No courses found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursesDashboard;
