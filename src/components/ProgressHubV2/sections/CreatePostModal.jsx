import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { isRedditAuthenticated, initiateRedditAuth, postToReddit, getRedditUsername, SUBREDDIT_FLAIRS } from '../../../lib/reddit';

const CreatePostModal = ({ isOpen, onClose, courseReddit, initialPostData, onPostCreated }) => {
  const [newPost, setNewPost] = useState({ title: '', content: '', flair: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [redditAuthenticated, setRedditAuthenticated] = useState(false);
  const [redditUsername, setRedditUsername] = useState(null);

  // Check Reddit auth status on mount and restore pending post data
  useEffect(() => {
    if (!isOpen) return;

    const checkAuth = async () => {
      if (isRedditAuthenticated()) {
        setRedditAuthenticated(true);
        try {
          const username = await getRedditUsername();
          setRedditUsername(username);
        } catch {
          setRedditAuthenticated(false);
        }
      }
    };
    checkAuth();

    if (initialPostData) {
      setNewPost({
        title: initialPostData.title || '',
        content: initialPostData.content || '',
        flair: initialPostData.flair || '',
      });
    }
  }, [isOpen, initialPostData]);

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setIsClosingModal(false);
      setNewPost({ title: '', content: '', flair: '' });
      onClose();
    }, 200);
  };

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isRedditAuthenticated()) {
        localStorage.setItem('pending_reddit_post', JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          flair: newPost.flair,
        }));
        localStorage.setItem('reopen_post_modal', 'true');
        localStorage.setItem('reddit_return_path', '/progress-v2');
        initiateRedditAuth();
        return;
      }

      const postSubreddit = (courseReddit.postChannel || courseReddit.channel).replace(/^r\//, '');
      const redditResult = await postToReddit(postSubreddit, newPost.title, newPost.content, newPost.flair || null);

      window.open(redditResult.url, '_blank');
      localStorage.setItem('hasPostedToReddit', 'true');

      setNewPost({ title: '', content: '', flair: '' });
      handleCloseModal();
      if (onPostCreated) await onPostCreated();
    } catch (error) {
      alert(`Failed to post: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const subreddit = (courseReddit.postChannel || courseReddit.channel).replace(/^r\//, '');
  const availableFlairs = SUBREDDIT_FLAIRS[subreddit];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center animate-fadeIn"
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
        animation: isClosingModal ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out',
      }}
      onClick={handleCloseModal}
    >
      <div className="relative w-full px-4" style={{ maxWidth: '700px' }}>
        <h2 className="text-xl font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>What's on your mind?</h2>

        <div
          className="bg-white text-black relative"
          style={{
            animation: isClosingModal ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
            borderRadius: '0.3rem',
            padding: '1.5rem',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
          >
            <X size={24} />
          </button>

          <form onSubmit={handleSubmitPost}>
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700" style={{ marginBottom: '0.1rem' }}>Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  style={{ borderRadius: '0.3rem' }}
                  placeholder="Enter your post title"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700" style={{ marginBottom: '0.1rem' }}>Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none"
                  style={{ height: '120px', borderRadius: '0.3rem' }}
                  placeholder="What's on your mind?"
                  disabled={isSubmitting}
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
                    className="w-full bg-gray-100 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    style={{
                      borderRadius: '0.3rem',
                      color: newPost.flair ? 'black' : '#6B7280',
                      paddingRight: '2rem',
                      backgroundPosition: 'right calc(0.5rem + 20px) center',
                    }}
                    disabled={isSubmitting}
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
                <div className="flex items-center gap-3 p-3 bg-gray-100" style={{ borderRadius: '0.3rem' }}>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#FF4500">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
                  <span className="text-black text-sm font-medium flex-1">
                    This will be posted to {courseReddit.postChannel || courseReddit.channel}
                  </span>
                  {redditAuthenticated && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connected as u/{redditUsername}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-gray-300 text-black font-semibold hover:bg-gray-400 transition"
                  style={{ borderRadius: '0.3rem' }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-white font-semibold transition disabled:opacity-50"
                  style={{ borderRadius: '0.3rem', backgroundColor: '#EF0B72' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#D10A64'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#EF0B72'}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
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
