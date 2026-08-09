import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { MessageSquare, Ban, ArrowUp } from 'lucide-react';
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

// Posts open on click. Closing is still on hover-out, delayed long enough that merely
// sweeping the cursor off the card (or scrolling past it) doesn't shut an open post.
const HOVER_COLLAPSE_DELAY = 1500;

// Connecting Reddit is a full-page redirect, so it tears this component down. Whatever the user
// was part-way through has to survive in storage or it's dropped silently — which is why a first
// like or comment vanished while every later one worked.
const PENDING_ACTION_KEY = 'reddit_pending_action';
// Long enough for the round trip and a Reddit login, short enough that an abandoned attempt can't
// fire unannounced on some later visit.
const PENDING_ACTION_TTL_MS = 10 * 60 * 1000;
// The body height eases first, then the comments tray unrolls behind it. Both share one easing
// curve — the same one the header buttons use — so the two halves read as a single movement
// rather than two overlapping ones.
const POST_ANIM_MS = 520;
const TRAY_ANIM_MS = 440;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Stroke is matched to the settings cog and notification bell at the top of the page by
// eye-weight, not by number: lucide draws in a 24-unit viewBox, so the stroke scales by
// size/24. The two travel together — 2.3 at 17px lands at ~1.63 CSS px, between the cog
// (1.5 in a 20-box at 23px = 1.73) and the bell (1.8 in a 24-box at 21px = 1.58).
// Changing the size means re-solving the stroke: META_ICON_STROKE = 1.63 * 24 / size.
const META_ICON_SIZE = 17;
const META_ICON_STROKE = 2.3;

// The composer's height is pinned here rather than left to the input's padding, so the send button
// can be an exact square. aspect-ratio can't do it: a row flex item's width resolves from content
// before align-items: stretch settles the height, so there's no definite height to derive it from.
const COMPOSER_SIZE = '2.6rem';

/**
 * Lucide's thumbs-up leaves the cuff as an open region — a bare "M7 10v12" divider plus a
 * stretch of the outer path — so there is no sub-path to hand a fill to. This redraws the
 * same geometry with that region closed into its own path, which can then be filled while
 * the hand stays outlined. The divider is the closing edge of that path, so it isn't
 * repeated. The hand itself is never filled — a like is signalled by colour alone — and the
 * cuff's fill follows currentColor, so it turns pink with everything else rather than
 * stranding a white block inside a pink icon.
 */
const ThumbsUpIcon = ({ size, strokeWidth }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    <path d="M5 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1z" fill="currentColor" />
  </svg>
);

/**
 * Post body that animates between its clamped preview and its full text.
 *
 * The body always renders in full and the preview is a CSS line clamp, so every preview
 * line fills to the column edge. Budgeting the preview by character count instead — as this
 * used to — can't know where lines break, and cut short whenever a paragraph ended mid-line.
 *
 * The two states still differ in height, and the open height isn't knowable up front, so the
 * transition can't be declared as a fixed CSS pair — a hardcoded expanded value overshoots
 * and the easing lands in the wrong place. Both heights are measured off the live element and
 * animated in pixels instead. On close the clamp is re-applied only once the ease has
 * finished, otherwise the box would shrink around text that had already been clipped away.
 */
const PostBody = ({ content, expanded }) => {
  const innerRef = useRef(null);
  const collapsedHeightRef = useRef(null);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const mountedRef = useRef(false);
  const [showFull, setShowFull] = useState(expanded);
  const [height, setHeight] = useState(null); // px mid-animation, null = natural height

  // Remember the clamped height while settled closed — it's the target to animate back to.
  useLayoutEffect(() => {
    if (!showFull && height === null && innerRef.current) {
      collapsedHeightRef.current = innerRef.current.offsetHeight;
    }
  }, [showFull, height, content]);

  // Opening is driven by showFull so the unclamped text is already laid out to measure.
  useLayoutEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const el = innerRef.current;
    if (!el) return;
    clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);

    if (expanded) {
      // The clamp is still applied here, so this is the one moment the closed height
      // can be read accurately — after fonts have settled, unlike on mount.
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
      className="text-white mb-3"
      style={{
        fontSize: '0.9375rem',
        fontWeight: 300,
        lineHeight: 1.55,
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        transition: `height ${POST_ANIM_MS}ms ${EASE}`,
        ...(height === null ? {} : { height: `${height}px` }),
      }}
    >
      {/* Closed: line-clamp-4 supplies both the cut and the ellipsis, at the line edge rather
          than wherever a character budget happened to land. It carries its own
          display: -webkit-box, which is why flow-root is only applied once expanded — there
          for margin containment, so the measured height doesn't miss margins that would
          otherwise collapse out and start the animation off-target. */}
      <div
        ref={innerRef}
        className={showFull ? '' : 'line-clamp-4'}
        style={showFull ? { display: 'flow-root' } : undefined}
      >
        <RedditMarkdown content={content} />
      </div>
    </div>
  );
};

