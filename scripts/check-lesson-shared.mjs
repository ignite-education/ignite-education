#!/usr/bin/env node
/**
 * Checks for shared/lesson — the code the student player and the admin canvas
 * both depend on. A regression here desynchronises the editor from what
 * students actually see, or corrupts lesson text on load/save.
 *
 * Run: node scripts/check-lesson-shared.mjs
 */
import { applyMarker, applyLink, insertBullet, insertToken } from '../shared/lesson/markers.js';
import { toRow, fromRow, toSections } from '../shared/lesson/blockAdapter.js';
import {
  groupSectionsByHeading,
  selectGroupMedia,
  selectGroupSuggestedQuestion,
  selectGroupHeadings,
} from '../shared/lesson/groupSections.js';

let pass = 0;
const failures = [];

// Key order is irrelevant to a database row, so compare structurally.
const stable = (v) =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]]))
      : val
  );

const eq = (name, got, want) => {
  if (stable(got) === stable(want)) pass++;
  else failures.push(`${name}\n      got  ${stable(got)}\n      want ${stable(want)}`);
};

// ── Inline markers ──────────────────────────────────────────────────────────
eq('bold wraps selection', applyMarker('hello world', 6, 11, '**').text, 'hello **world**');
eq('bold inserts pair with caret between', applyMarker('hi ', 3, 3, '**'), { text: 'hi ****', start: 5, end: 5 });
// 'a **b** c' → 'b' is at index 4
eq('bold toggles off when already wrapped', applyMarker('a **b** c', 4, 5, '**').text, 'a b c');
eq('italic uses a single star', applyMarker('x y', 2, 3, '*').text, 'x *y*');
eq('underline uses double underscore', applyMarker('x y', 2, 3, '__').text, 'x __y__');
eq('link uses the selection as label', applyLink('see docs here', 4, 8, 'https://x.io').text, 'see [docs](https://x.io) here');
eq('link selects its label after insert', applyLink('', 0, 0, 'https://x.io', 'read more'), {
  text: '[read more](https://x.io)', start: 1, end: 10,
});
eq('bullet at line start', insertBullet('', 0).text, '• ');
eq('bullet mid-text opens a new line', insertBullet('one', 3).text, 'one\n• ');
eq('firstName token', insertToken('Hi ', 3, 3).text, 'Hi {{firstName}}');

// ── Block ⇄ row mapping ─────────────────────────────────────────────────────
// Paragraphs are a bare string when new and { text } once saved. Both must work.
eq('new paragraph normalises to { text } on save',
  toRow({ id: 'a', type: 'paragraph', content: 'plain string' }, 0).content, { text: 'plain string' });
eq('saved paragraph reads back as a string',
  fromRow({ id: 'a', content_type: 'paragraph', content: { text: 'plain string' } }).content, 'plain string');
eq('null content falls back to content_text',
  fromRow({ id: 'b', content_type: 'paragraph', content: null, content_text: 'legacy' }).content, 'legacy');
eq('empty object content falls back to content_text',
  fromRow({ id: 'b2', content_type: 'paragraph', content: {}, content_text: 'legacy' }).content, 'legacy');
eq('legacy bare-string section_question',
  fromRow({ id: 'c', content_type: 'heading', content: {}, section_question: 'old single' }).sectionQuestion,
  ['old single', '', '']);
eq('json-array section_question',
  fromRow({ id: 'd', content_type: 'heading', content: {}, section_question: '["a","b","c"]' }).sectionQuestion,
  ['a', 'b', 'c']);
// Suggested / engagement questions are top-level block fields, not content.
eq('suggested question maps to its column',
  toRow({ id: 'h', type: 'heading', content: { text: 'H', level: 2 }, suggestedQuestion: 'Why?' }, 0).suggested_question,
  'Why?');
eq('blank suggested question stores null, not ""',
  toRow({ id: 'h', type: 'heading', content: { text: 'H', level: 2 }, suggestedQuestion: '' }, 0).suggested_question,
  null);
eq('engagement question and its save flag map across',
  (() => {
    const r = toRow({ id: 'p', type: 'paragraph', content: 'x', userQuestion: 'Your take?', saveFeedback: true }, 0);
    return [r.user_question, r.save_feedback];
  })(),
  ['Your take?', true]);
