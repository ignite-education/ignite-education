import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, FileEdit } from 'lucide-react';
import { getRedditComments } from '../../../lib/api';

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

const CommunityForumCard = ({ courseName, courseReddit, posts = [] }) => {
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});

  const handleOpenForum = () => {
    window.open(courseReddit?.url || 'https://www.reddit.com/r/ProductManagement/', '_blank', 'noopener,noreferrer');
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
      <div className="flex items-center" style={{ marginBottom: '0.375rem', flexShrink: 0 }}>
        <h2 className="font-semibold text-white" style={{ fontSize: '1.6rem', letterSpacing: '-1%' }}>Community Forum</h2>
        <button
          onClick={handleOpenForum}
          className="bg-white flex items-center justify-center hover:bg-purple-50 flex-shrink-0 group ml-auto"
          style={{ width: '32.6px', height: '32.6px', borderRadius: '0.3rem', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
          title="Create a post"
        >
          <FileEdit size={17} className="text-black group-hover:text-pink-500 transition-colors" />
        </button>
      </div>

      {/* Posts list */}
      <div
        className="space-y-2 overflow-y-auto"
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: '0.625rem',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 transparent',
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
                className="rounded-lg p-4 cursor-pointer transition-colors"
                style={{ background: '#171717' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#212121'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#171717'}
                onClick={() => togglePost(post)}
              >
                <div className="flex items-start gap-2 mb-2">
                  {post.author_icon ? (
                    <img
                      src={post.author_icon}
                      alt={post.author}
                      className="w-7 h-7 rounded-lg flex-shrink-0 object-cover"
                      onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className={`w-7 h-7 ${post.avatar || 'bg-purple-600'} rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${post.author_icon ? 'hidden' : ''}`}>
                    {post.author && post.author.length > 2 ? post.author.charAt(2).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h3 className="font-bold text-sm text-white">{post.title}</h3>
                      <span className="text-xs text-white/70 flex-shrink-0" style={{ marginTop: '2px' }}>{getTimeAgo(post.created_at)}</span>
                    </div>
                    <p className={`text-xs text-white/90 leading-relaxed mb-2 ${expandedPostId === post.id ? '' : 'line-clamp-3'}`}>
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-white/70">
                      <div className="flex items-center gap-1.5">
                        <ThumbsUp size={13} />
                        <span>{post.upvotes}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={13} />
                        <span>{post.comments || 0}</span>
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
                      Comments ({postComments[post.id]?.length || 0})
                    </h4>
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
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-white font-semibold">{comment.author}</span>
                              <span className="text-xs text-white/60">{getTimeAgo(comment.created_at)}</span>
                            </div>
                            <p className="text-xs text-white/90 break-words">{comment.content}</p>
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
