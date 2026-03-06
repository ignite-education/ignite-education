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
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteMemory = async () => {
    if (!text || isDeleting) return;
    if (!confirm('Are you sure you want to delete your memory? This cannot be undone.')) return;
    setIsDeleting(true);
    setError(null);
    try {
      await saveUserMemoryText(userId, '');
      setText('');
      setIsEditing(false);
    } catch (err) {
      console.error('Error deleting memory:', err);
      setError('Failed to delete memory.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold" style={{ fontSize: '1.3rem', letterSpacing: '-0.01em' }}>Memory</h3>
        {!isLoading && !isEditing && text && (
          <button
            type="button"
            onClick={handleEdit}
            className="p-1 text-gray-400 hover:text-purple-600 transition"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-3">
        We use memory to personalise your experience from bespoke learning explanations to pre-filled AI prompts. Your memory is completely private and secure. It is never used for ads or shared.
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
      ) : (
        <div className="flex gap-4">
          <div className="flex-1">
            {text ? (
              <div
                className="text-sm text-gray-700 bg-gray-50 px-3 py-2 cursor-pointer hover:bg-gray-100 transition"
                style={{ borderRadius: '0.3rem', whiteSpace: 'pre-wrap' }}
                onClick={handleEdit}
              >
                {text}
              </div>
            ) : (
              <div
                className="text-sm text-gray-400 bg-gray-50 px-3 py-3 cursor-pointer hover:bg-gray-100 transition"
                style={{ borderRadius: '0.3rem', minHeight: '80px' }}
                onClick={handleEdit}
              >
                Click to add your memory...
              </div>
            )}
          </div>

          {/* Import & Delete buttons */}
          <div className="flex flex-col gap-2" style={{ minWidth: '150px' }}>
            <button
              type="button"
              onClick={() => alert('Import from Claude coming soon!')}
              className="text-xs font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition text-black"
              style={{ borderRadius: '0.3rem' }}
            >
              Import from Claude
            </button>
            <button
              type="button"
              onClick={() => alert('Import from ChatGPT coming soon!')}
              className="text-xs font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition text-black"
              style={{ borderRadius: '0.3rem' }}
            >
              Import from ChatGPT
            </button>
            <button
              type="button"
              onClick={() => alert('Import from Gemini coming soon!')}
              className="text-xs font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 transition text-black"
              style={{ borderRadius: '0.3rem' }}
            >
              Import from Gemini
            </button>
            {text && (
              <button
                type="button"
                onClick={handleDeleteMemory}
                disabled={isDeleting}
                className="text-xs font-medium px-3 py-1.5 text-white hover:opacity-90 transition disabled:opacity-50"
                style={{ borderRadius: '0.3rem', backgroundColor: '#EF6C00' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Memory'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMemorySection;
