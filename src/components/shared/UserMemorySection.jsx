import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Brain } from 'lucide-react';
import { getUserMemoryText, saveUserMemoryText, importLinkedInMemory } from '../../lib/api';

const MAX_LENGTH = 2000;

const UserMemorySection = forwardRef(({ userId, linkedinUrl }, ref) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [importError, setImportError] = useState(null);
  const lastSavedRef = useRef('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchMemory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getUserMemoryText(userId);
        if (!cancelled) {
          setText(data);
          lastSavedRef.current = data;
        }
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

  const save = async () => {
    if (text === lastSavedRef.current) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveUserMemoryText(userId, text);
      lastSavedRef.current = text;
    } catch (err) {
      console.error('Error saving user memory:', err);
      setError(err?.message || 'Failed to save memory.');
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({ save }), [text, userId]);

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
      lastSavedRef.current = finalText.trim();
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
      lastSavedRef.current = '';
    } catch (err) {
      console.error('Error deleting memory:', err);
      setError('Failed to delete memory.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ fontSize: '1.5rem', letterSpacing: '-0.01em' }}>Memory</h3>
      </div>
      <p className="text-black mb-3" style={{ fontSize: '1rem', fontWeight: 300 }}>
        We use memory to personalise your experience from bespoke learning explanations to pre-filled AI prompts.<br />
        Your memory is completely private and secure. It is never used for ads or shared.
      </p>

      {importError && (
        <p className="text-xs text-amber-600 mb-2">{importError}</p>
      )}

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 py-2">Loading...</p>
      ) : (
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_LENGTH}
              className="bg-gray-50 text-black py-2 focus:outline-none resize-none"
              style={{ borderRadius: '0.3rem', height: '250px', width: '100%', overflowY: 'auto', fontWeight: 300, paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
              placeholder={"e.g. I'm a Product Manager at a fintech startup with 5 years of experience. Previously worked in consulting.\n\nCurrently learning Python and data science. Building a budgeting app with React Native as a side project.\n\nInterested in AI, machine learning, and product strategy."}
            />
          </div>

          {/* Import & Delete buttons */}
          <div className="flex flex-col justify-between" style={{ minWidth: '150px' }}>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Claude', logo: 'https://auth.ignite.education/storage/v1/object/public/assets/Claude_AI_symbol.svg.png' },
                { name: 'ChatGPT', logo: 'https://auth.ignite.education/storage/v1/object/public/assets/1024px-ChatGPT-Logo%20(1).png' },
                { name: 'Gemini', logo: 'https://auth.ignite.education/storage/v1/object/public/assets/Google_Gemini_icon_2025.svg' },
              ].map(({ name, logo }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => alert(`Import from ${name} coming soon!`)}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg font-normal transition-all cursor-pointer text-black"
                  style={{
                    backgroundColor: 'white',
                    fontSize: '1rem',
                    letterSpacing: '-0.02em',
                    boxShadow: '0 0 6px rgba(103,103,103,0.25)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.45)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.25)'}
                >
                  Import from {name}
                  <img src={logo} alt={name} width={16} height={16} />
                </button>
              ))}
            </div>
            {text && (
              <button
                type="button"
                onClick={handleDeleteMemory}
                disabled={isDeleting}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg font-normal transition-all cursor-pointer text-white hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: '#EF6C00',
                  fontSize: '12px',
                  letterSpacing: '-0.02em',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Memory'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default UserMemorySection;
