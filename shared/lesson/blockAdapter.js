/**
 * Bridge between the admin editor's block shape and the `lessons` row shape
 * the student renderers consume.
 *
 * The editor holds  { id, type, content, suggestedQuestion, userQuestion, saveFeedback, sectionQuestion }
 * The renderers want { id, content_type, content, title, suggested_question, user_question, save_feedback, section_number }
 *
 * `toRow` is the mapping `saveContent` already performs before inserting. Having
 * the canvas render through `toSection` — which shares `toRow`'s normalisation —
 * means the canvas shows exactly what will be written to the database, including
 * the paragraph string-vs-object asymmetry.
 */

/**
 * Flatten a block's content for the denormalised `content_text` column.
 *
 * Deliberately reproduces the previous inline behaviour exactly, including its
 * gaps — an object-shaped paragraph yields '' and media contributes nothing.
 * Broadening it looks like an improvement but would change what the ElevenLabs
 * narration pipeline hashes in `server.js`, which would invalidate every
 * lesson's word timestamps. Any change here needs the audio pipeline changed
 * with it.
 */
export const contentToText = (block) => {
  const { type, content } = block;
  if (typeof content === 'string') return content;
  if (!content) return '';
  if (type === 'heading' && content.text) return content.text;
  if (type === 'youtube' && content.title) return content.title;
  if (type === 'bulletlist' && content.items) return content.items.join(', ');
  return '';
};

/** Screens inherit the chip from an earlier H2; this marker stops that early. */
export const endsSuggestedQuestion = (blockOrRow) =>
  blockOrRow?.endsSuggestedQuestion === true ||
  blockOrRow?.content?.endsSuggestedQuestion === true;

/** Screens inherit `persist` media from an earlier screen; this stops that early. */
export const endsMedia = (blockOrRow) =>
  blockOrRow?.endsMedia === true || blockOrRow?.content?.endsMedia === true;

/**
 * Editor block → renderer section.
 *
 * Note `content` is passed through untouched: `SectionParagraph` accepts a bare
 * string, `{ text }`, or `content_text`, so the paragraph asymmetry is safe to
 * preserve here rather than normalising early and diverging from what's stored.
 */
export const toSection = (block, index) => ({
  id: block.id,
  content_type: block.type,
  content: block.content,
  content_text: contentToText(block),
  title:
    block.type === 'heading'
      ? (typeof block.content === 'object' ? block.content?.text : block.content) || ''
      : `Section ${index + 1}`,
  suggested_question: block.suggestedQuestion || '',
  user_question: block.userQuestion || '',
  save_feedback: !!block.saveFeedback,
  ends_suggested_question: !!block.endsSuggestedQuestion,
  ends_media: !!block.endsMedia,
  section_number: index + 1,
});

export const toSections = (blocks) => (blocks || []).map(toSection);

/**
 * Editor block → `lessons` insert row.
 *
 * Mirrors the existing `saveContent` mapping exactly. Callers add `course_id`,
 * `module_number`, `lesson_number` and `lesson_name`.
 */
/**
 * "Stop carrying this forward from here" markers.
 *
 * Both ride inside the existing `content` JSONB rather than new columns, so
 * they need no migration against the live database. Renderers read only the
 * keys they care about (`text`, `items`, `url`, …) and ignore these.
 *
 * Editor block field  →  content key
 */
export const CARRY_MARKERS = {
  endsSuggestedQuestion: 'endsSuggestedQuestion',
  endsMedia: 'endsMedia',
};

/** Normalise content for storage, folding in whichever markers are set. */
const contentForRow = (block) => {
  const base =
    typeof block.content === 'object' && block.content !== null
      ? { ...block.content }
      : { text: block.content };

  for (const [field, key] of Object.entries(CARRY_MARKERS)) {
    if (block[field]) base[key] = true;
    else delete base[key];
  }
  return base;
};

export const toRow = (block, index) => ({
  section_number: index + 1,
  order_index: index,
  title:
    block.type === 'heading'
      ? (typeof block.content === 'object' ? block.content?.text : block.content) || `Section ${index + 1}`
      : `Section ${index + 1}`,
  content_type: block.type,
  content: contentForRow(block),
  content_text: contentToText(block),
  suggested_question: block.suggestedQuestion || null,
  section_question:
    Array.isArray(block.sectionQuestion) && block.sectionQuestion.some((q) => q)
      ? JSON.stringify(block.sectionQuestion)
      : null,
  user_question: block.userQuestion || null,
  save_feedback: block.saveFeedback || false,
});

/**
 * `lessons` row → editor block. Inverse of `toRow`, matching the existing
 * load-side parsing including its legacy fallbacks.
 */
/**
 * Resolve a paragraph row's text across all three storage shapes.
 *
 * Guards `typeof null === 'object'` explicitly — without that, a row with
 * `content: null` takes the object branch, yields '' and silently discards a
 * perfectly good `content_text`.
 */
const paragraphContent = (row) => {
  if (row.content && typeof row.content === 'object') {
    return row.content.text ?? row.content_text ?? '';
  }
  if (typeof row.content === 'string' && row.content) return row.content;
  return row.content_text ?? '';
};

export const fromRow = (row) => {
  let sectionQuestion = ['', '', ''];
  if (row.section_question) {
    try {
      const parsed = JSON.parse(row.section_question);
      if (Array.isArray(parsed)) {
        sectionQuestion = [parsed[0] || '', parsed[1] || '', parsed[2] || ''];
      } else {
        sectionQuestion = [row.section_question, '', ''];
      }
    } catch {
      // Legacy rows stored a single bare string rather than a JSON array.
      sectionQuestion = [row.section_question, '', ''];
    }
  }

  return {
    id: row.id,
    type: row.content_type,
    content: row.content_type === 'paragraph' ? paragraphContent(row) : row.content,
    suggestedQuestion: row.suggested_question || '',
    sectionQuestion,
    userQuestion: row.user_question || '',
    saveFeedback: !!row.save_feedback,
    // Lifted out of `content` so the editor can treat them as plain block fields.
    endsSuggestedQuestion: row.content?.endsSuggestedQuestion === true,
    endsMedia: row.content?.endsMedia === true,
  };
};
