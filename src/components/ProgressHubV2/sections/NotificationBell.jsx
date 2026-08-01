import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import useClickOutside from '../../../hooks/useClickOutside';
import useNotifications from '../hooks/useNotifications';

// Matches .animate-fadeOut in src/index.css
const POPOVER_CLOSE_MS = 250;
// Grace period before a hover-out dismisses the panel
const LEAVE_GRACE_MS = 180;
// Rows shown in the panel. The hook still fetches more, so anything filtered
// out (expired, other course) doesn't leave the list short.
const MAX_VISIBLE = 3;

const PINK = '#EF0B72';
const BORDER = '#F0F0F0';
const HOVER_GREY = '#F6F6F6';
const MUTED = '#9A9A9A';

// Extends the Just now / Nh / Nd ladder in CommunityForumCard — minutes matter
// for a realtime feed, weeks matter for a 90-day retention window.
const getTimeAgo = (timestamp) => {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};

// Where the rim sits, and therefore where the clapper hangs from and where it
// gets clipped. Everything after the opening M in BELL_BODY is relative, so
// that one y value shifts the whole bell. It's 17.2 rather than 18 to free up
// room at the bottom of the 24-unit viewBox for a longer clapper.
const RIM_Y = 17.2;

// Bell body. The two cubics either side of the `h` round the bottom corners
// where the flare meets the rim, instead of meeting it at a hard point.
const BELL_BODY =
  'M18 7.2a6 6 0 0 0-12 0c0 6.4-2.5 8.5-2.8 8.9-.3.4-.1 1.1.5 1.1h16.6c.6 0 .8-.7.5-1.1-.3-.4-2.8-2.5-2.8-8.9Z';

// Clapper: two straight sides into a semicircle, so it reads as a dangle
// hanging below the rim rather than a shallow notch. Starts at 17.5 — tucked
// inside the rim's stroke band (16.3-18.1) and a hair below the swing pivot —
// so rotating it barely moves the top and no gap opens up on hover. Bottom sits
// at 23.0, which with the 1.8 stroke reaches 23.9: the viewBox floor.
const BELL_CLAPPER = 'M9.1 17.5v2.6a2.9 2.9 0 0 0 5.8 0v-2.6';

const BellIcon = ({ color, size = 21, swinging = false, strokeWidth = 1.8 }) => {
  // useId keeps the clipPath unique — BellIcon renders twice (button + empty state)
  const clipId = `bell-rim-${useId().replace(/:/g, '')}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Everything at or below the rim line. The clapper is clipped to this,
            so a hard swing can't show any of its stroke above the bell's bottom
            edge. The cut lands inside the rim's own 1.8-wide stroke (spanning
            RIM_Y ± 0.9) and is the same colour, so it's invisible. */}
        <clipPath id={clipId}>
          <rect x="0" y={RIM_Y} width="24" height={24 - RIM_Y} />
        </clipPath>
      </defs>

      <path
        d={BELL_BODY}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'stroke 0.2s ease' }}
      />

      {/* Clip lives on the wrapper, not the animated path, so it stays fixed
          while the clapper rotates inside it. */}
      <g clipPath={`url(#${clipId})`}>
        <path
          d={BELL_CLAPPER}
          className={`notif-clapper${swinging ? ' notif-clapper--swing' : ''}`}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s ease' }}
        />
      </g>
    </svg>
  );
};

