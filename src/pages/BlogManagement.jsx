import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, ArrowLeft, Edit, Eye, Upload } from 'lucide-react';

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const BlogManagement = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const contentEditableRef = useRef(null);
  const imageInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    author_name: 'Ignite Team',
    author_role: '',
    author_avatar: '',
    meta_title: '',
    meta_description: '',
    status: 'draft',
    published_at: ''
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'title' && !selectedPost) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
    if (field === 'title' && !formData.meta_title) {
      setFormData(prev => ({ ...prev, meta_title: value.substring(0, 60) }));
    }
    if (field === 'excerpt' && !formData.meta_description) {
      setFormData(prev => ({ ...prev, meta_description: value.substring(0, 160) }));
    }
  };

  const handleSavePost = async () => {
    try {
      setIsSaving(true);
      const content = contentEditableRef.current?.innerHTML || formData.content;

      const postData = {
        ...formData,
        content,
        published_at: formData.status === 'published' && !formData.published_at 
          ? new Date().toISOString() 
          : formData.published_at
      };

      if (selectedPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', selectedPost.id);
        if (error) throw error;
        alert('Post updated!');
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([postData]);
        if (error) throw error;
        alert('Post created!');
      }

      await loadPosts();
      handleNewPost();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPost = (post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image: post.featured_image || '',
      author_name: post.author_name || 'Ignite Team',
      author_role: post.author_role || '',
      author_avatar: post.author_avatar || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      status: post.status || 'draft',
      published_at: post.published_at || ''
    });
  };

  const handleNewPost = () => {
    setSelectedPost(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featured_image: '',
      author_name: 'Ignite Team',
      author_role: '',
      author_avatar: '',
      meta_title: '',
      meta_description: '',
      status: 'draft',
      published_at: ''
    });
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
      if (error) throw error;
      await loadPosts();
      if (selectedPost?.id === postId) handleNewPost();
      alert('Deleted!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) formatText('createLink', url);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `blog_${Date.now()}.${fileExt}`;
      const filePath = `blog/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          throw new Error('Permission denied: Please configure Row-Level Security policies in Supabase for the assets bucket.');
        }
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, featured_image: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploadingImage(false);
      // Reset the input so the same file can be selected again
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/progress')} className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">Blog Management</h1>
          </div>
          <button onClick={handleNewPost} className="flex items-center gap-2 px-4 py-2 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg">
            <Plus className="w-5 h-5" />
            New Post
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Posts List */}
          <div className="col-span-3 bg-white/5 rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">All Posts</h2>
            <div className="space-y-2">
              {posts.map(post => (
                <div
                  key={post.id}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedPost?.id === post.id ? 'bg-[#EF0B72]/20 border border-[#EF0B72]' : 'bg-white/5 hover:bg-white/10'
                  }`}
                  onClick={() => handleSelectPost(post)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm line-clamp-2">{post.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {post.status === 'published' ? '✓ Published' : '📝 Draft'}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} className="p-1 hover:bg-red-500/20 rounded">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="col-span-9 bg-white/5 rounded-lg p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72]"
                placeholder="Enter post title..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">URL Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72]"
                placeholder="url-friendly-slug"
              />
              <p className="text-xs text-gray-400 mt-1">URL: /blog/{formData.slug}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Excerpt (Subtitle) *</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72] h-20"
                placeholder="Short description..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Featured Image</label>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                </button>
                <span className="text-gray-400 text-sm">or</span>
                <input
                  type="text"
                  value={formData.featured_image}
                  onChange={(e) => handleInputChange('featured_image', e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72]"
                  placeholder="Paste image URL..."
                />
                {formData.featured_image && (
                  <img src={formData.featured_image} alt="Preview" className="w-12 h-12 object-cover rounded" />
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Content *</label>
              <div className="bg-white/10 border border-white/20 rounded-t-lg p-2 flex flex-wrap gap-1">
                <button onClick={() => formatText('bold')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded"><strong>B</strong></button>
                <button onClick={() => formatText('italic')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded"><em>I</em></button>
                <button onClick={() => formatText('underline')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded"><u>U</u></button>
                <div className="w-px bg-white/20 mx-1"></div>
                <button onClick={() => formatText('formatBlock', '<h2>')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">H2</button>
                <button onClick={() => formatText('formatBlock', '<h3>')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">H3</button>
                <button onClick={() => formatText('formatBlock', '<p>')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">P</button>
                <div className="w-px bg-white/20 mx-1"></div>
                <button onClick={() => formatText('insertUnorderedList')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">• List</button>
                <button onClick={() => formatText('insertOrderedList')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">1. List</button>
                <div className="w-px bg-white/20 mx-1"></div>
                <button onClick={insertLink} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded">🔗 Link</button>
              </div>

              <div
                ref={contentEditableRef}
                contentEditable
                dangerouslySetInnerHTML={{ __html: formData.content }}
                onBlur={(e) => setFormData(prev => ({ ...prev, content: e.target.innerHTML }))}
                className="w-full min-h-[400px] bg-white/10 border border-white/20 border-t-0 rounded-b-lg px-4 py-3 text-white focus:outline-none prose prose-invert max-w-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Author Name</label>
                <input type="text" value={formData.author_name} onChange={(e) => handleInputChange('author_name', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Author Role</label>
                <input type="text" value={formData.author_role} onChange={(e) => handleInputChange('author_role', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Publish Date</label>
                <input
                  type="datetime-local"
                  value={formData.published_at ? new Date(formData.published_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange('published_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSavePost}
                disabled={isSaving || !formData.title || !formData.slug || !formData.excerpt}
                className="flex items-center gap-2 px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : selectedPost ? 'Update Post' : 'Create Post'}
              </button>
              
              {selectedPost && formData.status === 'published' && (
                <a href={`/blog/${formData.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg">
                  <Eye className="w-5 h-5" />
                  Preview
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogManagement;