eq('save flag defaults false rather than undefined',
  toRow({ id: 'p', type: 'paragraph', content: 'x' }, 0).save_feedback, false);
eq('questions survive a full row round-trip',
  (() => {
    const b = fromRow({
      id: 'p', content_type: 'paragraph', content: { text: 'x' },
      user_question: 'Your take?', save_feedback: true, suggested_question: 'Why?',
    });
    return [b.userQuestion, b.saveFeedback, b.suggestedQuestion];
  })(),
  ['Your take?', true, 'Why?']);

// `saveContent` now delegates to toRow. These pin toRow to the exact behaviour
// of the inline mapping it replaced — including its quirks — because
// `content_text` feeds the narration hash in server.js.
const legacyRow = (block, index) => ({
  section_number: index + 1,
  title: block.type === 'heading'
    ? (typeof block.content === 'object' ? block.content.text : block.content)
    : `Section ${index + 1}`,
  content_type: block.type,
  content: typeof block.content === 'object' ? block.content : { text: block.content },
  content_text: typeof block.content === 'string' ? block.content
    : block.type === 'heading' && block.content.text ? block.content.text
    : block.type === 'youtube' && block.content.title ? block.content.title
    : block.type === 'bulletlist' && block.content.items ? block.content.items.join(', ') : '',
  order_index: index,
  suggested_question: block.suggestedQuestion || null,
  section_question: Array.isArray(block.sectionQuestion) && block.sectionQuestion.some(q => q)
    ? JSON.stringify(block.sectionQuestion) : null,
  user_question: block.userQuestion || null,
  save_feedback: block.saveFeedback || false,
});

for (const [name, block] of [
  ['heading', { type: 'heading', content: { text: 'H', level: 2 }, suggestedQuestion: 'Q' }],
  ['new paragraph (bare string)', { type: 'paragraph', content: 'body text' }],
  ['saved paragraph (object)', { type: 'paragraph', content: { text: 'body text' } }],
  ['bulletlist', { type: 'bulletlist', content: { items: ['a', 'b'] } }],
  ['youtube', { type: 'youtube', content: { videoId: 'x', title: 'T' } }],
  ['image', { type: 'image', content: { url: 'a.png', persist: true } }],
  ['svg', { type: 'svg', content: { markup: '<svg/>', width: '200' } }],
  ['quiz', { type: 'scored_question', content: { questions: ['q'], difficulties: ['easy'] } }],
  ['with section questions', { type: 'heading', content: { text: 'H', level: 2 }, sectionQuestion: ['a', '', ''] }],
]) {
  eq(`toRow matches the previous save mapping — ${name}`, toRow(block, 2), legacyRow(block, 2));
}

eq('section_number and order_index are array position',
  [toRow({ id: 'x', type: 'paragraph', content: '' }, 3).section_number,
   toRow({ id: 'x', type: 'paragraph', content: '' }, 3).order_index], [4, 3]);

// ── Pagination (must match the player exactly) ──────────────────────────────
const groups = groupSectionsByHeading(toSections([
  { id: '1', type: 'heading', content: { text: 'H', level: 2 } },
  { id: '2', type: 'image', content: { url: 'a.png', persist: true } },
  { id: '3', type: 'paragraph', content: 'first' },
  { id: '4', type: 'paragraph', content: 'second' },
  { id: '5', type: 'paragraph', content: 'third' },
]));
eq('heading+media+para share a screen, then one screen per paragraph',
  groups.map((g) => g.length), [3, 1, 1]);
eq('screen 1 owns its media', selectGroupMedia(groups, 0).section?.id, '2');
eq('screen 2 inherits persistent media', selectGroupMedia(groups, 1).inherited, true);
eq('persistence carries past multiple screens', selectGroupMedia(groups, 2).section?.id, '2');

const g2 = groupSectionsByHeading(toSections([
  { id: '1', type: 'image', content: { url: 'a.png' } },
  { id: '2', type: 'paragraph', content: 'one' },
  { id: '3', type: 'paragraph', content: 'two' },
]));
eq('non-persistent media does not carry forward', selectGroupMedia(g2, 1).section, null);

