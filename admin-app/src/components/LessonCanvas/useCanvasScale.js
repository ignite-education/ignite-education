import { useState, useRef, useLayoutEffect, useCallback } from 'react';

/**
 * Keep the canvas laid out at a fixed reference width and scale it to fit.
 *
 * The canvas mirrors the student player's 3fr/2fr split. Below roughly 1000px
 * the media column gets too narrow for its card, and because grid items size to
 * `min-content` by default the card refuses to shrink and spills over the
 * column boundary instead of reflowing.
 *
 * Rather than adding editor-only breakpoints — which would make the canvas stop
 * matching what students see, the one thing it exists to do — the layout is
 * held at REFERENCE_WIDTH and transform-scaled down. Proportions and line
 * breaks stay exactly as they render on a wide screen; everything just gets
 * smaller.
 *
 * @param {number} referenceWidth
 * @returns {{ outerRef, innerRef, scale, style }}
 */
export default function useCanvasScale(referenceWidth = 1040) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(null);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const available = outer.clientWidth;
    // Floor at 0.55 — below that the text is too small to edit, and a
    // horizontal scrollbar is the better failure mode.
    const next = available >= referenceWidth
      ? 1
      : Math.max(0.55, available / referenceWidth);

    setScale(next);
    // A scaled element still occupies its unscaled height in layout, which
    // would leave a large gap underneath. Mirror the visual height back.
    setInnerHeight(inner.offsetHeight * next);
  }, [referenceWidth]);

  useLayoutEffect(() => {
    measure();
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return undefined;

    // Watch both: the container for window resizes, the content for edits that
    // change its height (adding a block, expanding a drawer).
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [measure]);

  const style = scale < 1
    ? {
        width: referenceWidth,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }
    : undefined;

  return {
    outerRef,
    innerRef,
    scale,
    style,
    // Applied to the wrapper so following content sits directly beneath.
    outerStyle: scale < 1 && innerHeight ? { height: innerHeight, overflow: 'hidden' } : undefined,
  };
}
