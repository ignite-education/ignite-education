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
      <div className="flex items-center justify-between" style={{ marginBottom: '5px' }}>
        <h3 className="font-semibold" style={{ fontSize: '1.5rem', letterSpacing: '-0.01em', paddingTop: '10px' }}>Memory</h3>
      </div>
      <p className="text-black mb-3" style={{ fontSize: '1rem', fontWeight: 300 }}>
        We use memory to personalise your experience from bespoke learning explanations to pre-filled AI prompts.<br />
        Your memory is completely private and secure. It is never used for advertising.
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
              className="text-black focus:outline-none resize-none"
              style={{ borderRadius: '0.3rem', height: '250px', width: '100%', overflowY: 'auto', fontWeight: 300, paddingTop: '1rem', paddingBottom: '1rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', backgroundColor: '#F6F6F6' }}
              placeholder=""
            />
          </div>

          {/* Import & Delete buttons */}
          <div className="flex flex-col justify-between" style={{ minWidth: '180px', height: '250px' }}>
            <div className="flex flex-col gap-2">
              {[
                { name: 'Claude', logo: 'https://auth.ignite.education/storage/v1/object/public/assets/Claude_AI_symbol.svg.png', url: 'https://claude.ai/new?q=I%27m%20importing%20my%20learning%20profile%20into%20Ignite%20(ignite.education)%2C%20a%20free%20learning%20platform%20for%20tech%20and%20professional%20skills.%20Based%20on%20what%20you%20know%20about%20me%2C%20please%20write%20a%20summary%20(400%E2%80%93800%20characters)%20of%20my%20work%20experience%2C%20education%2C%20and%20learning%20interests.%20Format%20it%20as%20a%20single%20plain-text%20paragraph%20with%20no%20headers%2C%20bullet%20points%2C%20or%20markdown.%20Write%20this%20in%20third%20person%20language.%20If%20you%20don%27t%20have%20enough%20information%20about%20me%2C%20say%20%22Not%20enough%20context%20available%22%20and%20nothing%20else.%0AAt%20the%20end%20of%20your%20response%20add%20%27Copy%20and%20paste%20this%20information%20back%20into%20Ignite%27' },
                { name: 'ChatGPT', logo: 'https://auth.ignite.education/storage/v1/object/public/assets/1024px-ChatGPT-Logo%20(1).png', url: 'https://chatgpt.com/?q=I%27m%20importing%20my%20learning%20profile%20into%20Ignite%20(ignite.education)%2C%20a%20free%20learning%20platform%20for%20tech%20and%20professional%20skills.%20Based%20on%20what%20you%20know%20about%20me%2C%20please%20write%20a%20summary%20(400%E2%80%93800%20characters)%20of%20my%20work%20experience%2C%20education%2C%20and%20learning%20interests.%20Format%20it%20as%20a%20single%20plain-text%20paragraph%20with%20no%20headers%2C%20bullet%20points%2C%20or%20markdown.%20Write%20this%20in%20third%20person%20language.%20If%20you%20don%27t%20have%20enough%20information%20about%20me%2C%20say%20%22Not%20enough%20context%20available%22%20and%20nothing%20else.%0AAt%20the%20end%20of%20your%20response%20add%20%27Copy%20and%20paste%20this%20information%20back%20into%20Ignite%27' },
              ].map(({ name, logo, url }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => url ? window.open(url, '_blank') : alert(`Import from ${name} coming soon!`)}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg font-normal transition-all cursor-pointer text-black"
                  style={{
                    backgroundColor: 'white',
                    fontSize: '0.85rem',
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
                className="flex items-center justify-center gap-2 px-2 py-1.5 font-normal transition-all cursor-pointer text-white disabled:opacity-50"
                style={{
                  backgroundColor: '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: 400,
                  borderRadius: '0.3rem',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
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