const g3 = groupSectionsByHeading(toSections([
  { id: '1', type: 'heading', content: { text: 'H', level: 2 } },
  { id: '2', type: 'image', content: { url: 'a.png' } },
  { id: '3', type: 'image', content: { url: 'b.png' } },
  { id: '4', type: 'paragraph', content: 'x' },
]));
eq('only the first media on a screen is shown', selectGroupMedia(g3, 0).section?.id, '2');
eq('the rest are reported so the canvas can warn', selectGroupMedia(g3, 0).dropped.map((d) => d.id), ['3']);

// The suggested-question chip carries onto following screens until the next H2.
const gq = groupSectionsByHeading(toSections([
  { id: 'h1', type: 'heading', content: { text: 'A', level: 2 }, suggestedQuestion: 'Why A?' },
  { id: 'p1', type: 'paragraph', content: 'one' },
  { id: 'p2', type: 'paragraph', content: 'two' },
  { id: 'h2', type: 'heading', content: { text: 'B', level: 2 }, suggestedQuestion: 'Why B?' },
  { id: 'p3', type: 'paragraph', content: 'three' },
]));
eq('owning screen reports its own chip',
  (() => { const r = selectGroupSuggestedQuestion(gq, 0); return [r.question, r.inherited]; })(),
  ['Why A?', false]);
eq('following screen inherits it',
  (() => { const r = selectGroupSuggestedQuestion(gq, 1); return [r.question, r.inherited, r.fromGroupIndex]; })(),
  ['Why A?', true, 0]);
eq('a new H2 replaces the inherited chip',
  (() => { const r = selectGroupSuggestedQuestion(gq, 2); return [r.question, r.inherited]; })(),
  ['Why B?', false]);
eq('screens after the new H2 inherit the new one',
  selectGroupSuggestedQuestion(gq, 3).question, 'Why B?');
eq('an H2 with no chip still reports itself as the owner, so it stays editable',
  (() => {
    const g = groupSectionsByHeading(toSections([
      { id: 'h', type: 'heading', content: { text: 'A', level: 2 } },
      { id: 'p', type: 'paragraph', content: 'x' },
    ]));
    const r = selectGroupSuggestedQuestion(g, 0);
    return [r.question, r.source?.id];
  })(),
  [null, 'h']);
eq('content before any heading has no chip and no owner',
  (() => {
    const g = groupSectionsByHeading(toSections([{ id: 'p', type: 'paragraph', content: 'x' }]));
    const r = selectGroupSuggestedQuestion(g, 0);
    return [r.question, r.source];
  })(),
  [null, null]);

// An author can end the chip early, before the next H2.
// Blocks below group into screens as: 0:[h1,p1]  1:[p2]  2:[p3]  3:[h2,p4]  4:[p5]
const gs = groupSectionsByHeading(toSections([
  { id: 'h1', type: 'heading', content: { text: 'A', level: 2 }, suggestedQuestion: 'Why A?' },
  { id: 'p1', type: 'paragraph', content: 'one' },
  { id: 'p2', type: 'paragraph', content: 'two', endsSuggestedQuestion: true },
  { id: 'p3', type: 'paragraph', content: 'three' },
  { id: 'h2', type: 'heading', content: { text: 'B', level: 2 }, suggestedQuestion: 'Why B?' },
  { id: 'p4', type: 'paragraph', content: 'four' },
  { id: 'p5', type: 'paragraph', content: 'five' },
]));
eq('chip shows on its owning screen', selectGroupSuggestedQuestion(gs, 0).question, 'Why A?');
eq('chip is gone on the stop screen itself', selectGroupSuggestedQuestion(gs, 1).question, null);
eq('the stop screen reports where it ended', selectGroupSuggestedQuestion(gs, 1).endedAtGroupIndex, 1);
eq('chip stays gone after the stop', selectGroupSuggestedQuestion(gs, 2).question, null);
eq('a later H2 starts a fresh chip despite the stop',
  (() => { const r = selectGroupSuggestedQuestion(gs, 3); return [r.question, r.inherited]; })(),
  ['Why B?', false]);
eq('the fresh chip inherits onward again', selectGroupSuggestedQuestion(gs, 4).question, 'Why B?');