const CommunityForumCard = ({ courseName, courseReddit, posts = [], postsError = null, onCreatePost, onMyPosts, userRole, userId, onBlockPost }) => {
  const isMobile = useIsMobile();
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
  const collapseTimerRef = useRef(null);
  const collapseTargetRef = useRef(null);
  const postElsRef = useRef({});
  const anchorRafRef = useRef(null);
  const commentInputRef = useRef(null);
  const replayedRef = useRef(false);
  const commentsScrollRef = useRef(null);
  const scrollCommentsToEndRef = useRef(false);

  // Open a post and the composer is ready to type into. Skipped on touch, where focusing an input
  // throws up the keyboard and buries the post you just opened. preventScroll because the open
  // animation is already correcting scroll for ~650ms — letting focus scroll too would fight it.
  useEffect(() => {
    if (isMobile || !expandedPostId) return;
    commentInputRef.current?.focus({ preventScroll: true });
  }, [expandedPostId, isMobile]);

  // Carries the view to a just-posted comment. Only fires off the flag set when submitting, so
  // loading a thread doesn't yank it to the bottom.
  useLayoutEffect(() => {
    if (!scrollCommentsToEndRef.current) return;
    scrollCommentsToEndRef.current = false;
    const el = commentsScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [postComments]);

  useEffect(() => {
    return () => {
      clearTimeout(leaveTimerRef.current);
      clearTimeout(animTimerRef.current);
      clearTimeout(expandTimerRef.current);
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
  // The body eases, then the tray follows it — plus a little slack past the end.
  const ANCHOR_MS = POST_ANIM_MS + TRAY_ANIM_MS + 100;

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
      }, TRAY_ANIM_MS);
    }, 2000);
  };

  const handleCommentsMouseEnter = () => {
    clearTimeout(leaveTimerRef.current);
    clearTimeout(animTimerRef.current);
    setClosingPostId(null);
  };

  const requireRedditAuth = (action, pending) => {
    if (isRedditAuthenticated()) return true;
    const confirmed = window.confirm(
      `To ${action} Reddit posts, you need to connect your Reddit account. Would you like to connect now?`
    );
    if (confirmed) {
      localStorage.setItem('reddit_return_path', '/progress');
      if (pending) {
        localStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({ ...pending, at: Date.now() }));
      }
      initiateRedditAuth();
    }
    return false;
  };

  // `e` is optional: the replay below calls these with no event to stop.
  const handleLikePost = async (e, post) => {
    e?.stopPropagation();
    if (!requireRedditAuth('upvote', { type: 'like', postId: post.id })) return;

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

  // `overrideText` lets the replay supply text directly — it can't come through commentInputs,
  // since that state is set in the same tick and the closure would still hold the old value.
  const handleSubmitComment = async (e, post, overrideText) => {
    e?.stopPropagation();
    const text = (overrideText ?? commentInputs[post.id] ?? '').trim();
    if (!text) return;
    if (!requireRedditAuth('comment on', { type: 'comment', postId: post.id, text })) return;

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
        // Appended, not prepended: the user's own comment belongs at the end of the thread they
        // just read, and that's where the scroll below takes them.
        [post.id]: [...(prev[post.id] || []), newComment],
      }));
      setLocalCommentCounts(prev => ({
        ...prev,
        [post.id]: (prev[post.id] ?? post.comments ?? 0) + 1,
      }));
      setCommentInputs(prev => ({ ...prev, [post.id]: '' }));
      // Flagged rather than scrolled here: the list hasn't rendered the new comment yet, so its
      // scrollHeight is still the old one. The layout effect below runs once it has.
      scrollCommentsToEndRef.current = true;
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
    // Held back until the body has finished growing, so the tray unrolls into settled space.
    expandTimerRef.current = setTimeout(() => {
      setCommentsVisibleId(post.id);
    }, POST_ANIM_MS);
  };

  // Finish what connecting Reddit interrupted. Waits on `posts` rather than running at mount,
  // since the list arrives after this component first renders and the target has to be in it.
  // The ref holds it to a single attempt however many times `posts` re-identifies.
  useEffect(() => {
    if (replayedRef.current || !posts.length || !isRedditAuthenticated()) return;
    const raw = localStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return;

    // Cleared before use, so a malformed or stale entry can't be retried on every visit.
    replayedRef.current = true;
    localStorage.removeItem(PENDING_ACTION_KEY);

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      return;
    }
    if (!pending || Date.now() - (pending.at ?? 0) > PENDING_ACTION_TTL_MS) return;

    const post = posts.find(p => p.id === pending.postId);
    if (!post) return;

    if (pending.type === 'like') {
      handleLikePost(null, post);
    } else if (pending.type === 'comment' && pending.text) {
      // Opened as well as submitted, so the comment is visibly there rather than just counted.
      expandPost(post);
      handleSubmitComment(null, post, pending.text);
    }
  }, [posts]); // eslint-disable-line react-hooks/exhaustive-deps

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
    clearTimeout(collapseTimerRef.current);
    collapseTargetRef.current = null;
    if (expandedPostId === post.id) collapsePost(post.id);
    else expandPost(post);
  };

  // Links and controls inside the card own their own clicks — the two buttons stop the event
  // themselves, but body links can't, and opening one shouldn't also toggle the post.
  const handlePostClick = (e, post) => {
    if (e.target.closest('a, button')) return;
    togglePost(post);
  };

  // Opening is on click now, so the only thing left on enter is calling off a pending close.
  const handlePostMouseEnter = (post) => {
    if (isMobile) return;
    if (collapseTargetRef.current !== post.id) return;
    clearTimeout(collapseTimerRef.current);
    collapseTargetRef.current = null;
  };

  const handlePostMouseLeave = (post) => {
    if (isMobile) return;
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
        <h2 className="font-semibold text-white" style={{ fontSize: isMobile ? '1.5rem' : '1.6rem', letterSpacing: '-0.01em' }}>Community Forum</h2>
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
        className="space-y-[0.8rem] overflow-y-auto"
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
          <div className="rounded-lg p-6 text-center" style={{ background: '#212121' }}>
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
              {/* Close-on-leave is bound here rather than on the card below, so moving down
                  into the comments tray (a sibling of the card) isn't read as leaving. */}
              <div
                className="rounded-lg bg-[#212121] cursor-pointer"
                style={{ padding: '1.5rem' }}
                onClick={(e) => handlePostClick(e, post)}
              >
                {/* Avatar + Title row */}
                <div className="flex mb-3" style={{ alignItems: 'flex-start', gap: '1rem' }}>
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
                      {/* Clamped closed so a long title can't crowd out the preview below it.
                          Released on expand, alongside the body's own full text. */}
                      <h3
                        className={`text-white flex-1 ${expandedPostId === post.id ? '' : 'line-clamp-3'}`}
                        style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0', lineHeight: '1.4' }}
                      >
                        {post.title}
                      </h3>
                      <span className="text-white flex-shrink-0" style={{ marginTop: '2px', fontSize: '0.85rem', fontWeight: 300, lineHeight: '1rem' }}>{getTimeAgo(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                {/* Body text - full width */}
                <PostBody content={post.content} expanded={expandedPostId === post.id} />
                {/* Actions row - full width */}
                <div className="flex items-center gap-4 text-white" style={{ fontSize: '0.85rem', fontWeight: 300, lineHeight: '1rem' }}>
                  {/* Liked state is carried on the wrapper, not the button, so the count picks it
                      up too — it's a sibling of the button, so a class there would never reach it. */}
                  <div className={`flex items-center gap-1.5 transition-colors duration-300 ${likedPosts.has(post.id) ? 'text-[#EF0B72]' : ''}`}>
                    {/* Tilts anti-clockwise on hover and eases back. Colour is left alone there:
                        pink means the like landed, so hovering must not preview it. */}
                    <button
                      className="flex origin-bottom-left transition duration-300 hover:-rotate-[9deg]"
                      onClick={(e) => handleLikePost(e, post)}
                    >
                      <ThumbsUpIcon size={META_ICON_SIZE} strokeWidth={META_ICON_STROKE} />
                    </button>
                    <span>{localUpvotes[post.id] ?? post.upvotes}</span>
                  </div>
                  <div className="group/comments flex items-center gap-1.5">
                    {/* A second bubble sits flush behind the first — invisible at rest, since the
                        front one occludes it exactly — and fans out from the shared bottom-left
                        corner on hover, folding back down on mouse-out. The front icon needs its
                        own positioning to stay on top: both are positioned, so paint order falls
                        to DOM order. Its fill matches the card background, so it reads as
                        unfilled while still hiding whatever passes behind it. */}
                    <span className="relative flex">
                      <MessageSquare
                        size={META_ICON_SIZE}
                        strokeWidth={META_ICON_STROKE}
                        aria-hidden="true"
                        className="absolute top-0 left-0 origin-bottom-left fill-white transition duration-300 group-hover/comments:-rotate-[18deg]"
                      />
                      <MessageSquare
                        size={META_ICON_SIZE}
                        strokeWidth={META_ICON_STROKE}
                        className="relative fill-[#212121]"
                      />
                    </span>
                    <span>{localCommentCounts[post.id] ?? post.comments ?? 0}</span>
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
                    transition: `grid-template-rows ${TRAY_ANIM_MS}ms ${EASE}, opacity ${Math.round(TRAY_ANIM_MS * 0.8)}ms ${EASE}`,
                    // Conditional so the gap doesn't linger under a post that's easing shut.
                    marginTop: commentsVisibleId === post.id && closingPostId !== post.id ? '0.6rem' : '0',
                  }}
                  onMouseLeave={() => handleCommentsMouseLeave(post.id)}
                  onMouseEnter={handleCommentsMouseEnter}
                >
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    {loadingComments[post.id] && (
                      <p className="text-xs text-white/60 py-2">Loading comments...</p>
                    )}
                    <div
                      ref={expandedPostId === post.id ? commentsScrollRef : null}
                      className="overflow-y-auto"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                        // Sized to clear four single-line comments (4 × ~57px + 3 × 0.6rem gaps);
                        // the fifth is what starts the scroll.
                        maxHeight: '260px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      {postComments[post.id] && postComments[post.id].length > 0 ? (
                        // Vertical padding is 1.3rem less the body's half-leading: a 15px glyph in
                        // a 23.25px line box leaves ~4px of slack above the first line and below
                        // the last, which reads as extra top/bottom padding. Uneven so it renders even.
                        postComments[post.id].map(comment => (
                          <div key={comment.id} className="rounded-lg" style={{ background: '#212121', padding: '1.05rem 1.3rem' }}>
                            <div className="flex items-start gap-2">
                              <div className="text-white break-words flex-1" style={{ fontSize: '0.9375rem', fontWeight: 300, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                <RedditMarkdown content={comment.content} />
                              </div>
                              <span className="text-white flex-shrink-0" style={{ marginTop: '2px', fontSize: '0.85rem', fontWeight: 300, lineHeight: '1rem' }}>{getTimeAgo(comment.created_at)}</span>
                            </div>
                          </div>
                        ))
                      ) : !loadingComments[post.id] ? (
                        <p className="text-xs text-white/50">No comments yet.</p>
                      ) : null}
                    </div>

                    {/* Sits below the scrolling list rather than inside it, so it stays put
                        however far the comments run — posting never means scrolling first. */}
                    <div className="flex gap-2 my-[0.6rem] items-stretch" style={{ height: COMPOSER_SIZE }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        ref={expandedPostId === post.id ? commentInputRef : null}
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(e, post); }}
                        // Hold the caret for as long as the post is open. Focus moving to another
                        // control is left alone — a Tab, or the send button — so this stays out of
                        // the way of keyboard users; it only reclaims focus that went nowhere,
                        // which is what a click on inert tray content produces. Deferred a frame
                        // because a refocus issued during blur is ignored in some browsers.
                        onBlur={(e) => {
                          if (expandedPostId !== post.id || e.relatedTarget) return;
                          requestAnimationFrame(() => commentInputRef.current?.focus({ preventScroll: true }));
                        }}
                        placeholder="Post your comment"
                        className="flex-1 text-white leading-snug px-4 py-2.5 focus:outline-none caret-[#EF0B72] placeholder-white focus:placeholder-transparent"
                        style={{ borderRadius: '0.3rem', fontSize: '0.9375rem', fontWeight: 300, letterSpacing: '-0.01em', background: '#212121' }}
                      />
                      <button
                        onClick={(e) => handleSubmitComment(e, post)}
                        aria-label="Post comment"
                        title="Post comment"
                        className="flex flex-shrink-0 items-center justify-center text-black transition bg-white hover:bg-purple-50 hover:text-[#EF0B72]"
                        style={{ width: COMPOSER_SIZE, borderRadius: '0.3rem' }}
                      >
                        {/* 2.9 rather than the course card's literal 2.5: stroke scales with size,
                            and that arrow draws 2.5 at 21px in a 24 viewBox (~2.19 CSS px). This
                            one is 18px, so it needs a higher number for the same drawn line. */}
                        <ArrowUp size={18} strokeWidth={2.9} />
                      </button>
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
