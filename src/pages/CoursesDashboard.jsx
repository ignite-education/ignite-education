import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, Trash2 } from 'lucide-react';

const CoursesDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleStatusChange = async (courseId, newStatus) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;

      // Update local state
      setCourses(courses.map(c =>
        c.id === courseId ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      console.error('Error updating course status:', error);
      alert('Failed to update course status');
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
    if (!newCourse.title.trim()) {
      alert('Please enter a course title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([{
          title: newCourse.title,
          name: newCourse.title, // Also set name for compatibility
          status: newCourse.status,
          modules: newCourse.modules,
          lessons: newCourse.lessons,
          description: newCourse.description,
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
      alert('Failed to add course: ' + error.message);
    }
  };

  const getFilteredCourses = () => {
    const liveCourses = courses.filter(c => c.status === 'live');
    const comingSoonCourses = courses.filter(c => c.status === 'coming_soon');
    const requestedCourses = courses.filter(c => c.status === 'requested');

    return { liveCourses, comingSoonCourses, requestedCourses };
  };

  const getStatusBadgeClasses = (status) => {
    const classes = {
      live: 'bg-green-100 text-green-700 hover:bg-green-200',
      coming_soon: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      requested: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    };
    return classes[status] || classes.requested;
  };

  const getStatusLabel = (status) => {
    const labels = {
      live: 'Available',
      coming_soon: 'Coming Soon',
      requested: 'Requested'
    };
    return labels[status] || 'Requested';
  };

  const StatusBadge = ({ course }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition cursor-pointer ${getStatusBadgeClasses(course.status)}`}
        >
          {getStatusLabel(course.status)}
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
              <button
                onClick={() => {
                  handleStatusChange(course.id, 'live');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Available
              </button>
              <button
                onClick={() => {
                  handleStatusChange(course.id, 'coming_soon');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Coming Soon
              </button>
              <button
                onClick={() => {
                  handleStatusChange(course.id, 'requested');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                Requested
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-lg text-white">Loading courses...</div>
      </div>
    );
  }

  const { liveCourses, comingSoonCourses, requestedCourses } = getFilteredCourses();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold">Courses Dashboard</h1>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-pink-500 text-white px-5 py-2.5 rounded-xl hover:bg-pink-600 transition"
          >
            <Plus size={20} />
            Add Course
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8">
          {['all', 'live', 'coming_soon', 'requested'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-5 py-2 rounded-xl font-medium transition ${
                filter === filterOption
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {filterOption === 'all'
                ? 'All'
                : filterOption === 'coming_soon'
                  ? 'Coming Soon'
                  : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Courses List */}
        <div className="space-y-8">
          {(filter === 'all' || filter === 'live') && liveCourses.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Available Courses
              </h2>
              <div className="space-y-2">
                {liveCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white/5 backdrop-blur-sm rounded-xl px-6 py-4 flex items-center justify-between hover:bg-white/10 transition group"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-400">
                        {course.modules && `${course.modules === 'Multiple' ? 'Multiple modules' : `${course.modules} modules`}`}
                        {course.lessons > 0 && ` • ${course.lessons} lessons`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge course={course} />
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(filter === 'all' || filter === 'coming_soon') && comingSoonCourses.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Coming Soon
              </h2>
              <div className="space-y-2">
                {comingSoonCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white/5 backdrop-blur-sm rounded-xl px-6 py-4 flex items-center justify-between hover:bg-white/10 transition group"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-400">
                        {course.modules && `${course.modules === 'Multiple' ? 'Multiple modules' : `${course.modules} modules`}`}
                        {course.lessons > 0 && ` • ${course.lessons} lessons`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge course={course} />
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(filter === 'all' || filter === 'requested') && requestedCourses.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Requested Courses
              </h2>
              <div className="space-y-2">
                {requestedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white/5 backdrop-blur-sm rounded-xl px-6 py-4 flex items-center justify-between hover:bg-white/10 transition group"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-1">{course.title}</h3>
                      <p className="text-sm text-gray-400">
                        {course.modules && `${course.modules === 'Multiple' ? 'Multiple modules' : `${course.modules} modules`}`}
                        {course.lessons > 0 && ` • ${course.lessons} lessons`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge course={course} />
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {courses.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No courses found. Add your first course to get started!
            </div>
          )}
        </div>

        {/* Add Course Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white text-black rounded-xl p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add New Course</h2>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Course Title</label>
                  <input
                    type="text"
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="e.g., Product Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={newCourse.status}
                    onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="live">Available</option>
                    <option value="coming_soon">Coming Soon</option>
                    <option value="requested">Requested</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Modules</label>
                    <input
                      type="text"
                      value={newCourse.modules}
                      onChange={(e) => setNewCourse({ ...newCourse, modules: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., 3 or Multiple"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Lessons</label>
                    <input
                      type="number"
                      value={newCourse.lessons}
                      onChange={(e) => setNewCourse({ ...newCourse, lessons: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    rows={4}
                    placeholder="Brief description of the course..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAdd}
                  className="flex-1 bg-pink-500 text-white px-4 py-2.5 rounded-lg hover:bg-pink-600 transition font-medium"
                >
                  Add Course
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesDashboard;
