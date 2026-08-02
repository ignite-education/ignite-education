/**
 * Single source of truth for lesson block types.
 *
 * Before this file the type set was duplicated across five places — the admin
 * `addBlock`/`addBlockAt` pair, the admin toolbar buttons, `renderBlockEditor`,
 * the admin preview modal, and the student `ContentRenderer` — which is how
 * `svg` and `scored_question` ended up renderable by students but invisible in
 * the admin preview. Add a type here and in `renderers/ContentRenderer.jsx`,
 * nowhere else.
 *
 * NOTE: `lessons.content_type` is a free-form TEXT column with no CHECK
 * constraint, so the database will happily accept anything. This file is the
 * only thing keeping the set honest.
 */

/** Rendered in the right-hand media panel, never in the text column. */
export const MEDIA_TYPES = ['image', 'youtube', 'svg'];

/** Every type the student renderer understands. */
export const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'bulletlist',
  'list',
  'image',
  'youtube',
  'svg',
  'scored_question',
  'box_match',
];

/**
 * Types offered in the admin insert menu. `list` is deliberately absent: it is
 * legacy, still readable from old rows, but has never had an editor UI.
 */
export const CREATABLE_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'bulletlist',
  'image',
  'youtube',
  'svg',
  'scored_question',
  'box_match',
];

/** Human labels for the admin UI. */
export const BLOCK_LABELS = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  bulletlist: 'Bullet list',
  list: 'List (legacy)',
  image: 'Image',
  youtube: 'Video',
  svg: 'SVG icon',
  scored_question: 'Quiz',
  box_match: 'Matching',
};

export const isMediaType = (type) => MEDIA_TYPES.includes(type);

/** Most pairs a `box_match` block may hold. The exercise stops reading past this. */
export const BOX_MATCH_MAX_PAIRS = 4;

/** Fewest complete pairs worth showing. Below this the block renders nothing. */
export const BOX_MATCH_MIN_PAIRS = 2;

/**
 * The pairs a `box_match` block will actually render.
 *
 * Blank rows are dropped rather than rendered empty, mirroring how the player
 * filters a `scored_question`'s unauthored questions before deciding whether the
 * block is a gate at all. Both halves must be written — a name with no
 * description has nothing to match against.
 */
export const boxMatchPairs = (content) =>
  (content?.pairs || [])
    .filter((p) => p?.name?.trim() && p?.description?.trim())
    .slice(0, BOX_MATCH_MAX_PAIRS);

/**
 * Default `content` payload for a new block.
 *
 * Mirrors the shapes the student renderers already expect. Note the asymmetry
 * that predates this file: `paragraph` content is a bare string, every other
 * type is an object. `blockAdapter.toRow` normalises that on save.
 */
export const defaultContentFor = (type) => {
  switch (type) {
    case 'heading':
      return { text: '', level: 2 };
    case 'bulletlist':
      return { items: [''] };
    case 'list':
      return { type: 'unordered', items: [''] };
    case 'image':
      return { url: '', alt: '', caption: '', width: 'medium', description: '' };
    case 'youtube':
      return { videoId: '', title: '', description: '' };
    case 'svg':
      return {
        markup: '',
        width: '200',
        height: '200',
        colors: { primary: '#8200EA', secondary: '#EF0B72' },
        description: '',
        animated: 'once',
      };
    case 'scored_question':
      return { questions: ['', '', ''], difficulties: ['easy', 'medium', 'medium'] };
    case 'box_match':
      // Two blank pairs — the minimum that renders. The author adds up to
      // BOX_MATCH_MAX_PAIRS more; blanks are dropped by `boxMatchPairs`.
      return { pairs: [{ name: '', description: '' }, { name: '', description: '' }] };
    case 'paragraph':
    default:
      return '';
  }
};

/**
 * Create a new editor-side block.
 *
 * Uses `crypto.randomUUID()` rather than the previous `Date.now()`, which
 * collided when two blocks were inserted inside the same millisecond and made
 * React keys (and now dnd-kit sortable ids) ambiguous.
 */
export const createBlock = (type) => ({
  id: crypto.randomUUID(),
  type,
  content: defaultContentFor(type),
  suggestedQuestion: '',
  sectionQuestion: ['', '', ''],
});