// Pendulum, not a single tilt: the clapper overswings, rebounds past centre a
// few times and settles. Pivots at the rim (12,18) so the body stays put and
// the clapper's tucked-in top doesn't detach. Per-segment ease-in-out is what
// gives it the slow-at-the-extremes, fast-through-centre feel of a real swing.
// The global prefers-reduced-motion block in index.css neutralises it.
const CLAPPER_CSS = `
  .notif-clapper {
    transform-box: view-box;
    transform-origin: 12px ${RIM_Y}px;
  }
  .notif-clapper--swing {
    animation: notifClapperSwing 0.9s ease-in-out;
  }
  @keyframes notifClapperSwing {
    0%   { transform: rotate(0deg); }
    14%  { transform: rotate(42deg); }
    32%  { transform: rotate(-30deg); }
    50%  { transform: rotate(21deg); }
    66%  { transform: rotate(-14deg); }
    80%  { transform: rotate(8deg); }
    92%  { transform: rotate(-4deg); }
    100% { transform: rotate(0deg); }
  }
`;

const NotificationRow = ({ notification, unread, isLast, onOpen }) => {
  const [hovered, setHovered] = useState(false);
  const clickable = Boolean(notification.link_url);

  const handleClick = () => {
    if (!clickable) return;
    onOpen(notification.link_url);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-start"
      style={{
        position: 'relative',
        // Text is indented to 28px; the right stays at 14px so the timestamp
        // still lines up with the header's count.
        padding: '11px 14px 11px 28px',
        borderBottom: isLast ? 'none' : `1px solid #F5F5F5`,
        cursor: clickable ? 'pointer' : 'default',
        backgroundColor: hovered && clickable ? HOVER_GREY : 'transparent',
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* Unread dot sits in the indent rather than in the flex flow, centred in
          the gutter and on the title's first line. */}
      {unread && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '11px',
            top: '17px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: PINK,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#000000',
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
          }}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p
            style={{
              fontSize: '13px',
              fontWeight: 300,
              color: '#000000',
              lineHeight: 1.45,
              marginTop: '2px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {notification.body}
          </p>
        )}
      </div>
      <span style={{ fontSize: '12px', color: MUTED, flexShrink: 0, marginLeft: '10px', marginTop: '1px' }}>
        {getTimeAgo(notification.created_at)}
      </span>
    </div>
  );
};

/**
 * Bell + anchored popover for the Progress Hub icon row.
 *
 * Rendered inside the white intro <section>, which is position: relative with no
 * overflow — that's what lets the popover extend upward out of the icon row.
 * Adding `overflow: hidden` to that section would clip this.
 */
const NotificationBell = ({ userId, courseId }) => {
  const { notifications, unreadCount, markAllSeen, lastSeen } = useNotifications(userId, courseId);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  // The read cutoff as it was when the panel opened. Dots render against this
  // frozen value so they don't vanish from under the cursor mid-read; the new
  // cutoff is only committed on close.
  const [seenAtOpen, setSeenAtOpen] = useState(0);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const closeTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  const iconColor = hovered || open ? PINK : '#000000';
  const visible = notifications.slice(0, MAX_VISIBLE);

  // Deliberately never calls buttonRef.focus(). Programmatic focus makes Chrome
  // match :focus-visible, which painted the pink focus ring over the bell after
  // an Escape dismissal and left it there until the next click. The ring is
  // still shown when the button is genuinely reached by Tab, which is the only
  // case it's meant for.
  // Ignores any argument, so it's safe to pass straight to useClickOutside.
  const handleClose = useCallback(() => {
    if (closing) return;
    clearTimeout(leaveTimerRef.current);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      markAllSeen(); // commit read state only once the panel is gone
    }, POPOVER_CLOSE_MS);
  }, [closing, markAllSeen]);

  // Close on hover-out, with a short grace period so a brief slip off the edge
  // (or a fast diagonal move) doesn't dismiss it. Re-entering cancels.
  const handlePointerLeave = useCallback(() => {
    if (!open || closing) return;
    clearTimeout(leaveTimerRef.current);
    // Wrapped so the timer id isn't passed through as restoreFocus
    leaveTimerRef.current = setTimeout(() => handleClose(), LEAVE_GRACE_MS);
  }, [open, closing, handleClose]);

  const handlePointerEnter = useCallback(() => {
    clearTimeout(leaveTimerRef.current);
  }, []);

  const handleToggle = () => {
    if (open) {
      handleClose();
      return;
    }
    setSeenAtOpen(lastSeen);
    setOpen(true);
  };

  // Always a new tab, relative paths included — the browser resolves those
  // against the current origin. Closing the popover is what commits the read
  // state, via markAllSeen in handleClose.
  const handleOpen = useCallback((url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    handleClose();
  }, [handleClose]);

  useClickOutside(wrapperRef, handleClose, open && !closing);

  useEffect(() => () => {
    clearTimeout(closeTimerRef.current);
    clearTimeout(leaveTimerRef.current);
  }, []);

  return (
    // mouseleave on the wrapper only fires once the cursor leaves BOTH the
    // button and the panel, since the panel is a descendant.
    <div
      ref={wrapperRef}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      style={{ position: 'relative' }}
    >
      <style>{`.notif-panel::-webkit-scrollbar { display: none; }${CLAPPER_CSS}`}</style>

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="intro-icon-btn flex items-center justify-center rounded-[4px]"
        style={{
          width: '29px',
          height: '29px',
          cursor: 'pointer',
          position: 'relative',
          background: 'transparent',
          border: 'none',
          padding: 0,
          appearance: 'none',
        }}
      >
        <BellIcon color={iconColor} swinging={hovered} />

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              // Plain dot, no count. Positioned on the bell's top-right
              // shoulder (the 21px glyph is inset 4px in the 29px button), not
              // in the button's corner. The white ring keeps it legible there.
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: PINK,
              border: '1.5px solid #FFFFFF',
              boxSizing: 'content-box',
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={closing ? 'animate-fadeOut' : 'animate-scaleUp'}
          style={{
            position: 'absolute',
            // Anchored to the BELL's left edge, not the row's — stays correct if
            // the row's left offset or gap ever changes. Centring would push a
            // 340px panel off the left edge of the viewport.
            bottom: 'calc(100% + 12px)',
            left: 0,
            transformOrigin: 'bottom left',
            width: '340px',
            zIndex: 40,
            textAlign: 'left',
            // No overflow here — the caret and hover bridge hang outside this box.
            filter: 'drop-shadow(0 2px 12px rgba(103, 103, 103, 0.35))',
          }}
        >
          {/* Invisible bridge across the 12px gap between the bell and the
              panel. Without it, moving the cursor up from the bell crosses dead
              space, fires mouseleave on the wrapper and dismisses the panel
              before it can be reached. */}
          <span
            aria-hidden="true"
            style={{ position: 'absolute', left: 0, right: 0, bottom: '-12px', height: '12px' }}
          />
          <div
            className="notif-panel"
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              backgroundColor: '#FFFFFF',
              borderRadius: '0.3rem',
              border: `1px solid ${BORDER}`,
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#FFFFFF',
                padding: '12px 14px 10px',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 500, letterSpacing: '-0.01em', color: '#000000' }}>
                Notifications
              </span>
            </div>

            {visible.length === 0 ? (
              <div style={{ padding: '28px 14px', textAlign: 'center' }}>
                <div className="flex justify-center" style={{ marginBottom: '10px' }}>
                  <BellIcon color="#D9D9D9" size={28} strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 300, color: MUTED }}>
                  You&rsquo;re all caught up.
                </p>
              </div>
            ) : (
              visible.map((n, idx) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  unread={new Date(n.created_at).getTime() > seenAtOpen}
                  isLast={idx === visible.length - 1}
                  onOpen={handleOpen}
                />
              ))
            )}
          </div>

          {/* Caret pointing down at the bell. Sibling of the scrolling panel so
              overflow-y doesn't clip it; drop-shadow on the parent covers both. */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: '14px',
              width: '9px',
              height: '9px',
              backgroundColor: '#FFFFFF',
              borderRight: `1px solid ${BORDER}`,
              borderBottom: `1px solid ${BORDER}`,
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
