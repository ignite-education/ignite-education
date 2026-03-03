import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Brain, Check, X } from 'lucide-react';
import { getUserMemoryText, saveUserMemoryText } from '../../lib/api';

const MAX_LENGTH = 2000;

const UserMemorySection = ({ userId }) => {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchMemory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getUserMemoryText(userId);
        if (!cancelled) setText(data);
      } catch (err) {
        console.error('Error fetching user memory:', err);
        if (!cancelled) setError('Failed to load memory.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMemory();
    return () => { cancelled = true; };
  }, [userId]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (isEditing) autoResize();
  }, [isEditing, draft, autoResize]);

  const handleEdit = () => {
    setDraft(text);
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft('');
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveUserMemoryText(userId, draft);
      setText(draft.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving user memory:', err);
      setError('Failed to save memory.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-600" />
          <h3 className="font-semibold">Memory</h3>
        </div>
        {!isLoading && !isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="p-1 text-gray-400 hover:text-purple-600 transition"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Tell Ignite about yourself — your job, projects, skills, and interests.
      </p>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Loading...</p>
      ) : isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_LENGTH}
            rows={4}
            className="w-full bg-gray-100 text-black text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            style={{ borderRadius: '0.3rem', minHeight: '100px' }}
            placeholder={"e.g. I'm a Product Manager at a fintech startup with 5 years of experience. Previously worked in consulting.\n\nCurrently learning Python and data science. Building a budgeting app with React Native as a side project.\n\nInterested in AI, machine learning, and product strategy."}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{draft.length}/{MAX_LENGTH}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-40"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : text ? (
        <div
          className="text-sm text-gray-700 bg-gray-50 px-3 py-2 cursor-pointer hover:bg-gray-100 transition"
          style={{ borderRadius: '0.3rem', whiteSpace: 'pre-wrap' }}
          onClick={handleEdit}
        >
          {text}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleEdit}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          + Add memory
        </button>
      )}
    </div>
  );
};

export default UserMemorySection;
