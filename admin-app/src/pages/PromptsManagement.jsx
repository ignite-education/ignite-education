import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Save, Check, X, Lightbulb, Users, Eye, Bold } from 'lucide-react';

const LLM_TOOLS = ['Claude', 'Co-Pilot', 'ChatGPT', 'Gemini'];
const COMPLEXITIES = ['Low', 'Mid', 'High'];

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PromptsManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('published');

  // Published prompts state
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    full_prompt: '',
    profession: '',
    llm_tools: [],
    complexity: 'Mid',
    usage_count: 0,
    rating: 0,
    status: 'published',
  });

  // Contributions state
  const [contributions, setContributions] = useState([]);
  const [contributionFilter, setContributionFilter] = useState('pending');
  const [reviewingContribution, setReviewingContribution] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Professions from specialism courses
  const [professions, setProfessions] = useState([]);
  const promptTextareaRef = useRef(null);

  useEffect(() => {
    loadPrompts();
    loadContributions();
    loadProfessions();
  }, []);

  const loadProfessions = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('title, name, course_type')
      .in('status', ['live', 'coming_soon']);
    if (error) { console.error('Error loading courses:', error); return; }
    const specialisms = (data || [])
      .filter(c => !c.course_type || c.course_type === 'specialism')
      .map(c => c.title || c.name)
      .sort();
    setProfessions(specialisms);
  };

  // ---- Data loading ----

  const loadPrompts = async () => {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Error loading prompts:', error); return; }
    setPrompts(data || []);
  };

  const loadContributions = async () => {
    const { data, error } = await supabase
      .from('prompt_contributions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Error loading contributions:', error); return; }
    setContributions(data || []);
  };

  // ---- Published prompts CRUD ----

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleLlmTool = (tool) => {
    setFormData(prev => ({
      ...prev,
      llm_tools: prev.llm_tools.includes(tool)
        ? prev.llm_tools.filter(t => t !== tool)
        : [...prev.llm_tools, tool],
    }));
  };

  const toggleBold = () => {
    const ta = promptTextareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = formData.full_prompt;
    if (start === end) {
      // No selection — insert empty bold markers
      const updated = text.slice(0, start) + '****' + text.slice(end);
      handleInputChange('full_prompt', updated);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, start + 2); }, 0);
    } else {
      const selected = text.slice(start, end);
      // If already wrapped in **, unwrap
      if (text.slice(start - 2, start) === '**' && text.slice(end, end + 2) === '**') {
        const updated = text.slice(0, start - 2) + selected + text.slice(end + 2);
        handleInputChange('full_prompt', updated);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(start - 2, end - 2); }, 0);
      } else {
        const updated = text.slice(0, start) + '**' + selected + '**' + text.slice(end);
        handleInputChange('full_prompt', updated);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(start + 2, end + 2); }, 0);
      }
    }
  };

  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setReviewingContribution(null);
    setFormData({
      title: '',
      description: '',
      full_prompt: '',
      profession: '',
      llm_tools: [],
      complexity: 'Mid',
      usage_count: 0,
      rating: 0,
      status: 'published',
    });
  };

  const handleSelectPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setReviewingContribution(null);
    setFormData({
      title: prompt.title || '',
      description: prompt.description || '',
      full_prompt: prompt.full_prompt || '',
      profession: prompt.profession || '',
      llm_tools: prompt.llm_tools || [],
      complexity: prompt.complexity || 'Mid',
      usage_count: prompt.usage_count || 0,
      rating: Number(prompt.rating) || 0,
      status: prompt.status || 'published',
    });
  };

  const handleSavePrompt = async () => {
    if (!formData.title.trim()) { alert('Please enter a title'); return; }
    if (!formData.description.trim()) { alert('Please enter a description'); return; }
    if (!formData.full_prompt.trim()) { alert('Please enter the full prompt'); return; }
    if (!formData.profession.trim()) { alert('Please enter a profession'); return; }
    if (formData.llm_tools.length === 0) { alert('Please select at least one AI tool'); return; }

    const slug = generateSlug(formData.title);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('prompts')
      .select('id')
      .eq('slug', slug)
      .neq('id', selectedPrompt?.id || '00000000-0000-0000-0000-000000000000')
      .maybeSingle();

    if (existing) {
      alert('A prompt with a similar title already exists. Please choose a different title.');
      return;
    }

    try {
      setIsSaving(true);

      const promptData = {
        title: formData.title.trim(),
        slug,
        description: formData.description.trim(),
        full_prompt: formData.full_prompt.trim(),
        profession: formData.profession.trim(),
        llm_tools: formData.llm_tools,
        complexity: formData.complexity,
        usage_count: Number(formData.usage_count) || 0,
        rating: Number(formData.rating) || 0,
        status: formData.status,
        ...(reviewingContribution ? { contribution_id: reviewingContribution.id } : {}),
      };

      if (selectedPrompt) {
        const { error } = await supabase
          .from('prompts')
          .update(promptData)
          .eq('id', selectedPrompt.id);
        if (error) throw error;
        alert('Prompt updated!');
      } else {
        const { error } = await supabase
          .from('prompts')
          .insert([promptData]);
        if (error) throw error;

        // If approving a contribution, update its status
        if (reviewingContribution) {
          await supabase
            .from('prompt_contributions')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user?.id,
            })
            .eq('id', reviewingContribution.id);
          await loadContributions();
        }

        alert('Prompt published!');
      }

      await loadPrompts();
      handleNewPrompt();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = async (promptId) => {
    if (!confirm('Delete this prompt? This will remove it from the public toolkit.')) return;
    try {
      const { error } = await supabase.from('prompts').delete().eq('id', promptId);
      if (error) throw error;
      await loadPrompts();
      if (selectedPrompt?.id === promptId) handleNewPrompt();
      alert('Deleted!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // ---- Contributions ----

  const handleReviewContribution = (contribution) => {
    setActiveTab('published');
    setSelectedPrompt(null);
    setReviewingContribution(contribution);
    setFormData({
      title: contribution.title || '',
      description: contribution.description || '',
      full_prompt: contribution.full_prompt || '',
      profession: contribution.profession || '',
      llm_tools: contribution.llm_tools || [],
      complexity: contribution.complexity || 'Mid',
      usage_count: 0,
      rating: 0,
      status: 'published',
    });
  };

  const handleRejectContribution = async (contributionId) => {
    if (!confirm('Reject this contribution?')) return;
    try {
      await supabase
        .from('prompt_contributions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectionReason.trim() || null,
        })
        .eq('id', contributionId);
      setRejectionReason('');
      await loadContributions();
      alert('Contribution rejected.');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // ---- Filtering ----

  const filteredPrompts = prompts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContributions = contributions.filter(c => c.status === contributionFilter);
  const pendingCount = contributions.filter(c => c.status === 'pending').length;

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Prompts Management</h1>
          <div className="flex items-center gap-3">
            {/* Tab buttons */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('published')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'published' ? 'bg-[#EF0B72] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Published
              </button>
              <button
                onClick={() => setActiveTab('contributions')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'contributions' ? 'bg-[#EF0B72] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Contributions
                {pendingCount > 0 && (
                  <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
            {activeTab === 'published' && (
              <button onClick={handleNewPrompt} className="flex items-center gap-2 px-4 py-2 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg">
                <Plus className="w-5 h-5" />
                New Prompt
              </button>
            )}
          </div>
        </div>

        {activeTab === 'published' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Prompts List */}
            <div className="col-span-3 bg-white/5 rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EF0B72]"
                />
              </div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">{filteredPrompts.length} prompts</h2>
              <div className="space-y-2">
                {filteredPrompts.map(prompt => (
                  <div
                    key={prompt.id}
                    className={`p-3 rounded-lg cursor-pointer ${
                      selectedPrompt?.id === prompt.id ? 'bg-[#EF0B72]/20 border border-[#EF0B72]' : 'bg-white/5 hover:bg-white/10'
                    }`}
                    onClick={() => handleSelectPrompt(prompt)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{prompt.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{prompt.profession}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            prompt.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {prompt.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePrompt(prompt.id); }}
                        className="p-1 hover:bg-red-500/20 rounded flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredPrompts.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">No prompts found</p>
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="col-span-9 bg-white/5 rounded-lg p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {reviewingContribution && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm">
                  Reviewing contribution — edit fields below then click <strong>Approve & Publish</strong> to add to the toolkit.
                </div>
              )}

              {/* Title */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Competitor Product Analysis"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                />
                {formData.title && (
                  <p className="text-xs text-gray-400 mt-1">Slug: /prompts/{generateSlug(formData.title)}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Short description shown on prompt cards (1-2 sentences)"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72] resize-none"
                />
              </div>

              {/* Full Prompt */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Full Prompt *</label>
                  <button
                    type="button"
                    onClick={toggleBold}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-colors"
                    title="Wrap selected text in **bold** (Ctrl+B)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    Bold
                  </button>
                </div>
                <textarea
                  ref={promptTextareaRef}
                  value={formData.full_prompt}
                  onChange={(e) => handleInputChange('full_prompt', e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); toggleBold(); } }}
                  placeholder="The complete prompt text. Use [PLACEHOLDER] syntax for user-editable fields. Use **text** for bold."
                  rows={10}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72] resize-y font-mono text-sm"
                />
              </div>

              {/* Profession */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Profession *</label>
                <select
                  value={formData.profession}
                  onChange={(e) => handleInputChange('profession', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                >
                  <option value="" className="bg-gray-900">Select a profession...</option>
                  {professions.map(p => <option key={p} value={p} className="bg-gray-900">{p}</option>)}
                </select>
              </div>

              {/* AI Tools */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">AI Tools *</label>
                <div className="flex flex-wrap gap-2">
                  {LLM_TOOLS.map(tool => (
                    <button
                      key={tool}
                      onClick={() => toggleLlmTool(tool)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.llm_tools.includes(tool)
                          ? 'bg-[#EF0B72] text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complexity */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Complexity *</label>
                <div className="flex gap-2">
                  {COMPLEXITIES.map(level => (
                    <button
                      key={level}
                      onClick={() => handleInputChange('complexity', level)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.complexity === level
                          ? 'bg-[#EF0B72] text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Usage Count</label>
                  <input
                    type="number"
                    value={formData.usage_count}
                    onChange={(e) => handleInputChange('usage_count', e.target.value)}
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Thumbs Up Count</label>
                  <input
                    type="number"
                    value={formData.rating}
                    onChange={(e) => handleInputChange('rating', e.target.value)}
                    min="0"
                    step="1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                >
                  <option value="published" className="bg-gray-900">Published</option>
                  <option value="draft" className="bg-gray-900">Draft</option>
                </select>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSavePrompt}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Saving...' : reviewingContribution ? 'Approve & Publish' : selectedPrompt ? 'Update Prompt' : 'Create Prompt'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Contributions Tab */
          <div>
            {/* Sub-filters */}
            <div className="flex gap-2 mb-6">
              {['pending', 'approved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setContributionFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    contributionFilter === status
                      ? 'bg-[#EF0B72] text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {status}
                  {status === 'pending' && pendingCount > 0 && (
                    <span className="ml-2 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Contributions list */}
            <div className="grid gap-4">
              {filteredContributions.length === 0 && (
                <div className="bg-white/5 rounded-lg p-8 text-center text-gray-400">
                  No {contributionFilter} contributions
                </div>
              )}
              {filteredContributions.map(contribution => (
                <div key={contribution.id} className="bg-white/5 rounded-lg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{contribution.title}</h3>
                      <p className="text-gray-400 text-sm mt-1">{contribution.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="text-xs bg-white/10 px-2 py-1 rounded">{contribution.profession}</span>
                        {contribution.llm_tools?.map(tool => (
                          <span key={tool} className="text-xs bg-white/10 px-2 py-1 rounded">{tool}</span>
                        ))}
                        <span className={`text-xs px-2 py-1 rounded ${
                          contribution.complexity === 'High' ? 'bg-red-500/20 text-red-400' :
                          contribution.complexity === 'Mid' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {contribution.complexity}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(contribution.created_at)}</span>
                      </div>

                      {/* Show full prompt preview */}
                      <details className="mt-3">
                        <summary className="text-sm text-gray-400 cursor-pointer hover:text-white flex items-center gap-1">
                          <Eye className="w-3 h-3" /> View full prompt
                        </summary>
                        <pre className="mt-2 bg-white/5 p-3 rounded-lg text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                          {contribution.full_prompt}
                        </pre>
                      </details>

                      {contribution.status === 'rejected' && contribution.rejection_reason && (
                        <p className="mt-2 text-sm text-red-400">Rejection reason: {contribution.rejection_reason}</p>
                      )}
                    </div>

                    {contribution.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleReviewContribution(contribution)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg text-sm"
                        >
                          <Check className="w-4 h-4" />
                          Review
                        </button>
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-400 w-36"
                          />
                          <button
                            onClick={() => handleRejectContribution(contribution.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs"
                          >
                            <X className="w-3 h-3" />
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptsManagement;
