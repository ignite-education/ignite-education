import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { MessageSquare, ThumbsUp, Ban } from 'lucide-react';
import { getRedditComments } from '../../../lib/api';
import { isRedditAuthenticated, initiateRedditAuth, voteOnReddit, commentOnReddit, getRedditUsername } from '../../../lib/reddit';
import RedditMarkdown from './RedditMarkdown';
import useIsMobile from '../hooks/useIsMobile';

const getTimeAgo = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
};

const POST_PREVIEW_LIMIT = 300;

// Hover-intent delays: long enough that merely sweeping the cursor across the
// list (or scrolling past it) doesn't open or close anything.
const HOVER_EXPAND_DELAY = 1500;
const HOVER_COLLAPSE_DELAY = 1500;
const POST_ANIM_MS = 300;

// Drop a marker left unpaired by the cut, so it doesn't render as a literal character.
const balanceMarker = (text, marker) => {
  if ((text.split(marker).length - 1) % 2 === 0) return text;
  const last = text.lastIndexOf(marker);
  return text.slice(0, last) + text.slice(last + marker.length);
};

// Cut the markdown source (rather than clipping visually) so the preview can end in a
// real ellipsis. Trims back off any syntax the cut would have left half-open.
const truncateMarkdown = (content, limit = POST_PREVIEW_LIMIT) => {
  if (!content || content.length <= limit) return content;
  let slice = content.slice(0, limit);

  // Never cut inside a [label](url) — drop the partial link entirely.
  const lastLinkOpen = slice.lastIndexOf('[');
  if (lastLinkOpen !== -1 && slice.indexOf(')', lastLinkOpen) === -1) {
    slice = slice.slice(0, lastLinkOpen);
  }

  // Prefer a word boundary, as long as it doesn't shorten the preview too much.
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > limit * 0.6) slice = slice.slice(0, lastSpace);

  slice = balanceMarker(slice, '**');
  slice = balanceMarker(slice, '`');

  return `${slice.replace(/[\s,;:.\-–—]+$/, '')}…`;
};

/**
 * Post body that animates between its truncated preview and its full text.
 *
 * The two states render different content (preview ends in an ellipsis), so the height
 * can't be transitioned with a fixed CSS pair — a hardcoded expanded value overshoots the
 * real height and the easing lands in the wrong place. Instead both heights are measured
 * off the live element and animated in pixels. On close the full text stays mounted for
 * the duration, otherwise the box would shrink around text that had already been swapped out.
 */
const PostBody = ({ content, expanded, previewLimit }) => {
  const innerRef = useRef(null);
  const collapsedHeightRef = useRef(null);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const mountedRef = useRef(false);
  const [showFull, setShowFull] = useState(expanded);
  const [height, setHeight] = useState(null); // px mid-animation, null = natural height

  // Remember the preview height while settled closed — it's the target to animate back to.
  useLayoutEffect(() => {
    if (!showFull && height === null && innerRef.current) {
      collapsedHeightRef.current = innerRef.current.offsetHeight;
    }
  }, [showFull, height, content, previewLimit]);

  // Opening is driven by showFull so the full text is already in the DOM to measure.
  useLayoutEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const el = innerRef.current;
    if (!el) return;
    clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);

    if (expanded) {
      // The preview is still the rendered content here, so this is the one moment the
      // closed height can be read accurately — after fonts have settled, unlike on mount.
      collapsedHeightRef.current = el.offsetHeight;
      setShowFull(true);
      return;
    }
    setHeight(el.offsetHeight); // pin the open height before easing down
    rafRef.current = requestAnimationFrame(() => setHeight(collapsedHeightRef.current ?? 0));
    timerRef.current = setTimeout(() => {
      setShowFull(false);
      setHeight(null);
    }, POST_ANIM_MS);
  }, [expanded]);

  useLayoutEffect(() => {
    if (!showFull) return undefined;
    const el = innerRef.current;
    if (!el) return undefined;
    const target = el.offsetHeight;
    setHeight(collapsedHeightRef.current ?? 0);
    rafRef.current = requestAnimationFrame(() => setHeight(target));
    timerRef.current = setTimeout(() => setHeight(null), POST_ANIM_MS);
    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [showFull]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="text-white mb-2 leading-snug"
      style={{
        fontSize: '0.9rem',
        fontWeight: 300,
        letterSpacing: '0%',
        overflow: 'hidden',
        transition: `height ${POST_ANIM_MS}ms ease-out`,
        ...(height === null ? {} : { height: `${height}px` }),
      }}
    >
      {/* flow-root so descendant margins are contained rather than collapsing out —
          otherwise the measured height misses them and the animation starts off-target. */}
      <div ref={innerRef} style={{ display: 'flow-root' }}>
        <RedditMarkdown content={showFull ? content : truncateMarkdown(content, previewLimit)} />
      </div>
    </div>
  );
};

