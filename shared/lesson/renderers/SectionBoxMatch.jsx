import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { boxMatchPairs, BOX_MATCH_MIN_PAIRS } from '../blockTypes.js';
import useIsMobile from '../hooks/useIsMobile.js';

/**
 * Box matching exercise — the lesson's second progression gate.
 *
 * The names sit static down the left. The descriptions sit beside them on the
 * right and are the movable half: the student lifts one and drops it on another
 * row, and everything in between shifts up or down to make room — a sortable
 * list, not a swap. The goal is to get every description into the row opposite
 * the name it belongs to. A row that lines up correctly locks and can no longer
 * be moved.
 *
 * THE GATE IS THE `onComplete` CALL. This component withholds it until every
 * row is correct; the player needs no special branch in `handleSectionComplete`
 * because its default path already declines to advance past an incomplete
 * section. The one thing the player *must* do is treat `box_match` as a gate in
 * `groupHasGate`, or narration mode reveals every section at once and skips the
 * sequencing this relies on.
 *
 * Rows — not columns — are the unit of layout, because "lines up with its name"
 * is only meaningful if row N on the left is vertically aligned with row N on
 * the right. Two independently stacked columns would drift apart the moment a
 * description wrapped to a different number of lines.
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
 * The starting arrangement: a static name order, and a description order in
 * which no row is already correct.
 *
 * Without the second guarantee a shuffle can hand the student a row that is
 * solved before they touch it — at four pairs that happens often enough to
 * matter. Bounded retries rather than a true derangement algorithm: random
 * shuffles misalign almost immediately at this size, and giving up after ten
 * tries is harmless.
 */
const initialArrangement = (count) => {
  const indices = Array.from({ length: count }, (_, i) => i);
  const names = shuffle(indices);
  let slots = shuffle(indices);
  for (let attempt = 0; attempt < 10; attempt++) {
    if (!slots.some((s, row) => s === names[row])) break;
    slots = shuffle(indices);
  }
  return { names, slots };
};

/**
 * Every box is white; the description's outline carries its state.
 *
 * An outline is a thinner signal than a fill, so state has to be legible in
 * 1px — hence saturated line colours rather than the pale tints a fill wants.
 * The description text stays black at every stage: only the outline and the tick
 * change, which keeps the reading experience steady while the student sorts.
 *
 * The names stay outline-free: having a box at all is what reads as "this one
 * moves", which is the distinction the exercise depends on.
 */
