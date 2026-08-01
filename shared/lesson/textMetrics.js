/**
 * Type metrics for the lesson text blocks, as explicit values.
 *
 * The student renderers express these as Tailwind classes; the admin editor
 * needs the same numbers on a <textarea>, which cannot inherit them. Keeping
 * one annotated table here means the click-to-edit swap has a single place to
 * go wrong, and `assertMetricsMatch` catches it at dev time if the renderer's
 * classes ever drift.
 *
 * Values are the resolved Tailwind v4 defaults:
 *   text-base 1rem   | text-lg 1.125rem | text-xl 1.25rem
 *   font-light 300   | leading-relaxed 1.625
 *   mb-1.5 0.375rem  | mb-3 0.75rem     | mb-4 1rem  | mt-5 1.25rem
 */

export const TEXT_METRICS = {
  // SectionParagraph: "text-base font-light leading-relaxed mb-4 text-black"
  paragraph: {
    fontSize: '1rem',
    fontWeight: 300,
    lineHeight: 1.625,
    letterSpacing: '-0.01em',
    color: '#000000',
    marginTop: 0,
    marginBottom: '1rem',
  },
  // The engagement question shown under a paragraph, which gates progression.
  // LearningHubV2 renders it "text-base font-medium leading-relaxed" in a
  // wrapper of mt-1 mb-4.
  userQuestion: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.625,
    letterSpacing: '-0.01em',
    color: '#000000',
    marginTop: '0.25rem',
    marginBottom: '1rem',
  },
  // SectionHeading level 2: wrapper mb-3 + marginTop 10px, h2 "text-xl" weight 500
  h2: {
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.75 / 1.25, // text-xl line-height is 1.75rem
    letterSpacing: '-0.01em',
    color: '#000000',
    marginTop: '10px',
    marginBottom: '0.75rem',
  },
  // SectionHeading level 3: h3 "text-lg mt-5 mb-1.5" weight 500
  h3: {
    fontSize: '1.125rem',
    fontWeight: 500,
    lineHeight: 1.75 / 1.125, // text-lg line-height is 1.75rem
    letterSpacing: '-0.01em',
    color: '#000000',
    marginTop: '1.25rem',
    marginBottom: '0.375rem',
  },
};

/**
 * Everything a <textarea> needs to stop looking like a form control.
 * Combine with a TEXT_METRICS entry; do not override the metrics.
 */
export const TEXTAREA_RESET = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: 0,
  border: 0,
  background: 'transparent',
  outline: 'none',
  resize: 'none',
  overflow: 'hidden',
  fontFamily: 'inherit',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'normal',
};

const COMPARED = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFamily', 'width'];

/**
 * Dev-only guard: compares the rendered node against the textarea that replaced
 * it and warns on any mismatch. This is what catches a future Tailwind class
 * change silently breaking the zero-jump swap.
 */
export const assertMetricsMatch = (renderedEl, textareaEl, label = 'block') => {
  if (!import.meta.env?.DEV || !renderedEl || !textareaEl) return;
  const a = getComputedStyle(renderedEl);
  const b = getComputedStyle(textareaEl);
  const diffs = COMPARED.filter((p) => a[p] !== b[p]).map((p) => `${p}: ${a[p]} → ${b[p]}`);
  if (diffs.length) {
    console.warn(
      `[LessonCanvas] ${label} metrics differ between rendered and editing state:\n  ${diffs.join('\n  ')}`
    );
  }
};
