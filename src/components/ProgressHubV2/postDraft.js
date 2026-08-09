/**
 * A community post half-written when the user was sent off to connect Reddit.
 *
 * Submitting goes through the Reddit API, which needs an authenticated account. Connecting is a
 * full-page redirect, so anything typed into the modal is gone by the time they come back unless
 * it's parked here first. The hub reads this on load and reopens the modal with it.
 */
const DRAFT_KEY = 'community_post_draft';

export const readPostDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Malformed entry — drop it rather than reopening the modal onto nothing every visit.
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
};

export const savePostDraft = (draft) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked or full. Losing the draft is worse than not connecting, but not by enough
    // to stop the flow here.
  }
};

export const clearPostDraft = () => localStorage.removeItem(DRAFT_KEY);