// The marker persists inside the existing content JSONB — no migration needed.
eq('stop marker is written into content',
  toRow({ id: 'p', type: 'paragraph', content: 'x', endsSuggestedQuestion: true }, 0).content,
  { text: 'x', endsSuggestedQuestion: true });
eq('unmarked blocks carry no stray key',
  toRow({ id: 'p', type: 'paragraph', content: 'x' }, 0).content, { text: 'x' });
eq('clearing the marker removes it from content',
  toRow({ id: 'p', type: 'paragraph', content: { text: 'x', endsSuggestedQuestion: true }, endsSuggestedQuestion: false }, 0).content,
  { text: 'x' });
eq('marker survives a row round-trip',
  fromRow({ id: 'p', content_type: 'paragraph', content: { text: 'x', endsSuggestedQuestion: true } }).endsSuggestedQuestion,
  true);
eq('the marker never leaks into paragraph text',
  fromRow({ id: 'p', content_type: 'paragraph', content: { text: 'x', endsSuggestedQuestion: true } }).content,
  'x');
// The marker is honoured on any block of a screen, not just its first —
// screens are [paragraph, ...attached media], and media carries its own content.
// Groups here: 0:[h,p1]  1:[p2,i]
eq('a stop on a screen\'s attached media still ends the chip',
  (() => {
    const g = groupSectionsByHeading(toSections([
      { id: 'h', type: 'heading', content: { text: 'A', level: 2 }, suggestedQuestion: 'Q' },
      { id: 'p1', type: 'paragraph', content: 'one' },
      { id: 'p2', type: 'paragraph', content: 'two' },
      { id: 'i', type: 'image', content: { url: 'a.png', endsSuggestedQuestion: true } },
    ]));
    return [selectGroupSuggestedQuestion(g, 0).question, selectGroupSuggestedQuestion(g, 1).question];
  })(),
  ['Q', null]);

// A stop on the owning screen is ignored — the H2 introduces the chip there, so
// owner wins. The canvas never offers "end here" on an owning screen.
eq('a stop cannot cancel the chip on the screen that owns it',
  (() => {
    const g = groupSectionsByHeading(toSections([
      { id: 'h', type: 'heading', content: { text: 'A', level: 2 }, suggestedQuestion: 'Q' },
      { id: 'p', type: 'paragraph', content: 'one', endsSuggestedQuestion: true },
    ]));
    return selectGroupSuggestedQuestion(g, 0).question;
  })(),
  'Q');

// An author can end carried-forward media early, without introducing new media.
// Groups: 0:[H2,img(persist),p1] 1:[p2] 2:[p3] 3:[p4]
const gm = groupSectionsByHeading(toSections([
  { id: 'h', type: 'heading', content: { text: 'A', level: 2 } },
  { id: 'img', type: 'image', content: { url: 'a.png', persist: true } },
  { id: 'p1', type: 'paragraph', content: 'one' },
  { id: 'p2', type: 'paragraph', content: 'two' },
  { id: 'p3', type: 'paragraph', content: 'three', endsMedia: true },
  { id: 'p4', type: 'paragraph', content: 'four' },
]));
eq('media shows on its own screen', selectGroupMedia(gm, 0).section?.id, 'img');
eq('media carries to the next screen', selectGroupMedia(gm, 1).section?.id, 'img');
eq('media is gone on the stop screen', selectGroupMedia(gm, 2).section, null);
eq('the stop screen reports where media ended', selectGroupMedia(gm, 2).endedAtGroupIndex, 2);
eq('media stays gone after the stop', selectGroupMedia(gm, 3).section, null);
eq('a screen with its own media ignores an upstream stop',
  (() => {
    const g = groupSectionsByHeading(toSections([
      { id: 'i1', type: 'image', content: { url: 'a.png', persist: true } },
      { id: 'p1', type: 'paragraph', content: 'one' },
      { id: 'p2', type: 'paragraph', content: 'two', endsMedia: true },
      { id: 'p3', type: 'paragraph', content: 'three' },
      { id: 'i2', type: 'image', content: { url: 'b.png' } },
    ]));
    // groups: 0:[i1,p1] 1:[p2] 2:[p3,i2]
    return [selectGroupMedia(g, 1).section, selectGroupMedia(g, 2).section?.id];
  })(),
  [null, 'i2']);