const COLOURS = {
  accent: '#EF0B72',       // ignite pink — a held card, and a drop target
  surface: '#FFFFFF',
  outline: '#E6E6E6',      // a description at rest
  correctLine: '#22c55e',
  wrongLine: '#dc2626',    // a move that gained nothing
  targetFill: '#FDE7F4',   // the name of the row a card is aimed at
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

const Tick = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

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

  // Arranged once per mount. Recomputing on render would reshuffle the rows
  // mid-drag, so this is a lazy initialiser rather than a memo on `pairs`.
  const [arrangement] = useState(() => initialArrangement(pairs.length));
  const names = arrangement.names;

  // `slots[row]` is the pair index of the description currently in that row.
  // Seeded solved so returning to this screen with the Back button doesn't
  // re-lock a gate the student already cleared — the player owns that flag,
  // because this component is unmounted by the group-keyed container on every
  // navigation.
  const [slots, setSlots] = useState(() => (solved ? [...names] : arrangement.slots));
  const [selected, setSelected] = useState(null);   // tap-to-move / keyboard
  const [drag, setDrag] = useState(null);           // { row, dx, dy, pointerId, moved }
  const [hoverRow, setHoverRow] = useState(null);
  const [wrongRow, setWrongRow] = useState(null);

  const rowRefs = useRef({});
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  // Set when a live reorder needs the drag transform re-anchored afterwards.
  const reanchorRef = useRef(null);
  const wrongTimerRef = useRef(null);

  const interactive = !skipAnimation && enough;

  /** Is the description sitting in `row` of `arr` the right one? */
  const correctIn = useCallback((arr, row) => arr[row] === names[row], [names]);
  /** A row is locked precisely when it is correct — nothing else can move it. */
  const isCorrect = useCallback((row) => correctIn(slots, row), [correctIn, slots]);

  /**
   * Correctness as the student should *see* it — colours and the tick.
   *
   * The arrangement updates live as a card is dragged past other rows, so a row
   * can come out correct halfway through a gesture. Turning it green there
   * answers the question before the student has committed to anything, and it
   * flickers back to grey if they keep dragging. So while a drag is in flight,
   * appearance is judged against the arrangement at pick-up: rows already locked
   * before the drag keep their green, and nothing new turns green or red until
   * the pointer comes up.
   *
   * Deliberately separate from `isCorrect`, which still drives the *logic* —
   * what is locked, what may be reordered. Only the paint waits.
   */
  const settledCorrect = useCallback(
    (row) => correctIn(drag?.startSlots ?? slots, row),
    [correctIn, drag, slots]
  );
  const correctCount = slots.filter((s, row) => s === names[row]).length;
  const complete = enough && correctCount === pairs.length;

  useEffect(() => () => clearTimeout(wrongTimerRef.current), []);

  // Completion is reported exactly once. An under-authored block reports
  // immediately and never gates — the alternative is a lesson no student can
  // finish, which is how `scored_question` treats an empty question pool.
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
   * Which description cell is under this point, if any.
   *
   * `exclude` is the row being dragged, and skipping it is essential rather than
   * an optimisation: the dragged box is translated to follow the pointer, and
   * `getBoundingClientRect` reports that translated position — so it sits under
   * the cursor for the whole gesture and would always win the hit test against
   * itself, turning every drop into a no-op move onto its own row.
   */
  const rowAt = useCallback((x, y, exclude = null) => {
    for (const key of Object.keys(rowRefs.current)) {
      const row = Number(key);
      if (row === exclude) continue;
      const el = rowRefs.current[key];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return row;
    }
    return null;
  }, []);

  /**
   * Lift the description out of `fromRow` and insert it at `toRow`.
   *
   * Lift-and-insert, not swap: everything between the two rows shifts up or down
   * by one to make room, the way a sortable list behaves. A swap would fling the
   * displaced description all the way across the list, which is rarely what a
   * student dragging one box three rows down means.
   *
   * Locked rows are pinned. Only the free rows take part, so the shuffle closes
   * over them without disturbing a pairing already solved — which is also why the
   * sequence is rebuilt from `free` rather than spliced in place.
   *
   * `alsoFree` is the row being dragged. Mid-drag it can pass through its own
   * correct position, and it must stay movable when it does: nothing is committed
   * until the pointer comes up.
   *
   * Returns the new arrangement, or null if the move isn't allowed.
   */
  const reorderSlots = useCallback((arr, fromRow, toRow, alsoFree = null) => {
    if (fromRow === toRow) return null;
    const isFree = (r) => r === alsoFree || arr[r] !== names[r];
    if (!isFree(fromRow) || !isFree(toRow)) return null;

    const free = arr.map((_, r) => r).filter(isFree);
    const from = free.indexOf(fromRow);
    const to = free.indexOf(toRow);
    if (from < 0 || to < 0) return null;

    const seq = free.map((r) => arr[r]);
    const [lifted] = seq.splice(from, 1);
    seq.splice(to, 0, lifted);

    const next = [...arr];
    free.forEach((r, i) => { next[r] = seq[i]; });
    return next;
  }, [names]);

  /**
   * Flash the row red when a move gained nothing.
   *
   * Any newly correct row is progress, so this compares against the arrangement
   * the move started from — for a drag that is the arrangement at pick-up, not
   * the one an instant before release, since the rows have been shuffling live
   * the whole way down.
   */
  const scoreMove = useCallback((before, after, landedRow) => {
    const gained = after.some((_, r) => after[r] === names[r] && before[r] !== names[r]);
    if (gained) return;
    setWrongRow(landedRow);
    clearTimeout(wrongTimerRef.current);
    wrongTimerRef.current = setTimeout(() => setWrongRow(null), 600);
  }, [names]);

  /** Tap and keyboard path: one discrete move, scored immediately. */
  const moveTo = useCallback((fromRow, toRow) => {
    setSelected(null);
    const next = reorderSlots(slots, fromRow, toRow);
    if (!next) return;
    setSlots(next);
    scoreMove(slots, next, toRow);
  }, [slots, reorderSlots, scoreMove]);

  const handlePointerDown = (e, row) => {
    if (!interactive || isCorrect(row)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragOriginRef.current = { x: e.clientX, y: e.clientY };
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ row, dx: 0, dy: 0, pointerId: e.pointerId, moved: false, startSlots: slots });
  };

  const handlePointerMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    const dx = e.clientX - dragOriginRef.current.x;
    const dy = e.clientY - dragOriginRef.current.y;
    // A few pixels of slop, so a slightly shaky tap still reads as a tap.
    const moved = drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4;

    if (moved) {
      const target = rowAt(e.clientX, e.clientY, drag.row);
      const next = target === null ? null : reorderSlots(slots, drag.row, target, drag.row);
      if (next) {
        // Reorder live, so the rows the card is passing shuffle out of its way
        // instead of waiting for the drop. The dragged box's resting position
        // has just jumped to the target row, so its transform has to be
        // re-anchored or it would leap away from the pointer — see the layout
        // effect below, which this hands the pre-move position to.
        const el = rowRefs.current[drag.row];
        reanchorRef.current = el ? { naturalTop: el.getBoundingClientRect().top - drag.dy } : null;
        setSlots(next);
        setDrag((d) => (d ? { ...d, row: target, dx, dy, moved: true } : d));
        setHoverRow(null);
        return;
      }
    }

    setDrag((d) => (d ? { ...d, dx, dy, moved } : d));
    setHoverRow(moved ? rowAt(e.clientX, e.clientY, drag.row) : null);
  };

  const endDrag = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { row, moved, startSlots } = drag;
    setDrag(null);
    setHoverRow(null);
    reanchorRef.current = null;

    // The arrangement is already live — releasing only settles and scores it.
    if (moved) {
      if (!cancelled) scoreMove(startSlots, slots, row);
      return;
    }
    // Not a drag but a tap: pick this row up, or drop the picked-up one here.
    if (!cancelled) activate(row);
  };

  /**
   * Keep the dragged box under the pointer across a live reorder.
   *
   * The reorder moves it into a different row, so its untransformed position
   * jumps by the height of everything that shuffled past it. Shifting the drag
   * origin by exactly that delta leaves the visual position unchanged: the box
   * stays glued to the pointer while the list rearranges underneath it.
   */
  useLayoutEffect(() => {
    const pending = reanchorRef.current;
    if (!pending || !drag) return;
    reanchorRef.current = null;

    const el = rowRefs.current[drag.row];
    if (!el) return;
    const naturalTopAfter = el.getBoundingClientRect().top - drag.dy;
    const shift = naturalTopAfter - pending.naturalTop;
    if (Math.abs(shift) < 0.5) return;

    dragOriginRef.current.y += shift;
    setDrag((d) => (d ? { ...d, dy: lastPointerRef.current.y - dragOriginRef.current.y } : d));
    // `setDrag` here re-runs this effect, but `reanchorRef` has already been
    // cleared above and only a live reorder ever sets it again — so the second
    // pass returns immediately rather than looping.
  }, [slots, drag]);

  /**
   * Tap-to-move, shared by pointer taps and the keyboard.
   *
   * Deliberately NOT wired to `onClick`. The description box carries the pointer
   * handlers, so a mouse tap already resolves in `endDrag`; letting the button's
   * click through as well would run this twice and toggle the selection straight
   * back off. Keyboard Enter/Space is intercepted on keydown with
   * `preventDefault`, which suppresses the synthesised click for the same reason.
   */
  const activate = (row) => {
    if (!interactive || isCorrect(row)) return;
    if (selected === null || selected === row) {
      setSelected((s) => (s === row ? null : row));
      return;
    }
    moveTo(selected, row);
  };

  const handleKeyDown = (e, row) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    activate(row);
  };

  if (!enough) return null;

  // `border: none` is set explicitly rather than left off. Tailwind's preflight
  // zeroes button borders, but this renderer is also mounted outside that reset,
  // where a bare <button> would pick up the user agent's default outline.
  const nameStyle = (row) => {
    const correct = isCorrect(row);
    // The name carries the drop-target highlight, not the description. A dragged
    // box sits directly over the row it is aimed at, so highlighting the
    // description would hide the very feedback it is meant to give; the left
    // column is never covered.
    const isTarget = !correct && hoverRow === row;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      // No left padding and no border, so the name starts on exactly the same
      // vertical as the "Match the pairs" heading above it. Even a transparent
      // 1px border would inset the text and break that alignment; the row
      // centres its two cells, so matching the description's height buys
      // nothing anyway.
      padding: '6px 12px 6px 0',
      borderRadius: 6,
      border: 'none',
      boxSizing: 'border-box',
      // Correctness is shown on the description alone — the name is the fixed
      // question, so recolouring it too says the same thing twice and makes the
      // static half of the row flicker as the student sorts.
      background: isTarget ? COLOURS.targetFill : COLOURS.surface,
      fontSize: '0.9rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      color: COLOURS.text,
      transition: 'background-color 0.15s',
    };
  };

  const descriptionStyle = (row) => {
    // Appearance only — see `settledCorrect`. Green and red wait for the drop.
    const correct = settledCorrect(row);
    const isDragging = drag?.row === row && drag.moved;
    const isSelected = selected === row;
    const isHovered = hoverRow === row && !correct;
    const isWrong = wrongRow === row;

    // The outline is the whole state signal now, so it is resolved in priority
    // order: settled correct beats a rejected move, which beats being held.
    let line = COLOURS.outline;
    if (correct) line = COLOURS.correctLine;
    else if (isWrong) line = COLOURS.wrongLine;
    else if (isSelected || isDragging || isHovered) line = COLOURS.accent;

    return {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '6px 12px',
      borderRadius: 6,
      border: `1px solid ${line}`,
      // Without this the 1px border would add to the box on every state change
      // and nudge the row heights the drag hit-tests against.
      boxSizing: 'border-box',
      background: COLOURS.surface,
      fontSize: '0.87rem',
      lineHeight: 1.5,
      fontWeight: 300,
      letterSpacing: '-0.01em',
      color: COLOURS.text,
      whiteSpace: 'normal',
      cursor: !interactive || correct ? 'default' : (isDragging ? 'grabbing' : 'grab'),
      touchAction: 'none',
      userSelect: 'none',
      transform: isDragging ? `translate(${drag.dx}px, ${drag.dy}px)` : 'translate(0, 0)',
      transition: isDragging ? 'none' : 'transform 0.18s ease-out, border-color 0.15s',
      // On a white card over a white page the lift is doing real work, not just
      // decoration — it is what separates a held card from the list beneath it.
      boxShadow: isDragging ? '0 6px 18px rgba(0,0,0,0.18)' : 'none',
      position: 'relative',
      zIndex: isDragging ? 40 : 1,
      animation: isWrong ? 'matchShake 0.4s ease-in-out' : undefined,
    };
  };

  const selectedLabel = selected === null
    ? ''
    : `“${pairs[slots[selected]].description.slice(0, 40)}${pairs[slots[selected]].description.length > 40 ? '…' : ''}” picked up — choose the row to drop it into`;

  return (
    <div
      role="group"
      aria-label="Matching exercise"
      className="mb-6"
      // Flag for the player's auto-scroll loop, which otherwise keeps lerping the
      // left column toward the bottom while a card is in the air — dragging one
      // row down currently walks the whole column ~40px out from under the
      // pointer. A DOM marker rather than a callback prop so the loop can opt out
      // without this component knowing anything about the player.
      data-drag-active={drag ? 'true' : undefined}
    >
      <p
        style={{
          // `1rem` is Tailwind's `text-base`, which is what the lesson's
          // paragraphs use (`textMetrics.js`) — so this instruction sits at the
          // same size as the copy above it rather than reading as a caption.
          fontSize: '1rem',
          // Sentence case, so the uppercase eyebrow treatment (wide tracking,
          // heavy weight) that suited a shouted label would read as shouting.
          letterSpacing: '-0.01em',
          color: COLOURS.text,
          fontWeight: 500,
          // Matches the 5px gap between rows, so the title sits in the same
          // vertical rhythm as the list rather than floating above it.
          margin: '0 0 5px 0',
        }}
      >
        Match the Pairs
      </p>

      {/* A grid, not a stack of flex rows — see the note at the top of this file
          for why rows are the unit at all. The two-track grid is what lets every
          name share one width: `fit-content` sizes the first track to the widest
          name across all rows, which independent per-row flex cells could never
          agree on. It is capped at 45% so one long term cannot crowd the
          descriptions out, and the second track takes whatever is left.
          `minmax(0, …)` on that track is what allows the description to wrap
          rather than force the grid wider than its container.

          Rows are `React.Fragment`s so both cells are direct grid children; a
          wrapper element per row would each become a single grid item and the
          shared column would collapse. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'fit-content(45%) minmax(0, 1fr)',
          columnGap: isMobile ? 8 : 12,
          rowGap: 5,
          alignItems: 'center',
        }}
      >
        {names.map((namePairIndex, row) => {
          const correct = isCorrect(row);          // locking / eligibility
          const showCorrect = settledCorrect(row); // what the student sees
          const descriptionPairIndex = slots[row];
          return (
            <React.Fragment key={row}>
              <div style={nameStyle(row)}>
                <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>
                  {pairs[namePairIndex].name}
                </span>
              </div>

              <button
                type="button"
                ref={(el) => { rowRefs.current[row] = el; }}
                // The row being dragged stays enabled even while it is sitting
                // correct: a live reorder can carry it through its own answer
                // mid-gesture, and disabling the element under the pointer would
                // kill the pointer capture and strand the drag.
                disabled={!interactive || (correct && drag?.row !== row)}
                aria-pressed={selected === row}
                aria-label={
                  showCorrect
                    ? `Matched: ${pairs[namePairIndex].name} — ${pairs[descriptionPairIndex].description}`
                    : `Row for ${pairs[namePairIndex].name}, currently holding: ${pairs[descriptionPairIndex].description}`
                }
                onPointerDown={(e) => handlePointerDown(e, row)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => endDrag(e, false)}
                onPointerCancel={(e) => endDrag(e, true)}
                onKeyDown={(e) => handleKeyDown(e, row)}
                style={{ ...descriptionStyle(row), minWidth: 0 }}
              >
                {pairs[descriptionPairIndex].description}
                {/* Trails the text so it flows after the last word rather than
                    indenting the block, and so nothing shifts when a row locks.
                    It also keeps "correct" from being carried by colour alone,
                    which a colour-blind student would not see. */}
                {showCorrect && (
                  <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6, color: COLOURS.correctLine }}>
                    <Tick />
                  </span>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Visually hidden, not deleted. Sighted students read progress off the
          green rows and the Continue button appearing; a screen reader has
          neither, so this stays as the only running commentary on what a drag
          or a keyboard swap actually did. */}
      <p aria-live="polite" style={SR_ONLY}>
        {complete
          ? 'All matched — you can continue.'
          : `${correctCount} of ${pairs.length} matched${selected !== null ? ` · ${selectedLabel}` : ''}`}
      </p>
    </div>
  );
};

export default SectionBoxMatch;
