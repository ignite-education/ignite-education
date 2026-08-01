/**
 * Inline marker helpers for the lesson text syntax.
 *
 * The stored format is the one `SectionParagraph.parseFormattedSegments` reads:
 *   **bold**  *italic*  __underline__  [text](url)
 * plus lines beginning "• " or "- " which render as bullet rows, and blank
 * lines which render as an 8px spacer.
 *
 * All functions are pure and return the next caret selection, so the caller can
 * restore it after React re-renders the textarea.
 */

/**
 * Wrap the current selection in a marker pair, or insert an empty pair and
 * place the caret between them when nothing is selected.
 */
export const applyMarker = (text, start, end, open, close = open) => {
  const selected = text.slice(start, end);

  // Toggle off if the selection is already wrapped.
  const before = text.slice(Math.max(0, start - open.length), start);
  const after = text.slice(end, end + close.length);
  if (selected && before === open && after === close) {
    return {
      text: text.slice(0, start - open.length) + selected + text.slice(end + close.length),
      start: start - open.length,
      end: end - open.length,
    };
  }

  if (selected) {
    return {
      text: text.slice(0, start) + open + selected + close + text.slice(end),
      start: start + open.length,
      end: end + open.length,
    };
  }

  return {
    text: text.slice(0, start) + open + close + text.slice(end),
    start: start + open.length,
    end: start + open.length,
  };
};

/** Insert a markdown link, using the selection as the link text when present. */
export const applyLink = (text, start, end, url, label) => {
  const linkText = label || text.slice(start, end) || 'link';
  const snippet = `[${linkText}](${url})`;
  return {
    text: text.slice(0, start) + snippet + text.slice(end),
    // Select the label so it can be typed over immediately.
    start: start + 1,
    end: start + 1 + linkText.length,
  };
};

/**
 * Start a new bullet line. Bullets are line-leading "• " in the raw text —
 * `SectionParagraph` turns those into flex rows with a literal bullet span.
 */
export const insertBullet = (text, start) => {
  const atLineStart = start === 0 || text[start - 1] === '\n';
  const prefix = atLineStart ? '• ' : '\n• ';
  return {
    text: text.slice(0, start) + prefix + text.slice(start),
    start: start + prefix.length,
    end: start + prefix.length,
  };
};

/** Insert the personalisation token the player substitutes at render time. */
export const insertToken = (text, start, end, token = '{{firstName}}') => ({
  text: text.slice(0, start) + token + text.slice(end),
  start: start + token.length,
  end: start + token.length,
});
