/**
 * Global loading-overlay store.
 *
 * A single <GlobalLoadingOverlay /> is mounted for the lifetime of the document.
 * Any number of independent "claims" can ask for it to be visible; it stays up
 * while at least one claim is open, and hides — after a minimum display time and
 * a crossfade — once the last one is released.
 *
 * Deliberately framework-free and module-level so that:
 *  - no context provider is needed (no re-render fan-out on every phase change)
 *  - the overlay is already 'visible' at module-eval time, so React's very first
 *    paint is the splash rather than a blank frame
 *  - claims can be opened imperatively from non-React code (e.g. immediately
 *    before a hard window.location navigation)
 *
 * Claims are a Map keyed by id rather than a ref-count: set/delete are idempotent,
 * so a double-release can never strand the overlay visible forever.
 */

export const MIN_VISIBLE_MS = 750; // minimum time the overlay stays opaque
export const FADE_MS = 600;        // single source of truth for the JS timer AND the inline CSS
const HANDOFF_GRACE_MS = 50;       // floor on the hide delay so claim handoffs are atomic

const AUTO_REFRESH_GUARD_KEY = 'loading_auto_refresh_count';
const MAX_AUTO_REFRESHES = 2;
const BOOT_CLAIM_ID = '__boot__';

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// index.css forces `transition-duration: 0.01ms !important` under reduced motion,
// which beats our inline style — so the JS timer has to agree or the overlay would
// linger invisibly (and, without pointer-events: none, block clicks).
const fadeMs = () => (prefersReducedMotion() ? 0 : FADE_MS);

// 'visible' (opaque) | 'fading' (crossfading out) | 'hidden'
let snapshot = { phase: 'visible', message: null };
let shownAt = Date.now();  // last hidden -> visible  (auto-refresh budget)
let opaqueAt = Date.now(); // last * -> visible       (min-display budget)

const claims = new Map(); // id -> { autoRefreshAfter?: number, message: string | null }
claims.set(BOOT_CLAIM_ID, { autoRefreshAfter: undefined, message: null });

const listeners = new Set();
let hideTimer = null;
let fadeTimer = null;
let refreshTimer = null;

const currentMessage = () => {
  let message = null;
  for (const claim of claims.values()) if (claim.message) message = claim.message;
  return message;
};

const commit = (phase) => {
  const message = phase === 'hidden' ? null : currentMessage();
  if (snapshot.phase === phase && snapshot.message === message) return;
  snapshot = { phase, message };
  listeners.forEach((listener) => listener());
};

const clearHideTimers = () => {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
};

const clearRefreshTimer = () => {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
};

// Measures *continuous overlay-visible* time rather than per-mount time, so an
// auth-check -> chunk-load -> data-fetch chain shares one budget instead of
// resetting the countdown at every handoff.
const scheduleAutoRefresh = () => {
  clearRefreshTimer();

  let after = Infinity;
  for (const claim of claims.values()) {
    if (typeof claim.autoRefreshAfter === 'number') after = Math.min(after, claim.autoRefreshAfter);
  }
  if (!Number.isFinite(after)) return;

  refreshTimer = setTimeout(() => {
    refreshTimer = null;

    // Because the timer no longer resets on remount, a genuinely broken backend
    // would now reliably hit it — guard against a reload loop.
    let count = 0;
    try { count = Number(sessionStorage.getItem(AUTO_REFRESH_GUARD_KEY)) || 0; } catch { /* ignore */ }
    if (count >= MAX_AUTO_REFRESHES) {
      console.warn(`[loading] auto-refresh suppressed after ${count} reloads this session`);
      return;
    }
    try { sessionStorage.setItem(AUTO_REFRESH_GUARD_KEY, String(count + 1)); } catch { /* ignore */ }

    console.log('⏱️ Loading timeout — auto-refreshing page');
    window.location.reload();
  }, Math.max(0, after - (Date.now() - shownAt)));
};

const show = () => {
  clearHideTimers();
  if (snapshot.phase === 'hidden') shownAt = Date.now();
  if (snapshot.phase !== 'visible') opaqueAt = Date.now();
  commit('visible');
  scheduleAutoRefresh();
};

const scheduleHide = () => {
  clearHideTimers();
  clearRefreshTimer();
  if (snapshot.phase === 'hidden') return;

  const remaining = Math.max(MIN_VISIBLE_MS - (Date.now() - opaqueAt), HANDOFF_GRACE_MS);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    commit('fading');
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      commit('hidden');
      try { sessionStorage.removeItem(AUTO_REFRESH_GUARD_KEY); } catch { /* ignore */ }
    }, fadeMs());
  }, remaining);
};

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getPhase = () => snapshot.phase;
export const getMessage = () => snapshot.message;

export const openLoadingClaim = (id, options = {}) => {
  const next = {
    autoRefreshAfter: typeof options.autoRefreshAfter === 'number' ? options.autoRefreshAfter : undefined,
    message: options.message ?? null,
  };
  const prev = claims.get(id);
  if (prev && prev.autoRefreshAfter === next.autoRefreshAfter && prev.message === next.message) return;
  claims.set(id, next);
  show();
};

export const closeLoadingClaim = (id) => {
  if (!claims.delete(id)) return; // idempotent: releasing an unknown claim is a no-op
  if (claims.size === 0) {
    scheduleHide();
  } else {
    commit(snapshot.phase); // message may have changed
    scheduleAutoRefresh();
  }
};

/**
 * Released by <App /> once the tree has mounted. Child effects flush first
 * (bottom-up), so any real claim has already taken over by then and the overlay
 * never blinks between boot and the first real loading phase.
 */
export const releaseBootClaim = () => closeLoadingClaim(BOOT_CLAIM_ID);

/**
 * Intentionally never released — keeps the overlay up across a hard document
 * navigation so the user never sees a blank page mid-redirect.
 */
let navigationHolds = 0;
export const holdLoadingForNavigation = () => {
  navigationHolds += 1;
  openLoadingClaim(`__navigation-${navigationHolds}`);
};