const CommunityForumCard = ({ courseName, courseReddit, posts = [], postsError = null, onCreatePost, onMyPosts, userRole, userId, onBlockPost }) => {
  const isMobile = useIsMobile();
  // Narrower cards wrap sooner, so shorten the preview to keep the ellipsis inside the collapsed height.
  const previewLimit = isMobile ? 180 : POST_PREVIEW_LIMIT;
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [localUpvotes, setLocalUpvotes] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [localCommentCounts, setLocalCommentCounts] = useState({});
  const [closingPostId, setClosingPostId] = useState(null);
  const [commentsVisibleId, setCommentsVisibleId] = useState(null);
  const postsListRef = useRef(null);
  const leaveTimerRef = useRef(null);
  const animTimerRef = useRef(null);
  const expandTimerRef = useRef(null);
  const hoverIntentRef = useRef(null);
  const collapseTimerRef = useRef(null);
  const collapseTargetRef = useRef(null);
  const postElsRef = useRef({});
  const anchorRafRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(leaveTimerRef.current);
      clearTimeout(animTimerRef.current);
      clearTimeout(expandTimerRef.current);
      clearTimeout(hoverIntentRef.current);
      clearTimeout(collapseTimerRef.current);
      cancelAnimationFrame(anchorRafRef.current);
    };
  }, []);

  const stopAnchoring = () => cancelAnimationFrame(anchorRafRef.current);

  // Chrome and Firefox keep the scroll position steady through layout changes via native
  // scroll anchoring, but Safari has never shipped it. Anchoring is therefore switched off
  // on the list (see overflowAnchor below) and corrected here instead, so every browser
  // behaves the same. Both helpers below run per frame because the heights are animated,
  // and share one rAF slot — whichever starts last wins, which is what we want when a
  // close and an open are triggered together.
  const ANCHOR_MS = POST_ANIM_MS + 350; // body eases for 300ms, the tray for 250ms after it

  const runAnchorLoop = (correct) => {
    let start = null;
    // Timestamped rather than frame-counted so the window is the same on a 120Hz display.
    const step = (now) => {
      if (start === null) start = now;
      correct();
      if (now - start < ANCHOR_MS) anchorRafRef.current = requestAnimationFrame(step);
    };
    anchorRafRef.current = requestAnimationFrame(step);
  };

  /**
   * Opening: pin the post's own top edge so it always grows downward.
   *
   * Without this the post can appear to open upward — either because a post above it is
   * collapsing at the same moment and pulling it up, or because holding the content below
   * in place forces the growth to come out of the top instead.
   */
  const anchorPostTop = (postId) => {
    stopAnchoring();
    const scroller = postsListRef.current;
    const el = postElsRef.current[postId];
    if (!scroller || !el) return;
    const offsetNow = () => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    const target = offsetNow();
    runAnchorLoop(() => {
      const drift = offsetNow() - target;
      if (drift !== 0) scroller.scrollTop += drift;
    });
  };

  /**
   * Closing: hold the reader's place when the post is above the visible area.
   *
   * Keyed off the scroller's own scrollHeight rather than any single element, because a
   * post changes height in two places at once: the body text and the comments tray.
   */
  const anchorContentBelow = (postId) => {
    stopAnchoring();
    const scroller = postsListRef.current;
    const el = postElsRef.current[postId];
    if (!scroller || !el) return;
    // Only correct when the post sits above the visible area. If it's on screen the user is
    // watching it move, and content shifting below is the expected result.
    if (el.getBoundingClientRect().top >= scroller.getBoundingClientRect().top) return;
    let last = scroller.scrollHeight;
    runAnchorLoop(() => {
      const sh = scroller.scrollHeight;
      if (sh !== last) {
        scroller.scrollTop += sh - last;
        last = sh;
      }
    });
  };

  const handleCommentsMouseLeave = (postId) => {
    clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setClosingPostId(postId);
      animTimerRef.current = setTimeout(() => {
        setCommentsVisibleId(null);
        setClosingPostId(null);
      }, 250);
    }, 2000);
  };

  const handleCommentsMouseEnter = () => {
    clearTimeout(leaveTimerRef.current);
    clearTimeout(animTimerRef.current);
    setClosingPostId(null);
  };

  const requireRedditAuth = (action) => {
    if (isRedditAuthenticated()) return true;
    const confirmed = window.confirm(
      `To ${action} Reddit posts, you need to connect your Reddit account. Would you like to connect now?`
    );
    if (confirmed) {
      localStorage.setItem('reddit_return_path', '/progress');
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

  const expandPost = (post) => {
    clearTimeout(leaveTimerRef.current);
    clearTimeout(animTimerRef.current);
    clearTimeout(expandTimerRef.current);
    setClosingPostId(null);
    anchorPostTop(post.id);
    setExpandedPostId(post.id);
    fetchComments(post);
    expandTimerRef.current = setTimeout(() => {
      setCommentsVisibleId(post.id);
    }, 300);
  };

  const collapsePost = (postId) => {
    clearTimeout(leaveTimerRef.current);
    clearTimeout(animTimerRef.current);
    clearTimeout(expandTimerRef.current);
    anchorContentBelow(postId);
    // Guarded so a pending close can't shut a post the cursor has already moved on to.
    setCommentsVisibleId(prev => (prev === postId ? null : prev));
    setExpandedPostId(prev => (prev === postId ? null : prev));
    // Keep the comments tray mounted while the body eases shut, so the two collapse
    // together instead of the tray vanishing on the first frame.
    setClosingPostId(postId);
    animTimerRef.current = setTimeout(() => {
      setClosingPostId(prev => (prev === postId ? null : prev));
    }, POST_ANIM_MS);
  };

  const togglePost = (post) => {
    clearTimeout(hoverIntentRef.current);
    clearTimeout(collapseTimerRef.current);
    collapseTargetRef.current = null;
    if (expandedPostId === post.id) collapsePost(post.id);
    else expandPost(post);
  };

  // Desktop opens/closes on hover intent; touch devices have no hover, so they keep tap-to-toggle.
  const handlePostMouseEnter = (post) => {
    if (isMobile) return;
    // Coming back to a post that's on its way out cancels the close.
    if (collapseTargetRef.current === post.id) {
      clearTimeout(collapseTimerRef.current);
      collapseTargetRef.current = null;
    }
    if (expandedPostId === post.id) return;
    clearTimeout(hoverIntentRef.current);
    hoverIntentRef.current = setTimeout(() => expandPost(post), HOVER_EXPAND_DELAY);
  };

  const handlePostMouseLeave = (post) => {
    if (isMobile) return;
    clearTimeout(hoverIntentRef.current);
    if (expandedPostId !== post.id) return;
    collapseTargetRef.current = post.id;
    collapseTimerRef.current = setTimeout(() => {
      collapseTargetRef.current = null;
      collapsePost(post.id);
    }, HOVER_COLLAPSE_DELAY);
  };

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="flex items-center" style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <h2 className="font-semibold text-white" style={{ fontSize: isMobile ? '1.5rem' : '1.6rem', letterSpacing: '0%' }}>Community Forum</h2>
        {onMyPosts && (
          <button
            onClick={onMyPosts}
            className="bg-white flex items-center justify-center hover:bg-purple-50 flex-shrink-0 group ml-auto"
            style={{ width: '35.9px', height: '35.9px', borderRadius: '0.3rem', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            title="My posts"
          >
            <svg width="18.7" height="18.7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-pink-500 transition-colors duration-300">
              <rect x="7.5" y="3" width="9" height="9" rx="4" />
              <path d="M4 22v-1c0-2.5 1.5-4 4-4h8c2.5 0 4 1.5 4 4v1" />
            </svg>
          </button>
        )}
        <button
          onClick={onCreatePost}
          className={`bg-white flex items-center justify-center hover:bg-purple-50 flex-shrink-0 group ${!onMyPosts ? 'ml-auto' : ''}`}
          style={{ width: '35.9px', height: '35.9px', borderRadius: '0.3rem', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', marginLeft: onMyPosts ? '0.4rem' : undefined }}
          title="Create a post"
        >
          <svg width="18.7" height="18.7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-pink-500 transition-colors duration-300">
                    <path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l1-3.96 5.42-5.43Z" />
                  </svg>
        </button>
      </div>

      {/* Posts list */}
      <div
        ref={postsListRef}
        className="space-y-2 overflow-y-auto"
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: '0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          // PostBody corrects the scroll offset itself; leaving the browser's own
          // anchoring on would apply the same correction twice where it's supported.
          overflowAnchor: 'none',
        }}
      >
        {posts.length === 0 ? (
          <div className="rounded-lg p-6 text-center" style={{ background: '#171717' }}>
            <p className="text-gray-400 text-sm">
              {postsError ? "Couldn't load posts right now." : 'No posts yet.'}
            </p>
          </div>
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              ref={(el) => { postElsRef.current[post.id] = el; }}
              onMouseEnter={() => handlePostMouseEnter(post)}
              onMouseLeave={() => handlePostMouseLeave(post)}
            >
              {/* Hover intent is bound here rather than on the card below, so moving down
                  into the comments tray (a sibling of the card) isn't read as leaving. */}
              {/* An open post keeps the lighter fill even once the cursor has left it —
                  hence a class rather than the imperative hover swap this used to do. */}
              <div
                className={`rounded-lg transition-colors ${
                  expandedPostId === post.id ? 'bg-[#212121]' : 'bg-[#171717] hover:bg-[#212121]'
                } ${isMobile ? 'cursor-pointer' : ''}`}
                style={{ padding: '1.25rem' }}
                onClick={isMobile ? () => togglePost(post) : undefined}
              >
                {/* Avatar + Title row */}
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
                    <div className="flex items-start gap-2" style={{ marginTop: '-4px' }}>
                      <h3 className="text-white flex-1" style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0%', lineHeight: '1.4' }}>{post.title}</h3>
                      <span className="text-xs text-white flex-shrink-0" style={{ marginTop: '2px' }}>{getTimeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                {/* Body text - full width */}
                <PostBody content={post.content} expanded={expandedPostId === post.id} previewLimit={previewLimit} />
                {/* Actions row - full width */}
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
                  {userRole === 'admin' && onBlockPost && (
                    <button
                      className="ml-auto text-white/30 hover:text-red-400 transition"
                      title="Block this post"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Block this post? It will be hidden for all users.')) {
                          onBlockPost(post.redditId);
                        }
                      }}
                    >
                      <Ban size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Comments */}
              {(expandedPostId === post.id || closingPostId === post.id) && (
                <div
                  className="ml-auto"
                  style={{
                    width: '90%',
                    display: 'grid',
                    gridTemplateRows: commentsVisibleId === post.id && closingPostId !== post.id ? '1fr' : '0fr',
                    opacity: commentsVisibleId === post.id && closingPostId !== post.id ? 1 : 0,
                    transition: 'grid-template-rows 0.25s ease-out, opacity 0.2s ease-out',
                    marginTop: commentsVisibleId === post.id && closingPostId !== post.id ? '0.25rem' : '0',
                  }}
                  onMouseLeave={() => handleCommentsMouseLeave(post.id)}
                  onMouseEnter={handleCommentsMouseEnter}
                >
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                  <div className="rounded-lg" style={{ background: '#212121', padding: '1rem 1.3rem' }}>
                    <h4 className="text-white mb-2" style={{ fontSize: '1rem', fontWeight: 500 }}>
                      Comments
                    </h4>

                    {/* Comment input */}
                    <div className="flex gap-2 mb-2 items-stretch" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(e, post); }}
                        placeholder="Post your comment"
                        className="flex-1 bg-black text-white leading-snug px-3 py-1.5 focus:outline-none focus:ring-[0.5px] focus:ring-purple-500 placeholder-white"
                        style={{ borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 300 }}
                      />
                      <button
                        onClick={(e) => handleSubmitComment(e, post)}
                        className="px-3 py-1.5 text-black transition bg-white hover:bg-purple-50"
                        style={{ fontSize: '0.8rem', fontWeight: 500, borderRadius: '0.3rem' }}
                      >
                        Post
                      </button>
                    </div>

                    {loadingComments[post.id] && (
                      <p className="text-xs text-white/60 py-2">Loading comments...</p>
                    )}
                    <div
                      className="overflow-y-auto"
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxHeight: '200px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {postComments[post.id] && postComments[post.id].length > 0 ? (
                        postComments[post.id].map(comment => (
                          <div key={comment.id}>
                            <div className="flex items-start gap-2">
                              <div className="text-white leading-snug break-words flex-1" style={{ fontSize: '0.9rem', fontWeight: 300 }}>
                                <RedditMarkdown content={comment.content} />
                              </div>
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
