/**
 * Match a course against a search query by title, name, module names, and lesson names.
 * Empty/whitespace queries match everything.
 *
 * @param {{ title?: string, name?: string, module_structure?: Array<{ name?: string, lessons?: Array<{ name?: string }> }> }} course
 * @param {string} query
 * @returns {boolean}
 */
export function courseMatchesQuery(course, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  if (course.title?.toLowerCase().includes(q)) return true;
  if (course.name?.toLowerCase().includes(q)) return true;
  if (Array.isArray(course.module_structure)) {
    for (const mod of course.module_structure) {
      if (mod?.name?.toLowerCase().includes(q)) return true;
      for (const lesson of mod?.lessons ?? []) {
        if (lesson?.name?.toLowerCase().includes(q)) return true;
      }
    }
  }
  return false;
}

/** Characters typed before the "Request" offer appears, results or not. */
export const REQUEST_MIN_CHARS = 3;

/**
 * Whether to offer "Request" for a query. Appears once the query is long enough
 * to be a real request, and — below that length — as soon as the catalog has
 * nothing to show for it.
 *
 * `noResults` is left to the caller: what counts as "nothing" differs by
 * surface. Mirrors next-app/src/lib/courseUtils.ts — the two apps share no
 * code, so this has to be kept in step by hand.
 *
 * @param {string} query
 * @param {boolean} noResults
 * @returns {boolean}
 */
export function shouldOfferRequest(query, noResults) {
  const len = (query || '').trim().length;
  return len > 0 && (len >= REQUEST_MIN_CHARS || noResults);
}
