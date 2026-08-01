/**
 * Re-export shim.
 *
 * The implementation moved to `shared/lesson/textNormalization.js` so the admin
 * app can share it — narration word-counting must be byte-identical across the
 * student player, the admin editor, and the `server.js` audio pipeline.
 *
 * This shim exists so the legacy `src/components/LearningHub.jsx` and
 * `src/pages/BlogPostPage.jsx` keep working untouched. New code should import
 * from `@shared/lesson/textNormalization` directly.
 */
export {
  normalizeTextForNarration,
  normalizeTextForSmartNotes,
  extractTextFromHtml,
  splitIntoWords,
  convertCharacterToWordTimestamps,
} from '@shared/lesson/textNormalization';
