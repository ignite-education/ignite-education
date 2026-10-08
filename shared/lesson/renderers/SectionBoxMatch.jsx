import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { boxMatchPairs, BOX_MATCH_MIN_PAIRS } from '../blockTypes.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Box matching exercise — the lesson's progression gate in the right-hand panel.
 *
 * The names sit down the left as plain text on the panel's grey, each with an
 * empty slot beside it. Every description starts in a pool underneath, and the
 * student drags one up onto the name it belongs to.
 *
 * ONLY A CORRECT DROP STICKS. It locks into the slot and leaves the pool; a wrong
 * one pulses the slot red and the card springs back to where it came from. That
 * is what keeps this simple: a slot is either empty or permanently solved, so
 * there is no provisional arrangement to track, no reordering, and nothing to
 * drag back out again. The exercise is finished when the pool is empty.
 *
 * THE GATE IS THE `onComplete` / `onSolved` CALL, withheld until every pair is
 * placed. `LearningHubV2` holds the solved ids because this component is
 * unmounted whenever the student navigates, and clears them on every screen
 * change so going Back means doing the exercise again.
 *
 * Rows — not columns — are the unit of layout, because "lines up with its name"
 * is only meaningful if the name and its slot share a row. Two independently
 * stacked columns would drift apart the moment a description wrapped to a
 * different number of lines.
 *
 * `/shared` may import React and nothing else, so the drag is hand-rolled on
 * pointer events rather than a DnD library — which is no loss here, since one
 * pointer implementation covers mouse, touch and pen where HTML5 drag events
 * would have needed a separate touch path.
 */

/** Fisher-Yates. `sort(() => Math.random() - 0.5)` — used elsewhere in this repo — is biased. */
const shuffle = (arr) => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Names and descriptions are shuffled independently.
 *
 * Unlike the previous sortable-list version there is no "already solved" start
 * position to design around: every slot begins empty, so any pairing of the two
 * orders is a legitimate puzzle.
 */
const initialOrders = (count) => {
  const indices = Array.from({ length: count }, (_, i) => i);
  return { names: shuffle(indices), pool: shuffle(indices) };
};

const COLOURS = {
  accent: '#EF0B72',       // ignite pink — a card picked up by tap or keyboard
  surface: '#FFFFFF',      // a description card, and a solved slot
  cardShadow: 'rgba(103,103,103,0.3)', // lifts a white card off the grey panel
  slotOutline: '#FFFFFF',  // an empty slot, waiting — white against the grey panel
  correctGlow: 'rgba(34,197,94,0.45)', // the glow behind a solved slot
  wrongLine: '#ef4444',    // a description dropped on the wrong name
  text: '#000000',
};

/** Off-screen but still announced. Inline so it does not depend on Tailwind. */
const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** Slot geometry, in px. The radius is shared with the SVG outline below. */
const SLOT_BORDER = 2.5;
const SLOT_RADIUS = 6;

/** Dash and gap, set independently — which is the whole point of the SVG. */
const DASH_LENGTH = 8;
const DASH_GAP = 6;

/**
 * The empty slot's dashed outline.
 *
 * A CSS `dashed` border derives dash *and* gap from the border width, so a thin
 * line can only have short dashes and tight gaps. An SVG stroke takes both as
 * explicit lengths, which is the only way to have a fine line and open gaps at
 * the same time.
 *
 * This was tried once before and came out jagged, for a reason worth recording:
 * `background-origin` defaults to `padding-box` while `background-clip` defaults
 * to `border-box`, so the image was laid out inside the border and then clipped
 * at the *outer* corner radius. The two rounded corners sat a border-width apart
 * and the mismatch sliced every dash near them. Pinning both to `border-box` in
 * `slotStyle` makes the SVG's corners and the element's coincide exactly.
 *
 * The stroke is centred on the rect's edge with its outer half clipped, so the
 * width is doubled here: 2 x SLOT_BORDER paints as SLOT_BORDER.
 */
