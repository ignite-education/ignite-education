import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, ExternalLink } from 'lucide-react';

const ResourcesManagement = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    display_order: 0,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadResources(selectedCourseId);
      handleNewResource();
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('name, title')
        .order('display_order');
      if (error) throw error;
      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].name);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadResources = async (courseId) => {
    if (!courseId) return;
    try {
      const { data, error } = await supabase
        .from('course_resources')
        .select('*')
        .eq('course_id', courseId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!formData.url.trim()) {
      alert('Please enter a URL');
      return;
    }

    try {
      setIsSaving(true);

      const resourceData = {
        course_id: selectedCourseId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        display_order: formData.display_order,
      };

      if (selectedResource) {
        const { error } = await supabase
          .from('course_resources')
          .update(resourceData)
          .eq('id', selectedResource.id);
        if (error) throw error;
        alert('Resource updated!');
      } else {
        const { error } = await supabase
          .from('course_resources')
          .insert([resourceData]);
        if (error) throw error;
        alert('Resource created!');
      }

      await loadResources(selectedCourseId);
      handleNewResource();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectResource = (resource) => {
    setSelectedResource(resource);
    setFormData({
      title: resource.title || '',
      description: resource.description || '',
      url: resource.url || '',
      display_order: resource.display_order || 0,
    });
  };

  const handleNewResource = () => {
    setSelectedResource(null);
    setFormData({ title: '', description: '', url: '', display_order: 0 });
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Delete this resource?')) return;
    try {
      const { error } = await supabase.from('course_resources').delete().eq('id', resourceId);
      if (error) throw error;
      await loadResources(selectedCourseId);
      if (selectedResource?.id === resourceId) handleNewResource();
      alert('Deleted!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const truncateUrl = (url) => {
    try {
      const parsed = new URL(url);
      const display = parsed.hostname + parsed.pathname;
      return display.length > 35 ? display.slice(0, 35) + '...' : display;
    } catch {
      return url.length > 35 ? url.slice(0, 35) + '...' : url;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Resources Management</h1>
          <button onClick={handleNewResource} className="flex items-center gap-2 px-4 py-2 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg">
            <Plus className="w-5 h-5" />
            New Resource
          </button>
        </div>

        {/* Course Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Course</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
          >
            {courses.map(course => (
              <option key={course.name} value={course.name} className="bg-gray-900">
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Resources List */}
          <div className="col-span-3 bg-white/5 rounded-lg p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              Resources ({resources.length})
            </h2>
            <div className="space-y-2">
              {resources.map(resource => (
                <div
                  key={resource.id}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedResource?.id === resource.id ? 'bg-[#EF0B72]/20 border border-[#EF0B72]' : 'bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => handleSelectResource(resource)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{resource.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {truncateUrl(resource.url)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Order: {resource.display_order}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(resource.id); }} className="p-1 hover:bg-red-500/20 rounded flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              {resources.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No resources for this course</p>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="col-span-9 bg-white/5 rounded-lg p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Product Strategy Template"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="A short description of this resource..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72] resize-none"
              />
            </div>

            {/* URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">URL *</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  placeholder="https://example.com/resource"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                />
                {formData.url && (
                  <a
                    href={formData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                )}
              </div>
            </div>

            {/* Display Order */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                className="w-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
              />
              <p className="text-xs text-gray-400 mt-1">Lower numbers appear first</p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : (selectedResource ? 'Update Resource' : 'Create Resource')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesManagement;
