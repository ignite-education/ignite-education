import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Plus, Check, X, Brain } from 'lucide-react';
import { getUserMemory, addMemoryItem, updateMemoryItem, deleteMemoryItem } from '../../lib/api';

const CATEGORIES = [
  { value: 'career', label: 'Career', color: 'bg-purple-100 text-purple-700' },
  { value: 'skills', label: 'Skills', color: 'bg-blue-100 text-blue-700' },
  { value: 'interests', label: 'Interests', color: 'bg-green-100 text-green-700' },
  { value: 'general', label: 'General', color: 'bg-gray-200 text-gray-600' },
];

const MAX_ITEMS = 50;
const MAX_LENGTH = 500;

const CategoryPill = ({ category }) => {
  const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[3];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${cat.color}`}>
      {cat.label}
    </span>
  );
};

const UserMemorySection = ({ userId }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Add state
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const editInputRef = useRef(null);
  const addInputRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchMemory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getUserMemory(userId);
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error('Error fetching user memory:', err);
        if (!cancelled) setError('Failed to load memory items.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMemory();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  useEffect(() => {
    if (isAdding && addInputRef.current) addInputRef.current.focus();
  }, [isAdding]);

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditCategory(item.category);
    setIsAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditCategory('general');
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateMemoryItem(editingId, editContent, editCategory);
      setItems(prev => prev.map(item => item.id === editingId ? updated : item));
      setEditingId(null);
    } catch (err) {
      console.error('Error updating memory item:', err);
      setError('Failed to update item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const previous = items;
    setItems(prev => prev.filter(item => item.id !== id));
    setError(null);
    try {
      await deleteMemoryItem(id);
    } catch (err) {
      console.error('Error deleting memory item:', err);
      setItems(previous);
      setError('Failed to delete item.');
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewContent('');
    setNewCategory('general');
    setEditingId(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewContent('');
    setNewCategory('general');
  };

  const handleSaveAdd = async () => {
    if (!newContent.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await addMemoryItem(userId, newContent, newCategory);
      setItems(prev => [...prev, created]);
      setIsAdding(false);
      setNewContent('');
      setNewCategory('general');
    } catch (err) {
      console.error('Error adding memory item:', err);
      setError('Failed to add item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e, saveHandler, cancelHandler) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveHandler();
    } else if (e.key === 'Escape') {
      cancelHandler();
    }
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center gap-2 mb-1">
        <Brain size={16} className="text-purple-600" />
        <h3 className="font-semibold">Memory</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Things Ignite remembers about you. You can edit or remove any item.
      </p>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Loading...</p>
      ) : (
        <div className="space-y-1.5">
          {items.length === 0 && !isAdding && (
            <p className="text-sm text-gray-400 py-1">No memory items yet.</p>
          )}

          {items.map(item => (
            <div key={item.id}>
              {editingId === item.id ? (
                <div className="p-2 bg-gray-50 space-y-2" style={{ borderRadius: '0.3rem' }}>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleSaveEdit, handleCancelEdit)}
                    maxLength={MAX_LENGTH}
                    className="w-full bg-gray-100 text-black text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    style={{ borderRadius: '0.3rem' }}
                    placeholder="Enter a memory..."
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
                      style={{ borderRadius: '0.3rem' }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 mr-1">{editContent.length}/{MAX_LENGTH}</span>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isSaving || !editContent.trim()}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-gray-50 group hover:bg-gray-100 transition" style={{ borderRadius: '0.3rem' }}>
                  <CategoryPill category={item.category} />
                  <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{item.content}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-gray-400 hover:text-purple-600"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isAdding && (
            <div className="p-2 bg-gray-50 space-y-2" style={{ borderRadius: '0.3rem' }}>
              <input
                ref={addInputRef}
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSaveAdd, handleCancelAdd)}
                maxLength={MAX_LENGTH}
                className="w-full bg-gray-100 text-black text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500"
                style={{ borderRadius: '0.3rem' }}
                placeholder="e.g. Works as a Product Manager at a fintech startup"
              />
              <div className="flex items-center justify-between">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
                  style={{ borderRadius: '0.3rem' }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 mr-1">{newContent.length}/{MAX_LENGTH}</span>
                  <button
                    type="button"
                    onClick={handleSaveAdd}
                    disabled={isSaving || !newContent.trim()}
                    className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !isAdding && items.length < MAX_ITEMS && (
        <button
          type="button"
          onClick={handleStartAdd}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-2 font-medium"
        >
          <Plus size={14} />
          Add memory
        </button>
      )}
    </div>
  );
};

export default UserMemorySection;