const dashedOutline = (colour) => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>` +
    `<rect width='100%' height='100%' rx='${SLOT_RADIUS}' ry='${SLOT_RADIUS}' fill='none' ` +
    `stroke='${colour}' stroke-width='${SLOT_BORDER * 2}' ` +
    `stroke-dasharray='${DASH_LENGTH} ${DASH_GAP}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

/**
 * How long an answered card takes to fly into its slot.
 *
 * The easing is heavily front-loaded — it covers most of the distance early and
 * settles — which is what reads as a snap rather than a glide. No overshoot: the
 * clone animates its width and height as well as its position, and a bouncing
 * box changes size on the way back too, which looks like a wobble.
 */
const SNAP_MS = 260;
const SNAP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Grace period before the clone is swapped for the real slot.
 *
 * `setTimeout` is not frame-aligned, so firing at exactly SNAP_MS can land a
 * frame or two before the transition has painted its last step — the clone
 * disappears still fractionally short of the slot and the content jumps. The
 * clone is sitting on its destination looking identical to the filled slot by
 * then, so the wait costs nothing visible.
 */
const SNAP_SETTLE_MS = 60;

/**
 * How long a miss stays marked — and the length of the pulse that marks it.
 *
 * One value drives both, so the red overlay is unmounted on precisely the frame
 * its fade reaches zero. Split them and the slot either snaps back to white
 * mid-fade or holds an invisible element for the remainder.
 */
const WRONG_PULSE_MS = 1400;


const truncate = (text, max = 40) =>
  `${text.slice(0, max)}${text.length > max ? '…' : ''}`;

/**
 * Break a name before its last word: "Product Manager" over two lines.
 *
 * Applied to every name as soon as *any* of them wraps, so the titles read as
 * one deliberate block instead of one tall name among short ones. The last space
 * rather than the first because the trailing word is the one they tend to share
 * — "… Manager", "… Engineer" — so the break lands in the same place across the
 * row. A single-word name has nothing to break on and is left alone; the
 * centring in `nameStyle` is what carries it.
 */
const breakBeforeLastWord = (text) => {
  const i = text.trimEnd().lastIndexOf(' ');
  return i === -1 ? text : `${text.slice(0, i)}\n${text.slice(i + 1)}`;
};

/**
 * A copy of each name, hidden, always wrapping naturally.
 *
 * The visible name cannot be measured once it has been broken by hand — it would
 * report two lines for ever, and a panel that later grew wide enough to fit the
 * names on one line would never go back. This mirror is never broken, so it
 * always answers the question actually being asked: how many lines would this
 * name take at the width it has right now? Absolute, so it costs no layout.
 */
const NAME_MIRROR = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  visibility: 'hidden',
  pointerEvents: 'none',
  whiteSpace: 'normal',
  overflowWrap: 'break-word',
};

