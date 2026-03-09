import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SUBREDDIT_FLAIRS } from '../../../lib/reddit';

const CreatePostModal = ({ isOpen, onClose, courseReddit, courseName, initialPostData, onPostCreated }) => {
  const [newPost, setNewPost] = useState({ title: '', content: '', flair: '' });
  const titleInputRef = useRef(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [invalidFields, setInvalidFields] = useState(new Set());

  // Restore pending post data
  useEffect(() => {
    if (!isOpen) return;

    if (initialPostData) {
      setNewPost({
        title: initialPostData.title || '',
        content: initialPostData.content || '',
        flair: initialPostData.flair || '',
      });
    }
  }, [isOpen, initialPostData]);

  // Auto-focus title input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setIsClosingModal(false);
      setNewPost({ title: '', content: '', flair: '' });
      onClose();
    }, 250);
  };

  const handleSubmitPost = (e) => {
    e.preventDefault();
    if (isPosting) return;
    const missing = new Set();
    if (!newPost.title.trim()) missing.add('title');
    if (!newPost.content.trim()) missing.add('content');
    if (missing.size > 0) {
      setInvalidFields(missing);
      setTimeout(() => setInvalidFields(new Set()), 1300);
      return;
    }

    setIsPosting(true);

    const postSubreddit = (courseReddit.postChannel || courseReddit.channel).replace(/^r\//, '');
    const params = new URLSearchParams({
      type: 'self',
      title: newPost.title,
      text: newPost.content,
    });
    if (newPost.flair) params.set('flair_name', newPost.flair);

    setTimeout(() => {
      window.open(`https://www.reddit.com/r/${postSubreddit}/submit?${params.toString()}`, '_blank');
      localStorage.setItem('hasPostedToReddit', 'true');

      setIsPosting(false);
      setNewPost({ title: '', content: '', flair: '' });
      handleCloseModal();
      if (onPostCreated) onPostCreated();
    }, 1500);
  };

  if (!isOpen) return null;

  const subreddit = (courseReddit.postChannel || courseReddit.channel).replace(/^r\//, '');
  const availableFlairs = SUBREDDIT_FLAIRS[subreddit];

  const errorOutline = (field) => ({
    outline: '0.5px solid',
    outlineColor: invalidFields.has(field) ? '#EF0B72' : 'transparent',
    transition: 'outline-color 0.6s ease',
  });
  const clearError = (field) => { if (invalidFields.has(field)) setInvalidFields(prev => { const next = new Set(prev); next.delete(field); return next; }); };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${isClosingModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
        padding: '2rem',
      }}
      onClick={handleCloseModal}
    >
      <div className="relative" style={{ width: '55vw' }}>
        <div
          className={`bg-white text-black relative ${isClosingModal ? 'animate-fadeOut' : 'animate-fadeIn'}`}
          style={{
            borderRadius: '0.3rem',
            padding: '2rem 2.25rem 1.5rem 2.25rem',
            height: '60vh',
            overflowY: 'auto',
            overscrollBehavior: 'none',
            scrollbarWidth: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
          >
            <X size={24} />
          </button>

          <h2 className="text-[1.6rem] text-black leading-tight tracking-[-0.02em]" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600 }}>What's on your mind?</h2>
          <p className="text-black font-light mt-1 leading-snug mb-4" style={{ fontFamily: 'Geist, sans-serif', fontSize: '1rem', letterSpacing: '-0.01em', paddingBottom: '11px' }}>
            Share your thoughts, best practices or ask a question to the {courseName} community.
          </p>

          <form onSubmit={handleSubmitPost}>
            <div className="space-y-3">
              <div className="flex gap-7" style={{ alignItems: 'flex-start' }}>
                <label className="text-black tracking-[-0.01em] flex-shrink-0" style={{ fontFamily: 'Geist, sans-serif', fontSize: '1.1rem', fontWeight: 500, width: '70px', paddingTop: 'calc(0.75rem - 16px)' }}>Title</label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={newPost.title}
                  onChange={(e) => { setNewPost({ ...newPost, title: e.target.value }); clearError('title'); }}
                  className="w-full bg-gray-100 text-black px-4 py-3 focus:outline-none focus:ring-0"
                  style={{ borderRadius: '0.3rem', caretWidth: 'thin', fontWeight: 300, ...errorOutline('title') }}
                  placeholder=""
                />
              </div>

              <div className="flex gap-7" style={{ alignItems: 'flex-start' }}>
                <label className="text-black tracking-[-0.01em] flex-shrink-0" style={{ fontFamily: 'Geist, sans-serif', fontSize: '1.1rem', fontWeight: 500, width: '70px', paddingTop: 'calc(0.75rem - 16px)' }}>Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => { setNewPost({ ...newPost, content: e.target.value }); clearError('content'); }}
                  className="w-full bg-gray-100 text-black px-4 py-3 focus:outline-none focus:ring-0 resize-none"
                  style={{ height: '180px', borderRadius: '0.3rem', caretWidth: 'thin', fontWeight: 300, ...errorOutline('content') }}
                  placeholder=""
                />
              </div>

              {availableFlairs && availableFlairs.length > 0 && (
                <div>
                  <label className="block font-semibold text-gray-700" style={{ marginBottom: '0.1rem' }}>
                    Post Flair
                  </label>
                  <select
                    value={newPost.flair}
                    onChange={(e) => setNewPost({ ...newPost, flair: e.target.value })}
                    className="w-full bg-gray-100 px-4 py-2 focus:outline-none focus:ring-0"
                    style={{
                      borderRadius: '0.3rem',
                      color: newPost.flair ? 'black' : '#6B7280',
                      paddingRight: '2rem',
                      backgroundPosition: 'right calc(0.5rem + 20px) center',
                    }}
                    required
                  >
                    <option value="" style={{ color: '#6B7280' }}>
                      Select a flair
                    </option>
                    {availableFlairs.map((flair) => (
                      <option key={flair.value} value={flair.value} style={{ color: 'black' }}>
                        {flair.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3" style={{ marginLeft: 'calc(70px + 1.75rem)' }}>
                  <span className="text-black font-light leading-snug inline-flex items-center gap-2" style={{ fontFamily: 'Geist, sans-serif', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                    This will be posted to {courseReddit.postChannel || courseReddit.channel}
                    <svg className="w-5 h-5 flex-shrink-0 inline" viewBox="0 0 24 24" fill="#FF4500">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="submit"
                  className="px-6 py-2 text-white font-medium transition shadow-none hover:shadow-[0_0_12px_rgba(60,60,60,0.36)]"
                  style={{ borderRadius: '0.3rem', backgroundColor: '#EF0B72', fontFamily: 'Geist, sans-serif', fontSize: '0.9rem', transition: 'box-shadow 0.3s ease' }}
                  disabled={isPosting}
                >
                  {isPosting ? (
                    <span className="inline-flex items-center">
                      {'Posting...'.split('').map((char, i) => (
                        <span
                          key={i}
                          style={{
                            animation: 'letterFadeIn 0.4s ease forwards',
                            animationDelay: `${i * 0.03}s`,
                            opacity: 0,
                          }}
                        >{char}</span>
                      ))}
                    </span>
                  ) : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
