import React, { useState } from 'react';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { getRedditComments } from '../../../lib/api';
import { isRedditAuthenticated, initiateRedditAuth, voteOnReddit, commentOnReddit, getRedditUsername } from '../../../lib/reddit';

const getTimeAgo = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hr. ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  return `${diffInDays} days ago`;
};

const CommunityForumCard = ({ courseName, courseReddit, posts = [], onCreatePost }) => {
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [localUpvotes, setLocalUpvotes] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [localCommentCounts, setLocalCommentCounts] = useState({});

  const requireRedditAuth = (action) => {
    if (isRedditAuthenticated()) return true;
    const confirmed = window.confirm(
      `To ${action} Reddit posts, you need to connect your Reddit account. Would you like to connect now?`
    );
    if (confirmed) {
      localStorage.setItem('reddit_return_path', '/progress-v2');
      initiateRedditAuth();
    }
    return false;
  };

  const handleLikePost = async (e, post) => {
    e.stopPropagation();
    if (!requireRedditAuth('upvote')) return;

    const isLiked = likedPosts.has(post.id);
    const direction = isLiked ? 0 : 1;

    // Optimistic update
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setLocalUpvotes(prev => ({
      ...prev,
      [post.id]: (prev[post.id] ?? post.upvotes) + (isLiked ? -1 : 1),
    }));

    try {
      await voteOnReddit(`t3_${post.redditId}`, direction);
    } catch {
      // Revert on error
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      setLocalUpvotes(prev => ({
        ...prev,
        [post.id]: (prev[post.id] ?? post.upvotes) + (isLiked ? 1 : -1),
      }));
    }
  };

  const handleSubmitComment = async (e, post) => {
    e.stopPropagation();
    const text = (commentInputs[post.id] || '').trim();
    if (!text) return;
    if (!requireRedditAuth('comment on')) return;

    try {
      const result = await commentOnReddit(`t3_${post.redditId}`, text);
      const username = await getRedditUsername();

      const newComment = {
        id: result.id,
        author: username,
        content: text,
        created_at: new Date().toISOString(),
        upvotes: 1,
      };

      setPostComments(prev => ({
        ...prev,
        [post.id]: [newComment, ...(prev[post.id] || [])],
      }));
      setLocalCommentCounts(prev => ({
        ...prev,
        [post.id]: (prev[post.id] ?? post.comments ?? 0) + 1,
      }));
      setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
    } catch (error) {
      alert(`Failed to comment: ${error.message || 'Please try again.'}`);
    }
  };

  const fetchComments = async (post) => {
    if (postComments[post.id] || loadingComments[post.id]) return;
    if (post.source !== 'reddit') return;

    setLoadingComments(prev => ({ ...prev, [post.id]: true }));
    try {
      const subreddit = (courseReddit?.url || '').replace(/\/$/, '').split('/r/')[1]
        || (courseReddit?.channel || 'r/ProductManagement').replace(/^r\//, '');
      const comments = await getRedditComments(subreddit, post.redditId);
      const transformed = (Array.isArray(comments) ? comments : []).map(c => ({
        id: c.id,
        author: c.author,
        content: c.body,
        created_at: new Date(c.created_utc * 1000).toISOString(),
        upvotes: c.score || 0,
      })).reverse();
      setPostComments(prev => ({ ...prev, [post.id]: transformed }));
    } catch {
      setPostComments(prev => ({ ...prev, [post.id]: [] }));
    } finally {
      setLoadingComments(prev => ({ ...prev, [post.id]: false }));
    }
  };

  const togglePost = (post) => {
    if (expandedPostId === post.id) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(post.id);
      fetchComments(post);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="flex items-center" style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '-1%' }}>Community Forum</h2>
        <button
          onClick={onCreatePost}
          className="bg-white flex items-center justify-center hover:bg-purple-50 flex-shrink-0 group ml-auto"
          style={{ width: '35.9px', height: '35.9px', borderRadius: '0.3rem', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          title="Create a post"
        >
          <svg width="18.7" height="18.7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-pink-500 transition-colors duration-300">
                    <path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l1-3.96 5.42-5.43Z" className="group-hover:-translate-x-[2px] group-hover:translate-y-[2px] transition-transform duration-300" />
                  </svg>
        </button>
      </div>

      {/* Posts list */}
      <div
        className="space-y-2 overflow-y-auto"
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: '0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {posts.length === 0 ? (
          <div className="rounded-lg p-6 text-center" style={{ background: '#171717' }}>
            <p className="text-gray-400 text-sm">No posts yet.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id}>
              <div
                className="rounded-lg cursor-pointer transition-colors"
                style={{ background: '#171717', padding: '1.25rem' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#212121'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#171717'}
                onClick={() => togglePost(post)}
              >
                <div className="flex mb-2" style={{ alignItems: 'flex-start', gap: '1rem' }}>
                  {post.author_icon ? (
                    <img
                      src={post.author_icon}
                      alt={post.author}
                      className="w-7 h-7 flex-shrink-0 object-cover" style={{ borderRadius: '0.25rem' }}
                      onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className={`w-7 h-7 ${post.avatar || 'bg-purple-600'} flex items-center justify-center text-xs font-bold flex-shrink-0 ${post.author_icon ? 'hidden' : ''}`} style={{ borderRadius: '0.25rem' }}>
                    {post.author && post.author.length > 2 ? post.author.charAt(2).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2" style={{ marginTop: '-4px', marginBottom: '0.4rem' }}>
                      <h3 className="text-white flex-1" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '0%', lineHeight: '1.4' }}>{post.title}</h3>
                      <span className="text-xs text-white flex-shrink-0" style={{ marginTop: '2px' }}>{getTimeAgo(post.created_at)}</span>
                    </div>
                    <p className={`text-white mb-2 ${expandedPostId === post.id ? '' : 'line-clamp-6'}`} style={{ fontSize: '0.9rem', fontWeight: 300, letterSpacing: '0%' }}>
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white">
                      <div className="flex items-center gap-1.5">
                        <button
                          className={`hover:text-white transition ${likedPosts.has(post.id) ? 'text-pink-500' : ''}`}
                          onClick={(e) => handleLikePost(e, post)}
                        >
                          <ThumbsUp size={13} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                        </button>
                        <span style={{ fontWeight: 300 }}>{localUpvotes[post.id] ?? post.upvotes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={13} />
                        <span style={{ fontWeight: 300 }}>{localCommentCounts[post.id] ?? post.comments ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              {expandedPostId === post.id && (
                <div className="ml-auto mt-1 overflow-hidden" style={{ width: '90%' }}>
                  <div className="rounded-lg p-3" style={{ background: '#171717' }}>
                    <h4 className="text-xs font-semibold text-white mb-2">
                      Comments
                    </h4>

                    {/* Comment input */}
                    <div className="flex gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(e, post); }}
                        placeholder="Add a comment..."
                        className="flex-1 bg-white text-black text-xs px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500"
                        style={{ borderRadius: '0.3rem' }}
                      />
                      <button
                        onClick={(e) => handleSubmitComment(e, post)}
                        className="px-3 py-1.5 text-white text-xs font-semibold transition"
                        style={{ borderRadius: '0.3rem', backgroundColor: '#EF0B72' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#D10A64'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#EF0B72'}
                      >
                        Post
                      </button>
                    </div>

                    {loadingComments[post.id] && (
                      <p className="text-xs text-white/60 py-2">Loading comments...</p>
                    )}
                    <div
                      className="space-y-2 overflow-y-auto"
                      style={{ maxHeight: '200px', scrollbarWidth: 'thin', scrollbarColor: '#4B5563 transparent' }}
                    >
                      {postComments[post.id] && postComments[post.id].length > 0 ? (
                        postComments[post.id].map(comment => (
                          <div key={comment.id}>
                            <div className="flex items-start gap-2">
                              <p className="text-white/90 break-words flex-1" style={{ fontSize: '0.9rem', fontWeight: 300 }}>{comment.content}</p>
                              <span className="text-xs text-white flex-shrink-0" style={{ marginTop: '2px' }}>{getTimeAgo(comment.created_at)}</span>
                            </div>
                          </div>
                        ))
                      ) : !loadingComments[post.id] ? (
                        <p className="text-xs text-white/50">No comments yet.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default CommunityForumCard;