eq('media stop persists into content with no schema change',
  toRow({ id: 'p', type: 'paragraph', content: 'x', endsMedia: true }, 0).content,
  { text: 'x', endsMedia: true });
eq('both stop markers can coexist on one block',
  toRow({ id: 'p', type: 'paragraph', content: 'x', endsMedia: true, endsSuggestedQuestion: true }, 0).content,
  { text: 'x', endsMedia: true, endsSuggestedQuestion: true });
eq('media stop survives a row round-trip',
  fromRow({ id: 'p', content_type: 'paragraph', content: { text: 'x', endsMedia: true } }).endsMedia,
  true);
eq('clearing the media stop removes it from content',
  toRow({ id: 'p', type: 'paragraph', content: { text: 'x', endsMedia: true }, endsMedia: false }, 0).content,
  { text: 'x' });
eq('the media stop never leaks into paragraph text',
  fromRow({ id: 'p', content_type: 'paragraph', content: { text: 'x', endsMedia: true } }).content,
  'x');

// Headings stay pinned above later screens; H3s are scoped to their H2.
// Groups: 0:[H2 A,p1] 1:[p2] 2:[H3 B,p3] 3:[p4] 4:[H2 C,p5] 5:[p6]
const gh = groupSectionsByHeading(toSections([
  { id: 'a', type: 'heading', content: { text: 'A', level: 2 } },
  { id: 'p1', type: 'paragraph', content: 'one' },
  { id: 'p2', type: 'paragraph', content: 'two' },
  { id: 'b', type: 'heading', content: { text: 'B', level: 3 } },
  { id: 'p3', type: 'paragraph', content: 'three' },
  { id: 'p4', type: 'paragraph', content: 'four' },
  { id: 'c', type: 'heading', content: { text: 'C', level: 2 } },
  { id: 'p5', type: 'paragraph', content: 'five' },
  { id: 'p6', type: 'paragraph', content: 'six' },
]));
eq('the authoring screen does not mark its own heading as inherited',
  (() => { const r = selectGroupHeadings(gh, 0); return [r.h2?.id, r.h2Inherited]; })(),
  ['a', false]);
eq('the next screen inherits the H2 and reports its origin',
  (() => { const r = selectGroupHeadings(gh, 1); return [r.h2?.id, r.h2Inherited, r.h2FromGroupIndex]; })(),
  ['a', true, 0]);
eq('an H3 screen still inherits its parent H2',
  (() => { const r = selectGroupHeadings(gh, 2); return [r.h2?.id, r.h2Inherited, r.h3?.id, r.h3Inherited]; })(),
  ['a', true, 'b', false]);
eq('a later screen inherits both H2 and H3',
  (() => { const r = selectGroupHeadings(gh, 3); return [r.h2?.id, r.h3?.id, r.h3Inherited, r.h3FromGroupIndex]; })(),
  ['a', 'b', true, 2]);
eq('a new H2 clears the inherited H3',
  (() => { const r = selectGroupHeadings(gh, 4); return [r.h2?.id, r.h2Inherited, r.h3]; })(),
  ['c', false, null]);
eq('screens after the new H2 do not resurrect the old H3',
  (() => { const r = selectGroupHeadings(gh, 5); return [r.h2?.id, r.h2Inherited, r.h3]; })(),
  ['c', true, null]);
eq('content before any heading has none pinned',
  (() => {
    const g = groupSectionsByHeading(toSections([{ id: 'p', type: 'paragraph', content: 'x' }]));
    const r = selectGroupHeadings(g, 0);
    return [r.h2, r.h3];
  })(),
  [null, null]);

const g4 = groupSectionsByHeading(toSections([
  { id: '1', type: 'paragraph', content: 'a' },
  { id: '2', type: 'scored_question', content: { questions: ['q'], difficulties: ['easy'] } },
  { id: '3', type: 'paragraph', content: 'b' },
]));
eq('a scored question takes its own screen', g4.map((g) => g.length), [1, 1, 1]);

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n  ${failures.length} FAILED:\n`);
  failures.forEach((f) => console.error(`    ${f}\n`));
  console.error(`  ${pass} passed, ${failures.length} failed\n`);
  process.exit(1);
}
console.log(`\n  shared/lesson: ${pass} checks passed\n`);
