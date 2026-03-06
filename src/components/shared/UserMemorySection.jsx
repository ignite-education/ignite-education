import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Brain, Check, X } from 'lucide-react';
import { getUserMemoryText, saveUserMemoryText, importLinkedInMemory } from '../../lib/api';

const MAX_LENGTH = 2000;

const UserMemorySection = ({ userId, linkedinUrl }) => {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);
  const [importError, setImportError] = useState(null);
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
    setImportError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft('');
    setError(null);
  };

  const handleSave = async () => {
    // Nothing to save if empty and no existing text to clear
    if (!draft.trim() && !text) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveUserMemoryText(userId, draft);
      setText(draft.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving user memory:', err);
      setError(err?.message || 'Failed to save memory.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportLinkedIn = async () => {
    if (!linkedinUrl || isImporting) return;
    setIsImporting(true);
    setImportError(null);
    setError(null);

    try {
      const { memoryText } = await importLinkedInMemory(linkedinUrl);

      if (!memoryText) {
        setImportError('No useful data could be extracted from your LinkedIn profile.');
        return;
      }

      const newText = text
        ? `${text}\n\n--- Imported from LinkedIn ---\n${memoryText}`
        : memoryText;

      const finalText = newText.slice(0, MAX_LENGTH);

      await saveUserMemoryText(userId, finalText);
      setText(finalText.trim());
    } catch (err) {
      console.error('LinkedIn import error:', err);
      setImportError(err.message || 'Failed to import from LinkedIn.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-3 mt-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-600" />
          <h3 className="font-semibold">Memory</h3>
        </div>
        <div className="flex items-center gap-1">
          {!isLoading && linkedinUrl && (
            <button
              type="button"
              onClick={handleImportLinkedIn}
              disabled={isImporting || isEditing}
              className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderRadius: '0.2rem', color: '#0077B5' }}
              title="Import professional info from LinkedIn"
            >
              <svg className="w-3.5 h-3.5" fill="#0077B5" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          )}
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
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Tell Ignite about yourself — your job, projects, skills, and interests.
      </p>

      {importError && (
        <p className="text-xs text-amber-600 mb-2">{importError}</p>
      )}

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
