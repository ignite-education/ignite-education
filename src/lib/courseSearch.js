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
