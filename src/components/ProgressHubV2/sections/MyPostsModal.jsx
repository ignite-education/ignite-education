import React, { useState, useEffect } from 'react';
import { X, ThumbsUp, MessageSquare } from 'lucide-react';
import { getUserRedditPosts, getUserRedditComments, getRedditUsername, clearRedditTokens } from '../../../lib/reddit';

const MyPostsModal = ({ isOpen, onClose }) => {
  const [myRedditPosts, setMyRedditPosts] = useState([]);
  const [myRedditComments, setMyRedditComments] = useState([]);
  const [redditUsername, setRedditUsername] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const username = await getRedditUsername();
        if (!cancelled) setRedditUsername(username);

        const [posts, comments] = await Promise.all([
          getUserRedditPosts(25),
          getUserRedditComments(25),
        ]);
        if (!cancelled) {
          setMyRedditPosts(posts || []);
          setMyRedditComments(comments || []);
        }
      } catch {
        if (!cancelled) {
          setMyRedditPosts([]);
          setMyRedditComments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleDisconnect = () => {
    if (confirm('Disconnect your Reddit account? You will need to reconnect to view and post to Reddit.')) {
      clearRedditTokens();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
        animation: isClosing ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out',
      }}
      onClick={handleClose}
    >
      <div className="relative w-full px-4" style={{ maxWidth: '800px' }}>
        <h2 className="font-semibold text-white pl-1" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '0.15rem' }}>
          My Posts
        </h2>

        <div
          className="bg-white text-black relative"
          style={{
            animation: isClosing ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
            borderRadius: '0.3rem',
            padding: '2rem 2rem 1rem 2rem',
            maxHeight: '68vh',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-8 right-8 text-gray-600 hover:text-black z-10"
          >
            <X size={24} />
          </button>

          {loading ? (
            <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
              <div className="text-gray-600">Loading...</div>
            </div>
          ) : (
            <>
              {/* Reddit Account */}
              {redditUsername && (
                <div className="pb-4 border-b border-gray-200" style={{ marginBottom: '0.9rem' }}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Account</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {redditUsername.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">u/{redditUsername}</p>
                        <p className="text-xs text-gray-500">Connected Reddit Account</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="text-xs text-gray-600 hover:text-gray-900 underline transition"
                      style={{ marginRight: '28px', marginTop: '-3px' }}
                    >
                      Change Account
                    </button>
                  </div>
                </div>
              )}

              {/* Posts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Posts</h3>
                {myRedditPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-gray-600 mb-2">No posts found</p>
                    <p className="text-gray-500 text-sm">Start sharing your thoughts with the community!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRedditPosts.map((post) => (
                      <div key={post.id}>
                        <div
                          className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition cursor-pointer"
                          onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(post.author || redditUsername || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-600">{post.author || redditUsername || 'User'}</span>
                                <span className="text-xs text-gray-400">&bull;</span>
                                <span className="text-xs text-gray-600">{new Date(post.created_utc * 1000).toLocaleDateString()}</span>
                              </div>
                              <h3 className="font-bold mb-1 text-sm text-gray-900">{post.title}</h3>
                              <p className="text-xs text-gray-600 mb-2">r/{post.subreddit}</p>
                              {post.selftext && (
                                <p className={`text-sm text-gray-900 mb-2 whitespace-pre-wrap ${expandedPostId === post.id ? '' : 'line-clamp-3'}`}>
                                  {post.selftext}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp size={12} />
                                  <span>{post.score}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare size={12} />
                                  <span>{post.num_comments}</span>
                                </div>
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-gray-900 underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View on Reddit
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Comments</h3>
                {myRedditComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-2">No comments found</p>
                    <p className="text-gray-500 text-sm">Start engaging with the community!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRedditComments.map((comment) => (
                      <div key={comment.id} className="bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(comment.author || redditUsername || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-gray-600">Commented in</span>
                              <span className="text-xs font-semibold text-gray-900">r/{comment.subreddit}</span>
                              <span className="text-xs text-gray-400">&bull;</span>
                              <span className="text-xs text-gray-600">{new Date(comment.created_utc * 1000).toLocaleDateString()}</span>
                            </div>
                            <a
                              href={comment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-700 hover:text-gray-900 font-medium mb-2 block line-clamp-2"
                            >
                              On: &ldquo;{comment.post_title}&rdquo;
                            </a>
                            <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">{comment.body}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <ThumbsUp size={12} />
                                <span>{comment.score}</span>
                              </div>
                              <a
                                href={comment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-gray-900 underline"
                              >
                                View on Reddit
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPostsModal;
