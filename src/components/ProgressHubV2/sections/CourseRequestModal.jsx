import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

const titleCase = (s) => (s || '').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * "Request a course" confirmation, for a search that found nothing.
 *
 * The /welcome original (next-app/src/app/welcome/CourseRequestModal.tsx) opens
 * on a sign-in phase, because a visitor there may be signed out. Nobody reaches
 * /progress signed out, so that whole branch — the Google/LinkedIn buttons, the
 * OAuth popup, the sessionStorage hand-off across a redirect — is dropped and
 * the request is written straight away. What is left is the same modal: the
 * heading with its inline rename, then the thank-you.
 */
const CourseRequestModal = ({ courseName, onClose }) => {
  const { user: authUser, firstName, profilePicture } = useAuth();
  const [closing, setClosing] = useState(false);
  const [submitting, setSubmitting] = useState(true);
  const [editedCourseName, setEditedCourseName] = useState(courseName);
  const [savedCourseName, setSavedCourseName] = useState(courseName);
  const [isEditing, setIsEditing] = useState(false);
  const [inputWidth, setInputWidth] = useState(undefined);
  const editInputRef = useRef(null);
  const measureRef = useRef(null);
  // What is actually in the table, so a rename can find its row to update.
  const submittedNameRef = useRef(courseName);

  // Size the rename input to its text. useLayoutEffect so it never paints wrong.
  useLayoutEffect(() => {
    if (measureRef.current) setInputWidth(measureRef.current.scrollWidth + 4);
  }, [editedCourseName, isEditing]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Write the request on open.
  useEffect(() => {
    if (!authUser?.id) return;
    let cancelled = false;

    (async () => {
      // status is NOT NULL with no default in the schema, and 'requested' is the
      // value for a course that does not exist yet — 'upcoming' means interest in
      // a coming_soon course, which is what enroll.ts writes. The /welcome modal
      // omits status entirely and only console.errors if the insert is rejected.
      const { error } = await supabase
        .from('course_requests')
        .insert({ user_id: authUser.id, course_name: courseName, status: 'requested' });

      // 23505 is the UNIQUE(user_id, course_name) guard — already requested, which
      // from the user's side is the same success.
      if (error && error.code !== '23505') {
        console.error('[CourseRequest] Insert failed:', error.message, error.code);
      }
      if (!cancelled) setSubmitting(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  const handleEditSave = useCallback(async () => {
    const newName = editedCourseName.trim() || courseName;
    setEditedCourseName(newName);
    setSavedCourseName(newName);
    setIsEditing(false);

    if (!authUser?.id || newName === submittedNameRef.current) return;
    const { error } = await supabase
      .from('course_requests')
      .update({ course_name: newName })
      .eq('user_id', authUser.id)
      .eq('course_name', submittedNameRef.current);
    if (error) {
      console.error('[CourseRequest] Rename failed:', error.message, error.code);
      return;
    }
    submittedNameRef.current = newName;
  }, [editedCourseName, courseName, authUser?.id]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        className={`relative bg-white flex flex-col ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        style={{
          width: 'fit-content',
          height: '350px',
          minWidth: 'min(575px, 92vw)',
          maxWidth: '92vw',
          padding: '0 clamp(1.25rem, 5vw, 2.75rem)',
          borderRadius: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Top 35% — heading with the inline rename */}
        <div className="flex items-end justify-center" style={{ flex: '0 0 35%' }}>
          <h3 className="text-[1.5rem] md:text-[1.65rem] font-bold text-black text-center leading-tight tracking-[-0.02em]">
            <span className="md:whitespace-nowrap">
              We&rsquo;ve added{' '}
              {/* Hidden twin, measured to size the input to its text */}
              <span
                ref={measureRef}
                className="text-[1.5rem] md:text-[1.65rem] font-bold leading-tight tracking-[-0.02em]"
                style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre' }}
              >
                {titleCase(editedCourseName)}
              </span>
              <span className="relative inline-flex items-baseline" style={{ height: '2.0625rem', verticalAlign: 'baseline' }}>
                {isEditing ? (
                  <>
                    <input
                      ref={editInputRef}
                      type="text"
                      value={titleCase(editedCourseName)}
                      onChange={(e) => setEditedCourseName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); }}
                      className="text-[#EF0B72] text-[1.3rem] md:text-[1.65rem] font-bold leading-tight tracking-[-0.02em] bg-gray-200/40 rounded outline-none text-center"
                      style={{ width: inputWidth ? `calc(${inputWidth}px + 1rem)` : 'auto', padding: 0, margin: 0, border: 'none', verticalAlign: 'baseline' }}
                    />
                    <button
                      onClick={handleEditSave}
                      title="Save"
                      className="text-gray-400 hover:text-[#EF0B72] transition-colors absolute focus:outline-none"
                      style={{ right: '-20px', top: '-6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[#EF0B72]">{titleCase(editedCourseName)}</span>
                    <button
                      onClick={() => { setIsEditing(true); setTimeout(() => editInputRef.current?.focus(), 0); }}
                      title="Edit course name"
                      className="text-gray-400 hover:text-[#EF0B72] transition-colors absolute focus:outline-none"
                      style={{ right: '-20px', top: '-6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                  </>
                )}
              </span>
            </span>
            <br />
            <span className="md:whitespace-nowrap"> to our upcoming course list</span>
          </h3>
        </div>

        {/* Bottom 65% — thank-you */}
        <div className="flex flex-col items-center justify-center" style={{ flex: '0 0 65%', paddingBottom: '10px' }}>
          {submitting ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div className="flex gap-5 animate-fadeIn" style={{ height: '75px' }}>
              {profilePicture && (
                <img
                  src={profilePicture}
                  alt=""
                  className="object-cover flex-shrink-0"
                  style={{ width: '75px', height: '75px', borderRadius: '6px' }}
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex flex-col justify-between tracking-[-0.02em] leading-tight">
                <p className="text-[#009600] text-[1.35rem] font-semibold tracking-[-0.01em]">Thank you, {firstName}</p>
                <p className="text-black text-[1.05rem] font-normal tracking-[-0.01em]">
                  We&rsquo;ll notify you when<br />
                  <span className="font-semibold">{titleCase(savedCourseName)}</span> is available
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseRequestModal;
