import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, ArrowLeft, Eye, Upload, Volume2, MoveUp, MoveDown, List } from 'lucide-react';

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
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioStatus, setAudioStatus] = useState(null);
  const imageInputRef = useRef(null);

  // Content blocks state
  const [contentBlocks, setContentBlocks] = useState([
    { id: Date.now(), type: 'paragraph', content: '' }
  ]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    featured_image: '',
    author_name: 'Ignite Team',
    author_role: '',
    author_avatar: '',
    meta_title: '',
    meta_description: '',
    og_image: '',
    status: 'draft',
    published_at: ''
  });
  const [showSeoPanel, setShowSeoPanel] = useState(false);

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

  // Convert HTML content to blocks
  const htmlToBlocks = (html) => {
    if (!html) return [{ id: Date.now(), type: 'paragraph', content: '' }];

    const div = document.createElement('div');
    div.innerHTML = html;
    const blocks = [];

    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        if (tagName === 'h2') {
          blocks.push({ id: Date.now() + blocks.length, type: 'h2', content: node.innerHTML });
        } else if (tagName === 'h3') {
          blocks.push({ id: Date.now() + blocks.length, type: 'h3', content: node.innerHTML });
        } else if (tagName === 'p') {
          blocks.push({ id: Date.now() + blocks.length, type: 'paragraph', content: node.innerHTML });
        } else if (tagName === 'ul') {
          const items = Array.from(node.querySelectorAll('li')).map(li => li.innerHTML);
          blocks.push({ id: Date.now() + blocks.length, type: 'bulletlist', content: { items } });
        } else if (tagName === 'ol') {
          const items = Array.from(node.querySelectorAll('li')).map(li => li.innerHTML);
          blocks.push({ id: Date.now() + blocks.length, type: 'numberedlist', content: { items } });
        } else if (tagName === 'blockquote') {
          blocks.push({ id: Date.now() + blocks.length, type: 'quote', content: node.innerHTML });
        } else {
          // For other elements, treat as paragraph
          if (node.textContent.trim()) {
            blocks.push({ id: Date.now() + blocks.length, type: 'paragraph', content: node.innerHTML });
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        blocks.push({ id: Date.now() + blocks.length, type: 'paragraph', content: node.textContent });
      }
    };

    Array.from(div.childNodes).forEach(processNode);

    return blocks.length > 0 ? blocks : [{ id: Date.now(), type: 'paragraph', content: '' }];
  };

  // Convert blocks to HTML content
  const blocksToHtml = () => {
    return contentBlocks.map(block => {
      switch (block.type) {
        case 'h2':
          return `<h2>${block.content}</h2>`;
        case 'h3':
          return `<h3>${block.content}</h3>`;
        case 'paragraph':
          return `<p>${block.content}</p>`;
        case 'bulletlist':
          return `<ul>${(block.content?.items || []).map(item => `<li>${item}</li>`).join('')}</ul>`;
        case 'numberedlist':
          return `<ol>${(block.content?.items || []).map(item => `<li>${item}</li>`).join('')}</ol>`;
        case 'quote':
          return `<blockquote>${block.content}</blockquote>`;
        default:
          return `<p>${block.content}</p>`;
      }
    }).join('\n');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'title' && !selectedPost) {
        updated.slug = generateSlug(value);
      }

      if (field === 'title') {
        if (!prev.meta_title || prev.meta_title === prev.title.substring(0, 60)) {
          updated.meta_title = value.substring(0, 60);
        }
      }

      if (field === 'excerpt') {
        if (!prev.meta_description || prev.meta_description === prev.excerpt.substring(0, 160)) {
          updated.meta_description = value.substring(0, 160);
        }
      }

      if (field === 'featured_image' && !prev.og_image) {
        updated.og_image = value;
      }

      return updated;
    });
  };

  const handleSavePost = async () => {
    try {
      setIsSaving(true);
      const content = blocksToHtml();

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

  const handleSelectPost = async (post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      featured_image: post.featured_image || '',
      author_name: post.author_name || 'Ignite Team',
      author_role: post.author_role || '',
      author_avatar: post.author_avatar || '',
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      og_image: post.og_image || '',
      status: post.status || 'draft',
      published_at: post.published_at || ''
    });
    // Convert HTML content to blocks
    setContentBlocks(htmlToBlocks(post.content));
    await checkAudioStatus(post.id);
  };

  const checkAudioStatus = async (postId) => {
    if (!postId) {
      setAudioStatus(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('blog_post_audio')
        .select('id, created_at, duration_seconds, content_hash')
        .eq('blog_post_id', postId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking audio status:', error);
      }

      setAudioStatus(data ? { hasAudio: true, ...data } : { hasAudio: false });
    } catch (error) {
      console.error('Error checking audio status:', error);
      setAudioStatus({ hasAudio: false });
    }
  };

  const handleGenerateAudio = async () => {
    if (!selectedPost?.id) {
      alert('Please save the post first before generating audio');
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const response = await fetch('https://ignite-education-api.onrender.com/api/admin/generate-blog-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogPostId: selectedPost.id })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Audio generated successfully! Duration: ${data.blogAudio?.duration_seconds?.toFixed(1) || 'unknown'}s`);
        await checkAudioStatus(selectedPost.id);
      } else {
        alert(`Failed to generate audio: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      alert(`Failed to generate audio: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleNewPost = () => {
    setSelectedPost(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      featured_image: '',
      author_name: 'Ignite Team',
      author_role: '',
      author_avatar: '',
      meta_title: '',
      meta_description: '',
      og_image: '',
      status: 'draft',
      published_at: ''
    });
    setContentBlocks([{ id: Date.now(), type: 'paragraph', content: '' }]);
    setShowSeoPanel(false);
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

  // Block management functions
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'bulletlist' || type === 'numberedlist' ? { items: [''] } : ''
    };
    setContentBlocks([...contentBlocks, newBlock]);
  };

  const addBlockAt = (type, index) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'bulletlist' || type === 'numberedlist' ? { items: [''] } : ''
    };
    const newBlocks = [...contentBlocks];
    newBlocks.splice(index, 0, newBlock);
    setContentBlocks(newBlocks);
  };

  const updateBlock = (id, content) => {
    setContentBlocks(contentBlocks.map(block =>
      block.id === id ? { ...block, content } : block
    ));
  };

  const removeBlock = (id) => {
    if (contentBlocks.length <= 1) return;
    setContentBlocks(contentBlocks.filter(block => block.id !== id));
  };

  const moveBlockUp = (index) => {
    if (index === 0) return;
    const newBlocks = [...contentBlocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    setContentBlocks(newBlocks);
  };

  const moveBlockDown = (index) => {
    if (index === contentBlocks.length - 1) return;
    const newBlocks = [...contentBlocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    setContentBlocks(newBlocks);
  };

  const resizeImage = (file, maxSizeKB = 5000) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxWidth = 1920;
          const maxHeight = 1080;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.9;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (blob.size > maxSizeKB * 1024 && quality > 0.1) {
                  quality -= 0.1;
                  tryCompress();
                } else {
                  resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }
              },
              'image/jpeg',
              quality
            );
          };
          tryCompress();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setIsUploadingImage(true);

      let fileToUpload = file;
      if (file.size > 5 * 1024 * 1024) {
        fileToUpload = await resizeImage(file, 5000);
      }

      const fileExt = fileToUpload.type === 'image/jpeg' ? 'jpg' : file.name.split('.').pop();
      const fileName = `blog_${Date.now()}.${fileExt}`;
      const filePath = `curriculum/${fileName}`;

      const arrayBuffer = await fileToUpload.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, arrayBuffer, {
          contentType: fileToUpload.type,
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

      setFormData(prev => ({ ...prev, featured_image: data.publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Get block type label and color
  const getBlockInfo = (type) => {
    switch (type) {
      case 'h2':
        return { label: 'Heading 2', color: 'bg-purple-600', textClass: 'text-2xl font-bold' };
      case 'h3':
        return { label: 'Heading 3', color: 'bg-blue-600', textClass: 'text-xl font-semibold' };
      case 'paragraph':
        return { label: 'Paragraph', color: 'bg-gray-600', textClass: '' };
      case 'bulletlist':
        return { label: 'Bullet List', color: 'bg-green-600', textClass: '' };
      case 'numberedlist':
        return { label: 'Numbered List', color: 'bg-teal-600', textClass: '' };
      case 'quote':
        return { label: 'Quote', color: 'bg-amber-600', textClass: 'italic' };
      default:
        return { label: 'Text', color: 'bg-gray-600', textClass: '' };
    }
  };

  // Render block editor based on type
  const renderBlockEditor = (block, index) => {
    const { textClass } = getBlockInfo(block.type);

    if (block.type === 'bulletlist' || block.type === 'numberedlist') {
      const items = block.content?.items || [''];
      return (
        <div className="space-y-2">
          {items.map((item, itemIndex) => (
            <div key={itemIndex} className="flex items-center gap-2">
              <span className="text-gray-400 w-6 text-center">
                {block.type === 'bulletlist' ? '•' : `${itemIndex + 1}.`}
              </span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[itemIndex] = e.target.value;
                  updateBlock(block.id, { items: newItems });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const newItems = [...items];
                    newItems.splice(itemIndex + 1, 0, '');
                    updateBlock(block.id, { items: newItems });
                  } else if (e.key === 'Backspace' && item === '' && items.length > 1) {
                    e.preventDefault();
                    const newItems = items.filter((_, i) => i !== itemIndex);
                    updateBlock(block.id, { items: newItems });
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:border-[#EF0B72]"
                placeholder="List item..."
              />
              {items.length > 1 && (
                <button
                  onClick={() => {
                    const newItems = items.filter((_, i) => i !== itemIndex);
                    updateBlock(block.id, { items: newItems });
                  }}
                  className="p-1 hover:bg-red-900/30 text-red-400 rounded"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => updateBlock(block.id, { items: [...items, ''] })}
            className="text-sm text-gray-400 hover:text-white ml-8"
          >
            + Add item
          </button>
        </div>
      );
    }

    return (
      <textarea
        value={block.content}
        onChange={(e) => updateBlock(block.id, e.target.value)}
        onInput={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        placeholder={
          block.type === 'h2' ? 'Section heading...' :
          block.type === 'h3' ? 'Subsection heading...' :
          block.type === 'quote' ? 'Enter quote...' :
          'Enter paragraph text...'
        }
        className={`w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72] resize-none min-h-[60px] ${textClass}`}
        style={{ height: 'auto' }}
      />
    );
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
                  <img
                    src={formData.featured_image}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
            </div>

            {/* Content Blocks Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Content *</label>

              {/* Add Block Buttons */}
              <div className="bg-white/10 border border-white/20 rounded-t-lg p-3 flex flex-wrap gap-2">
                <button onClick={() => addBlock('h2')} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium">
                  + Heading 2
                </button>
                <button onClick={() => addBlock('h3')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
                  + Heading 3
                </button>
                <button onClick={() => addBlock('paragraph')} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-sm font-medium">
                  + Paragraph
                </button>
                <button onClick={() => addBlock('bulletlist')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-medium flex items-center gap-1">
                  <List size={14} /> Bullet List
                </button>
                <button onClick={() => addBlock('numberedlist')} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-sm font-medium">
                  1. Numbered List
                </button>
                <button onClick={() => addBlock('quote')} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-sm font-medium">
                  " Quote
                </button>
              </div>

              {/* Content Blocks */}
              <div className="bg-white/5 border border-white/20 border-t-0 rounded-b-lg p-4 space-y-4">
                {contentBlocks.map((block, index) => {
                  const { label, color } = getBlockInfo(block.type);

                  return (
                    <div key={block.id}>
                      {/* Insert buttons between blocks */}
                      {index > 0 && (
                        <div className="flex justify-center mb-2 -mt-2">
                          <div className="flex gap-1 bg-gray-800 rounded p-1 opacity-0 hover:opacity-100 transition-opacity">
                            <button onClick={() => addBlockAt('h2', index)} className="px-2 py-0.5 text-xs bg-purple-600/50 hover:bg-purple-600 rounded">+H2</button>
                            <button onClick={() => addBlockAt('h3', index)} className="px-2 py-0.5 text-xs bg-blue-600/50 hover:bg-blue-600 rounded">+H3</button>
                            <button onClick={() => addBlockAt('paragraph', index)} className="px-2 py-0.5 text-xs bg-gray-600/50 hover:bg-gray-600 rounded">+P</button>
                            <button onClick={() => addBlockAt('bulletlist', index)} className="px-2 py-0.5 text-xs bg-green-600/50 hover:bg-green-600 rounded">+List</button>
                          </div>
                        </div>
                      )}

                      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        {/* Block header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-white/5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>{label}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveBlockUp(index)}
                              disabled={index === 0}
                              className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                            >
                              <MoveUp size={14} />
                            </button>
                            <button
                              onClick={() => moveBlockDown(index)}
                              disabled={index === contentBlocks.length - 1}
                              className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                            >
                              <MoveDown size={14} />
                            </button>
                            <button
                              onClick={() => removeBlock(block.id)}
                              disabled={contentBlocks.length <= 1}
                              className="p-1 hover:bg-red-900/30 text-red-400 rounded disabled:opacity-30"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Block content */}
                        <div className="p-3">
                          {renderBlockEditor(block, index)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

            {/* SEO Settings Panel */}
            <div className="mb-6 border border-white/20 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSeoPanel(!showSeoPanel)}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 flex items-center justify-between text-left"
              >
                <span className="font-medium">SEO Settings</span>
                <span className={`transform transition-transform ${showSeoPanel ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showSeoPanel && (
                <div className="p-4 space-y-4 bg-white/5">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Meta Title
                      <span className={`ml-2 text-xs ${formData.meta_title.length > 60 ? 'text-red-400' : 'text-gray-400'}`}>
                        ({formData.meta_title.length}/60)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.meta_title}
                      onChange={(e) => handleInputChange('meta_title', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72]"
                      placeholder="SEO title (appears in search results)"
                      maxLength={70}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Meta Description
                      <span className={`ml-2 text-xs ${formData.meta_description.length > 160 ? 'text-red-400' : 'text-gray-400'}`}>
                        ({formData.meta_description.length}/160)
                      </span>
                    </label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => handleInputChange('meta_description', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72] h-20"
                      placeholder="SEO description (appears in search results)"
                      maxLength={170}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Social Share Image (OG Image)</label>
                    <input
                      type="text"
                      value={formData.og_image}
                      onChange={(e) => handleInputChange('og_image', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#EF0B72]"
                      placeholder="Image URL for social media sharing"
                    />
                  </div>

                  <div className="mt-4 p-4 bg-white rounded-lg">
                    <p className="text-xs text-gray-500 mb-2">Google Search Preview:</p>
                    <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                      {formData.meta_title || formData.title || 'Page Title'}
                    </div>
                    <div className="text-green-700 text-sm truncate">
                      ignite.education/blog/{formData.slug || 'post-url'}
                    </div>
                    <div className="text-gray-600 text-sm line-clamp-2">
                      {formData.meta_description || formData.excerpt || 'Page description will appear here...'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 items-center flex-wrap">
              <button
                onClick={handleSavePost}
                disabled={isSaving || !formData.title || !formData.slug || !formData.excerpt}
                className="flex items-center gap-2 px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] rounded-lg disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : selectedPost ? 'Update Post' : 'Create Post'}
              </button>

              {selectedPost && (
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
                >
                  <Volume2 className="w-5 h-5" />
                  {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
                </button>
              )}

              {audioStatus && (
                <span className={`text-xs px-3 py-1 rounded ${
                  audioStatus.hasAudio ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'
                }`}>
                  {audioStatus.hasAudio ? `✅ Audio ready (${audioStatus.duration_seconds?.toFixed(1)}s)` : '❌ No audio'}
                </span>
              )}

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
