import { useCallback, useState } from 'react';

/**
 * Keeps the post a user has just written at the top of their own community list.
 *
 * Reddit's feed can take a while to surface a new submission, and refetching straight after
 * posting usually comes back without it — so the author sees no trace of what they just wrote.
 * This holds their copy locally and pins it for a fixed window.
 *
 * Local to this browser by design: nobody else's list is touched. Anyone else sees the post
 * only once Reddit's own feed carries it.
 */
const STORAGE_KEY = 'community_pinned_post';
const PIN_TTL_MS = 48 * 60 * 60 * 1000;

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.post || Date.now() - (entry.at ?? 0) > PIN_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return entry.post;
  } catch {
    // Malformed entry — drop it rather than letting it fail every read from here on.
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export default function usePinnedPost() {
  // Evaluated once at mount, which is also where an expired entry gets pruned. A session left
  // open past the window keeps its pin until the next load; the staleness is invisible either way.
  const [pinnedPost, setPinnedPost] = useState(read);

  const pinPost = useCallback((post) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ post, at: Date.now() }));
    } catch {
      // Storage blocked or full. The pin still shows for this session, it just won't survive
      // a reload — not worth failing the post over.
    }
    setPinnedPost(post);
  }, []);

  return [pinnedPost, pinPost];
}