const SectionBoxMatch = ({
  section,
  isActive = false,
  onComplete,
  solved = false,
  onSolved,
  skipAnimation = false,
}) => {
  const pairs = useMemo(() => boxMatchPairs(section?.content), [section?.content]);
  const enough = pairs.length >= BOX_MATCH_MIN_PAIRS;
  const isMobile = useIsMobile(768);

  // Titles across the top, their slots directly beneath, cards in a row under
  // both. Only on the wide grey panel: inline on a phone the same layout would
  // give a four-pair exercise ~80px columns of wrapped sentences, so there it
  // keeps the name-beside-slot rows.
  //
  // Declared up here rather than beside the styles that read it, because the
  // hooks below list it as a dependency — and a dependency array is evaluated
  // during render, so a `const` declared further down is still in its temporal
  // dead zone when the array is built.
  const columns = !isMobile;

  // Ordered once per mount. Recomputing on render would move a card out from
  // under the pointer mid-drag, so this is a lazy initialiser rather than a memo.
  const [orders] = useState(() => initialOrders(pairs.length));
  const names = orders.names;

  // A description only ever lands on its own name, so this is the whole state:
  // the set of pair indices that are done. Seeded solved so a player that
  // remembers a cleared gate can show it cleared.
  const [placed, setPlaced] = useState(
    () => (solved ? new Set(pairs.map((_, i) => i)) : new Set())
  );

  const [drag, setDrag] = useState(null);         // { pairIndex, dx, dy, pointerId, moved }
  const [selected, setSelected] = useState(null); // pairIndex — tap / keyboard
  // { row, id } while a miss is being marked. The id is what makes a second miss
  // on the same row restart the pulse: the row alone is unchanged, so React would
  // keep the overlay mounted and the animation would run on unnoticed.
  const [wrongRow, setWrongRow] = useState(null);
  // A card in flight to the slot it just answered. { pairIndex, from, to, run }
  const [snap, setSnap] = useState(null);
  // True once any one name has wrapped, at which point every name is broken to
  // match it. Measured, not guessed — it depends on the panel's width and on the
  // names an author happened to write.
  const [breakNames, setBreakNames] = useState(false);

  const slotRefs = useRef({});
  const cardRefs = useRef({});
  const nameMirrorRefs = useRef({});
  const gridRef = useRef(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const wrongTimerRef = useRef(null);
  const wrongSeqRef = useRef(0);
  const snapTimerRef = useRef(null);

  const interactive = !skipAnimation && enough;
  // Only ever asked whether any cards are left — the row itself renders all of
  // them, placed ones included, so that nothing shifts as the pool is worked
  // through. See the render below.
  const unplacedCount = useMemo(
    () => orders.pool.filter((i) => !placed.has(i)).length,
    [orders.pool, placed]
  );

  // One value for both bands, so the cards sit on the same rhythm as the slots
  // they are heading for rather than on a tighter one of their own.
  const columnGapPx = isMobile ? 10 : 20;
  const complete = enough && placed.size === pairs.length;

  useEffect(() => () => {
    clearTimeout(wrongTimerRef.current);
    clearTimeout(snapTimerRef.current);
  }, []);

  /**
   * Keep every name on the same number of lines.
   *
   * A layout effect because the alternative is a visible reflow: the names would
   * paint ragged and re-lay themselves out a frame later. It cannot loop —
   * breaking the names changes the grid's height, the observer fires, and the
   * mirrors report the same natural line counts as before, so the state settles
   * on its second pass.
   *
   * Stacked (mobile) the names sit beside their slots one per row, where nothing
   * has to agree with anything, so the whole thing is skipped.
   */
  useLayoutEffect(() => {
    if (!columns) {
      setBreakNames(false);
      return undefined;
    }
    const measure = () => {
      let maxLines = 1;
      for (const el of Object.values(nameMirrorRefs.current)) {
        if (!el) continue;
        const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight);
        if (!lineHeight) continue;
        maxLines = Math.max(maxLines, Math.round(el.offsetHeight / lineHeight));
      }
      setBreakNames(maxLines > 1);
    };
    measure();
    // Re-measured on width, not on `isMobile`: the panel is resized by the
    // browser window and by the player's own layout, neither of which crosses a
    // breakpoint to do it.
    if (!gridRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [columns, pairs]);

  // Completion is reported exactly once. An under-authored block reports
  // immediately and never gates — the alternative is a lesson no student can
  // finish.
  const reportedRef = useRef(false);
  useEffect(() => {
    // `isActive` gates the report the same way every other renderer's does —
    // without it, a render that arrives before the section is the active one
    // would burn the once-only flag while `onComplete` is still undefined.
    if (skipAnimation || reportedRef.current || !isActive) return;
    if (!enough) { reportedRef.current = true; onComplete?.(); return; }
    if (!complete) return;
    reportedRef.current = true;
    onSolved?.(section?.id);
    onComplete?.();
  }, [skipAnimation, isActive, enough, complete, onComplete, onSolved, section?.id]);

  /**
   * Which name's slot is under this point, if any.
   *
   * No exclusion list is needed, unlike the sortable version: the card being
   * dragged always comes from the pool, so it can never be its own drop target.
   */
  const slotRowAt = useCallback((x, y) => {
    for (const key of Object.keys(slotRefs.current)) {
      const el = slotRefs.current[key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return Number(key);
    }
    return null;
  }, []);

  const flashWrong = useCallback((row) => {
    wrongSeqRef.current += 1;
    setWrongRow({ row, id: wrongSeqRef.current });
    clearTimeout(wrongTimerRef.current);
    wrongTimerRef.current = setTimeout(() => setWrongRow(null), WRONG_PULSE_MS);
  }, []);

  /**
   * Fly the answered card from where it was released into its slot.
   *
   * A FLIP: both rects are measured now, while the DOM still shows the card mid
   * drag — React has not re-rendered yet, so `getBoundingClientRect` still
   * includes the drag transform. A fixed-position clone then animates between
   * them while the real card is hidden, and `placed` is only committed on
   * landing, so the pool reflows once at the end rather than out from under the
   * animation.
   *
   * Position *and* size are animated: the pool's cards share the row's width
   * between them, so as the pool empties a card grows wider than the slot it is
   * heading for, and translating alone would land it at the wrong size.
   */
  const beginSnap = useCallback((pairIndex, row) => {
    const cardEl = cardRefs.current[pairIndex];
    const slotEl = slotRefs.current[row];
    const commit = () => {
      setPlaced((prev) => new Set(prev).add(pairIndex));
      setSnap(null);
    };

    // Nothing to measure against — commit without the flourish rather than
    // leaving the card stranded.
    if (!cardEl || !slotEl) return commit();

    const from = cardEl.getBoundingClientRect();
    const to = slotEl.getBoundingClientRect();
    setSnap({ pairIndex, from, to, run: false });

    // One frame at the start position so the transition has somewhere to move
    // from; a single rAF can still land in the same paint as the mount.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSnap((s) => (s ? { ...s, run: true } : s)));
    });

    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(commit, SNAP_MS + SNAP_SETTLE_MS);
  }, []);

  /**
   * Drop `pairIndex` on the name in `row`.
   *
   * A hit snaps into place; a miss only flashes. Nothing is written for a wrong
   * answer, so the card simply returns to the pool when the drag state clears.
   */
  const attemptPlace = useCallback((pairIndex, row) => {
    if (row === null || pairIndex === null || !interactive || snap) return;
    if (placed.has(names[row])) return;
    if (names[row] === pairIndex) {
      setSelected(null);
      beginSnap(pairIndex, row);
    } else {
      flashWrong(row);
    }
  }, [interactive, snap, placed, names, flashWrong, beginSnap]);

  const handlePointerDown = (e, pairIndex) => {
    // Not while a card is mid-flight: its clone is measured against a pool layout
    // that has not reflowed yet, and starting a second one would race that.
    if (!interactive || snap) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragOriginRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ pairIndex, dx: 0, dy: 0, pointerId: e.pointerId, moved: false });
  };

  const handlePointerMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    // A few pixels of slop, so a slightly shaky tap still reads as a tap.
    const moved = drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4;
    // Only the card's own transform moves. Nothing hit-tests here any more, since
    // no slot reacts until the card is released — which also keeps a drag down to
    // one state update per pointer event.
    setDrag((d) => (d ? { ...d, dx, dy, moved } : d));
  };

  const endDrag = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { pairIndex, moved } = drag;
    const row = moved ? slotRowAt(e.clientX, e.clientY) : null;
    setDrag(null);
    if (cancelled) return;

    // Releasing over nothing is not a failed answer, just a put-down — the card
    // slides home on the transform transition either way.
    if (moved) {
      attemptPlace(pairIndex, row);
      return;
    }
    pickUp(pairIndex);
  };

  /**
   * Tap-to-move, shared by pointer taps and the keyboard.
   *
   * Deliberately NOT wired to the card's `onClick`: the card carries the pointer
   * handlers, so a mouse tap already resolves in `endDrag`, and letting the click
   * through as well would toggle the selection straight back off. Keyboard
   * Enter/Space is intercepted on keydown with `preventDefault` for the same
   * reason.
   */
  const pickUp = (pairIndex) => {
    if (!interactive) return;
    setSelected((s) => (s === pairIndex ? null : pairIndex));
  };

  const handleCardKeyDown = (e, pairIndex) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    pickUp(pairIndex);
  };

  if (!enough) return null;

  const nameStyle = () => ({
    display: 'flex',
    position: 'relative', // the hidden line-count mirror is absolute against this
    // Centred, and stretched to the full height of the grid row. A name that
    // cannot be broken to match its neighbours — a single word — then sits in the
    // middle of the space they occupy rather than hanging off the bottom of it.
    alignItems: 'center',
    alignSelf: columns ? 'stretch' : 'center',
    justifyContent: columns ? 'center' : 'flex-start',
    textAlign: columns ? 'center' : 'left',
    gap: 5,
    // No left padding, so the name starts on exactly the same vertical as the
    // heading above it. It sits directly on the panel — the box is what reads as
    // "this one moves", and the names never do.
    // Zero in column mode so the grid's `rowGap` is the single control over the
    // space between a name and its slot, rather than it being split across two.
    padding: columns ? 0 : '6px 12px 6px 0',
    background: 'transparent',
    border: 'none',
    // Under an H3 sub-heading in the white text column (1.125rem), which it
    // otherwise matches in weight and tracking. The step down keeps the block's
    // own "Match the Pairs" heading reading as the level above these.
    fontSize: '1rem',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    // Explicit rather than `normal`, which computes to a font-dependent value and
    // is reported as the string "normal" by some browsers — the line-count
    // measurement below needs a number it can divide by.
    lineHeight: 1.4,
    // Deliberately no hover-target state. Nothing about a name or its slot changes
    // while a card is in the air — the first and only feedback is the answer
    // itself, on release.
    color: COLOURS.text,
  });

  const slotStyle = (isSolvedRow) => ({
    display: 'block',
    position: 'relative', // the wrong-answer overlay is absolute against this
    width: '100%',
    textAlign: 'center',
    // Taller in column mode: a description wraps to several lines in a third of
    // the panel's width, and an empty slot that collapsed to one line would jump
    // as it filled.
    minHeight: columns ? 64 : 32,
    alignSelf: 'stretch',
    padding: '6px 12px',
    borderRadius: SLOT_RADIUS,
    boxSizing: 'border-box',
    // Transparent in both states: the empty slot's dashes are painted by the SVG
    // below, and a landed card is the same white box the student just dragged, so
    // it keeps the shadow treatment rather than gaining a border. Keeping the
    // width reserved either way holds the geometry steady as a card lands.
    border: `${SLOT_BORDER}px solid transparent`,
    // Both pinned to the border box. Left at their defaults the image is laid out
    // inside the border but clipped at the outer radius, and the corner mismatch
    // slices the dashes — see `dashedOutline`.
    backgroundOrigin: 'border-box',
    backgroundClip: 'border-box',
    // The white outline is never swapped for the red one. A miss is marked by
    // fading a red copy over the top instead — a background-image swap cannot be
    // transitioned, so switching it here would make the mark appear and vanish
    // instantly however gently the rest of it moved.
    backgroundImage: isSolvedRow ? 'none' : dashedOutline(COLOURS.slotOutline),
    backgroundColor: isSolvedRow ? COLOURS.surface : 'transparent',
    boxShadow: isSolvedRow ? `0 0 10px ${COLOURS.correctGlow}` : 'none',
    fontSize: '0.87rem',
    lineHeight: 1.5,
    fontWeight: 300,
    letterSpacing: '-0.01em',
    color: COLOURS.text,
    whiteSpace: 'normal',
    // Even out the lines rather than filling the first and orphaning a word on
    // the second. Ignored by browsers without it, which just wrap as before.
    textWrap: 'balance',
    cursor: interactive && !isSolvedRow && selected !== null ? 'pointer' : 'default',
    // Border only. The fill and the glow must appear the instant a card lands,
    // because the clone has *already* animated them to exactly this state — fading
    // them in again meant the clone vanished and the slot spent ~150ms showing
    // text on a half-transparent box, which is the flash.
    transition: 'border-color 0.15s',
  });

  /**
   * The red outline that marks a miss, laid over the white one.
   *
   * Inset by the border width so its own border box coincides with the slot's:
   * `inset: 0` would align it to the *padding* box, and the two outlines would
   * sit a border-width apart. The geometry otherwise repeats the slot's exactly,
   * so the red lands dash-for-dash on the white underneath it.
   */
  const wrongPulseStyle = {
    position: 'absolute',
    top: -SLOT_BORDER,
    right: -SLOT_BORDER,
    bottom: -SLOT_BORDER,
    left: -SLOT_BORDER,
    borderRadius: SLOT_RADIUS,
    border: `${SLOT_BORDER}px solid transparent`,
    boxSizing: 'border-box',
    backgroundOrigin: 'border-box',
    backgroundClip: 'border-box',
    backgroundImage: dashedOutline(COLOURS.wrongLine),
    animation: `matchPulse ${WRONG_PULSE_MS}ms ease-in-out`,
    pointerEvents: 'none',
  };

  const cardStyle = (pairIndex) => {
    const isDragging = drag?.pairIndex === pairIndex && drag.moved;
    const isSelected = selected === pairIndex;
    return {
      display: 'block',
      // Exactly one slot's width — the row divided by the *original* pair count,
      // not by how many cards are left. Fixed rather than `1 1 auto` so the
      // survivors keep their size as the pool empties instead of stretching to
      // fill the gap each placed card leaves behind.
      flex: columns
        ? `0 0 calc((100% - ${(pairs.length - 1) * columnGapPx}px) / ${pairs.length})`
        : '0 0 auto',
      minWidth: 0,
      width: columns ? 'auto' : '100%',
      textAlign: 'center',
      padding: '6px 12px',
      borderRadius: 6,
      // Transparent rather than absent, so picking a card up does not shift its
      // text by a pixel as the accent border appears.
      border: `1px solid ${isSelected ? COLOURS.accent : 'transparent'}`,
      boxSizing: 'border-box',
      background: COLOURS.surface,
      fontSize: '0.87rem',
      lineHeight: 1.5,
      fontWeight: 300,
      letterSpacing: '-0.01em',
      color: COLOURS.text,
      whiteSpace: 'normal',
      // Same balanced wrap as the slot, so a card's shape does not change when it
      // lands in one.
      textWrap: 'balance',
      cursor: !interactive ? 'default' : (isDragging ? 'grabbing' : 'grab'),
      touchAction: 'none',
      userSelect: 'none',
      transform: isDragging ? `translate(${drag.dx}px, ${drag.dy}px)` : 'translate(0, 0)',
      // The transform transition is also the spring-back: clearing the drag state
      // after a miss animates the card home rather than teleporting it.
      transition: isDragging ? 'none' : 'transform 0.18s ease-out, border-color 0.15s, box-shadow 0.2s ease-out',
      // A soft grey shadow is what separates a white card from the grey panel now
      // that there is no border doing it. Held, that becomes a proper lift — the
      // one moment the card needs to read as above the list rather than in it.
      boxShadow: isDragging
        ? '0 6px 18px rgba(0,0,0,0.18)'
        : `0 0 8px ${COLOURS.cardShadow}`,
      position: 'relative',
      zIndex: isDragging ? 40 : 1,
      // Hidden rather than unmounted, both while its clone is in flight and for
      // good once it lands. It keeps its width in the row either way, so no other
      // card ever moves because of it.
      visibility: snap?.pairIndex === pairIndex || placed.has(pairIndex)
        ? 'hidden'
        : 'visible',
    };
  };

  const renderSlot = (namePairIndex, row) => {
    const isSolvedRow = placed.has(namePairIndex);
    return (
      <button
        key={`slot-${row}`}
        type="button"
        ref={(el) => { slotRefs.current[row] = el; }}
        disabled={!interactive || isSolvedRow || selected === null}
        aria-label={
          isSolvedRow
            ? `Matched: ${pairs[namePairIndex].name} — ${pairs[namePairIndex].description}`
            : `Empty slot for ${pairs[namePairIndex].name}`
        }
        onClick={() => attemptPlace(selected, row)}
        style={slotStyle(isSolvedRow)}
      >
        {wrongRow?.row === row && (
          <span key={wrongRow.id} aria-hidden="true" style={wrongPulseStyle} />
        )}
        {isSolvedRow && pairs[namePairIndex].description}
      </button>
    );
  };

  const selectedLabel = selected === null
    ? ''
    : `“${truncate(pairs[selected].description)}” picked up — choose the name to drop it on`;

  return (
    <div
      role="group"
      aria-label="Matching exercise"
      className="mb-6"
      // Flag for the player's auto-scroll loop, which otherwise keeps lerping the
      // column toward the bottom while a card is in the air. A DOM marker rather
      // than a callback prop so the loop can opt out without this component
      // knowing anything about the player.
      data-drag-active={drag ? 'true' : undefined}
    >
      <p
        style={{
          // `1.125rem` is Tailwind's `text-lg`, matching the title above a video
          // in `SectionYouTube`. The exercise shares the right-hand panel with
          // media, so the two need the same heading treatment.
          fontSize: '1.125rem',
          letterSpacing: '-0.01em',
          color: COLOURS.text,
          fontWeight: 500,
          margin: '0 0 5px 0',
        }}
      >
        Match the Pairs
      </p>

      {/* Optional standfirst, authored per block. Mirrors the description under a
          video title in `SectionYouTube` — same size, weight and spacing — since
          the two share the panel. */}
      {section?.content?.description && (
        <p
          style={{
            fontSize: '1rem',
            fontWeight: 300,
            lineHeight: 1.625,
            letterSpacing: '-0.01em',
            color: COLOURS.text,
            margin: '0 0 12px 0',
          }}
        >
          {section.content.description}
        </p>
      )}

      {/* One grid either way, because a name and its slot have to stay aligned and
          two independent containers would drift the moment one item wrapped to a
          different number of lines.

          In column mode the tracks are the pairs, so the first N children land on
          the title row and the next N fall directly beneath them. In row mode the
          tracks are name-then-slot, and `fit-content` sizes the first to the
          widest name across all rows — something per-row flex cells could never
          agree on. `minmax(0, …)` is what lets a description wrap rather than
          force the grid wider than its container. */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: columns
            ? `repeat(${pairs.length}, minmax(0, 1fr))`
            : 'fit-content(45%) minmax(0, 1fr)',
          columnGap: columnGapPx,
          // Column mode: the space between a name and its own slot. Row mode: the
          // space between one name/slot pair and the next, where 5 still suits.
          rowGap: columns ? 18 : 5,
          alignItems: columns ? 'stretch' : 'center',
        }}
      >
        {/* Two passes in column mode so every title sits on the first grid row and
            every slot on the second. Interleaving them would step across the
            columns instead, putting a title above a slot that is not its own. */}
        {names.map((namePairIndex, row) => {
          const label = pairs[namePairIndex].name;
          const name = (
            <div key={`name-${row}`} style={nameStyle()}>
              <span
                style={{
                  minWidth: 0,
                  overflowWrap: 'break-word',
                  // `pre-line` honours the break put in by hand and still wraps
                  // on its own where it has to, so a long name is not held to two
                  // lines it cannot fit in.
                  whiteSpace: breakNames ? 'pre-line' : 'normal',
                }}
              >
                {breakNames ? breakBeforeLastWord(label) : label}
              </span>
              {columns && (
                <span
                  ref={(el) => { nameMirrorRefs.current[row] = el; }}
                  aria-hidden="true"
                  style={NAME_MIRROR}
                >
                  {label}
                </span>
              )}
            </div>
          );
          if (columns) return name;
          return (
            <React.Fragment key={row}>
              {name}
              {renderSlot(namePairIndex, row)}
            </React.Fragment>
          );
        })}
        {columns && names.map((namePairIndex, row) => renderSlot(namePairIndex, row))}
      </div>

      {/* The pool. Every card stays mounted and keeps its place for the whole
          exercise — a placed one is only made invisible. Removing it from the flow
          would slide every card after it leftwards, so each correct answer would
          shuffle the cards a student had already read and was reasoning about.
          The band goes altogether once the last card lands. */}
      {unplacedCount > 0 && (
        <div
          style={{
            // Matches the name-to-slot gap above, so the three bands sit on one
            // even rhythm.
            marginTop: columns ? 18 : 12,
            display: 'flex',
            flexDirection: columns ? 'row' : 'column',
            flexWrap: columns ? 'wrap' : 'nowrap',
            // Matches the slots' column gap across, but stays tight when stacked.
            columnGap: columnGapPx,
            rowGap: 5,
            alignItems: 'stretch',
            // Must stay flex-start. Each card is exactly one column wide and the
            // gap matches, so starting at the left lands every card precisely on
            // the slots' `repeat(N, 1fr)` grid above. Centring the row looks
            // tidier while the pool is full, but the moment a card is placed the
            // survivors re-centre as a group and every remaining card sits
            // between two columns — which is what makes a name look off-centre
            // above its card.
            justifyContent: 'flex-start',
          }}
        >
          {orders.pool.map((pairIndex) => (
            <button
              key={pairIndex}
              type="button"
              // A placed card is invisible but still in the DOM. Taking it out of
              // the tab order and hiding it from assistive tech stops it being
              // offered twice — its slot already announces the match.
              disabled={!interactive || placed.has(pairIndex)}
              aria-hidden={placed.has(pairIndex) ? 'true' : undefined}
              aria-pressed={selected === pairIndex}
              aria-label={`Description: ${pairs[pairIndex].description}`}
              onPointerDown={(e) => handlePointerDown(e, pairIndex)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => endDrag(e, false)}
              onPointerCancel={(e) => endDrag(e, true)}
              onKeyDown={(e) => handleCardKeyDown(e, pairIndex)}
              ref={(el) => { cardRefs.current[pairIndex] = el; }}
              style={cardStyle(pairIndex)}
            >
              {pairs[pairIndex].description}
            </button>
          ))}
        </div>
      )}

      {/* The card in flight. A clone rather than the card itself, so it can leave
          the pool's flow and animate its own box without the layout reacting.
          `aria-hidden` because the real card is still in the DOM behind it and the
          live region below already narrates the result. */}
      {snap && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: snap.run ? snap.to.left : snap.from.left,
            top: snap.run ? snap.to.top : snap.from.top,
            width: snap.run ? snap.to.width : snap.from.width,
            height: snap.run ? snap.to.height : snap.from.height,
            transition: ['left', 'top', 'width', 'height', 'box-shadow']
              .map((p) => `${p} ${SNAP_MS}ms ${SNAP_EASE}`)
              .join(', '),
            // The lift it had in the student's hand resolves into the glow of a
            // solved slot, so the landing is already painted when it arrives.
            boxShadow: snap.run
              ? `0 0 10px ${COLOURS.correctGlow}`
              : '0 6px 18px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 12px',
            borderRadius: 6,
            boxSizing: 'border-box',
            background: COLOURS.surface,
            fontSize: '0.87rem',
            lineHeight: 1.5,
            fontWeight: 300,
            letterSpacing: '-0.01em',
            color: COLOURS.text,
            textAlign: 'center',
            textWrap: 'balance',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          {pairs[snap.pairIndex].description}
        </div>
      )}

      {/* Visually hidden, not deleted. Sighted students read progress off the
          filling slots and the emptying pool; a screen reader has neither, so
          this stays as the only running commentary. */}
      <p aria-live="polite" style={SR_ONLY}>
        {complete
          ? 'All matched — you can continue.'
          : `${placed.size} of ${pairs.length} matched${selected !== null ? ` · ${selectedLabel}` : ''}`}
      </p>
    </div>
  );
};

export default SectionBoxMatch;
