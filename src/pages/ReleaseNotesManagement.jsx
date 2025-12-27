import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, ArrowLeft, MoveUp, MoveDown } from 'lucide-react';

const ReleaseNotesManagement = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState([]);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    version: '',
    release_date: '',
    status: 'draft',
    blog_url: ''
  });

  const [notes, setNotes] = useState(['']);

  useEffect(() => {
    loadReleases();
  }, []);

  const loadReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('release_notes')
        .select('*')
        .order('release_date', { ascending: false });

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error loading releases:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRelease = async () => {
    if (!formData.version.trim()) {
      alert('Please enter a version number');
      return;
    }
    if (!formData.release_date) {
      alert('Please select a release date');
      return;
    }

    const filteredNotes = notes.filter(note => note.trim() !== '');
    if (filteredNotes.length === 0) {
      alert('Please add at least one release note');
      return;
    }

    try {
      setIsSaving(true);

      const releaseData = {
        version: formData.version.trim(),
        release_date: formData.release_date,
        notes: filteredNotes,
        status: formData.status,
        blog_url: formData.blog_url.trim() || null
      };

      if (selectedRelease) {
        const { error } = await supabase
          .from('release_notes')
          .update(releaseData)
          .eq('id', selectedRelease.id);
        if (error) throw error;
        alert('Release updated!');
      } else {
        const { error } = await supabase
          .from('release_notes')
          .insert([releaseData]);
        if (error) throw error;
        alert('Release created!');
      }

      await loadReleases();
      handleNewRelease();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectRelease = (release) => {
    setSelectedRelease(release);
    setFormData({
      version: release.version || '',
      release_date: release.release_date || '',
      status: release.status || 'draft',
      blog_url: release.blog_url || ''
    });
    setNotes(release.notes && release.notes.length > 0 ? release.notes : ['']);
  };

  const handleNewRelease = () => {
    setSelectedRelease(null);
    setFormData({
      version: '',
      release_date: '',
      status: 'draft',
      blog_url: ''
    });
    setNotes(['']);
  };

  const handleDeleteRelease = async (releaseId) => {
    if (!confirm('Delete this release?')) return;
    try {
      const { error } = await supabase.from('release_notes').delete().eq('id', releaseId);
      if (error) throw error;
      await loadReleases();
      if (selectedRelease?.id === releaseId) handleNewRelease();
      alert('Deleted!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Note management functions
  const addNote = () => {
    setNotes([...notes, '']);
  };

  const updateNote = (index, value) => {
    const newNotes = [...notes];
    newNotes[index] = value;
    setNotes(newNotes);
  };

  const removeNote = (index) => {
    if (notes.length <= 1) return;
    setNotes(notes.filter((_, i) => i !== index));
  };

  const moveNoteUp = (index) => {
    if (index === 0) return;
    const newNotes = [...notes];
    [newNotes[index - 1], newNotes[index]] = [newNotes[index], newNotes[index - 1]];
    setNotes(newNotes);
  };

  const moveNoteDown = (index) => {
    if (index === notes.length - 1) return;
    const newNotes = [...notes];
    [newNotes[index], newNotes[index + 1]] = [newNotes[index + 1], newNotes[index]];
    setNotes(newNotes);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/progress')} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">Release Notes Management</h1>
          </div>
          <button onClick={handleNewRelease} className="flex items-center gap-2 px-4 py-2 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg">
            <Plus className="w-5 h-5" />
            New Release
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Releases List */}
          <div className="col-span-3 bg-white/5 rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">All Releases</h2>
            <div className="space-y-2">
              {releases.map(release => (
                <div
                  key={release.id}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedRelease?.id === release.id ? 'bg-[#EF0B72]/20 border border-[#EF0B72]' : 'bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => handleSelectRelease(release)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{release.version}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(release.release_date)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {release.status === 'published' ? '✓ Published' : '📝 Draft'}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRelease(release.id); }} className="p-1 hover:bg-red-500/20 rounded">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              {releases.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No releases yet</p>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="col-span-9 bg-white/5 rounded-lg p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Version */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Version *</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                placeholder="e.g., v1.01"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
              />
            </div>

            {/* Release Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Release Date *</label>
              <input
                type="date"
                value={formData.release_date}
                onChange={(e) => handleInputChange('release_date', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
              />
            </div>

            {/* Status */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
              >
                <option value="draft" className="bg-gray-900">Draft</option>
                <option value="published" className="bg-gray-900">Published</option>
              </select>
            </div>

            {/* Blog URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Blog Post URL (optional)</label>
              <input
                type="url"
                value={formData.blog_url}
                onChange={(e) => handleInputChange('blog_url', e.target.value)}
                placeholder="https://example.com/blog/release-announcement"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
              />
            </div>

            {/* Release Notes */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Release Notes *</label>
                <button
                  onClick={addNote}
                  className="text-sm text-[#EF0B72] hover:text-[#D10A64] flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Note
                </button>
              </div>
              <div className="space-y-3">
                {notes.map((note, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 mt-3 w-6 text-center">•</span>
                    <textarea
                      value={note}
                      onChange={(e) => updateNote(index, e.target.value)}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      placeholder="Enter release note..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72] resize-none min-h-[48px]"
                      style={{ height: 'auto' }}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveNoteUp(index)}
                        disabled={index === 0}
                        className={`p-1.5 rounded ${index === 0 ? 'text-gray-600' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveNoteDown(index)}
                        disabled={index === notes.length - 1}
                        className={`p-1.5 rounded ${index === notes.length - 1 ? 'text-gray-600' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      {notes.length > 1 && (
                        <button
                          onClick={() => removeNote(index)}
                          className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={handleSaveRelease}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : (selectedRelease ? 'Update Release' : 'Create Release')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotesManagement;
