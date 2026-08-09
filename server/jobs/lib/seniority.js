/**
 * Seniority inference.
 *
 * Pure — no I/O, no DB, no network. That is deliberate: the ingest pipeline, the
 * admin's "re-run inference" action and any future unit test all share this one
 * function, and it can be exercised without a database.
 *
 * Almost none of the job APIs expose seniority (Reed, Careerjet, Jooble
 * and every ATS feed omit it entirely), so for most of the board this cascade IS
 * the seniority data. It records WHICH rule fired and on WHICH token so a
 * misclassification is one glance in the admin table rather than a debugging
 * session.
 */

import {
  TITLE_RULES,
  AMBIGUOUS_TOKENS,
  NHS_BAND_PATTERN,
  NHS_CONTEXT_PATTERN,
  nhsBandToTier,
  YEARS_EXPERIENCE_PATTERN,
  yearsToTier,
  NATIVE_SENIORITY_MAP,
  TITLE_NOISE_PATTERNS,
} from '../config/seniorityRules.js'

/**
 * Strip the noise that would otherwise defeat a \b-anchored rule:
 * gender markers, requisition numbers, bracketed work-type and salary tags, and
 * any trailing " - Location" / " | Location" suffix.
 */
export function normaliseTitle(title) {
  let t = String(title || '').toLowerCase()

  for (const pattern of TITLE_NOISE_PATTERNS) {
    t = t.replace(pattern, ' ')
  }

  // Drop a trailing " - …" / " | …" / " @ …" segment (usually location or company).
  t = t.replace(/\s+[-|@]\s+.*$/, ' ')

  return t.replace(/\s+/g, ' ').trim()
}

function result(tier, source, token, confidence) {
  return { tier, source, token: token || null, confidence }
}

/**
 * @param {object}  input
 * @param {string}  input.title
 * @param {string} [input.descriptionText]
 * @param {boolean}[input.isSnippet]        true when the source gave only an excerpt
 * @param {string} [input.profession]       the mapped Ignite specialism
 * @param {string|string[]} [input.nativeSeniority] a source-provided level, if any
 * @param {object} [input.flags]            e.g. { graduate: true } from Reed
 * @param {string} [input.sourceCategory]   e.g. an aggregator's 'graduate-jobs'
 * @returns {{tier: string, source: string, token: string|null, confidence: number}}
 */
export function inferSeniority({
  title,
  descriptionText = '',
  isSnippet = false,
  profession = '',
  nativeSeniority = null,
  flags = {},
  sourceCategory = '',
} = {}) {
  const normTitle = normaliseTitle(title)
  // Ambiguous tokens are sector-dependent, so they need the profession as
  // context alongside the title.
  const context = `${normTitle} ${profession}`.toLowerCase()

  // 1. A source that actually tells us. Always wins.
  if (nativeSeniority) {
    const values = Array.isArray(nativeSeniority) ? nativeSeniority : [nativeSeniority]
    for (const value of values) {
      const mapped = NATIVE_SENIORITY_MAP[String(value).toLowerCase().trim()]
      if (mapped) return result(mapped, 'native', String(value), 1)
    }
  }

  // 2. Reed's `graduate` boolean — the highest-confidence entry-level signal
  //    available for the UK, and the only one that is an explicit API field.
  if (flags.graduate === true) {
    return result('entry', 'graduate_flag', 'graduate', 0.95)
  }

  // 3. A source category that names graduate hiring outright.
  if (sourceCategory && /graduate/i.test(sourceCategory)) {
    return result('entry', 'category', sourceCategory, 0.9)
  }

  // 4. NHS Agenda for Change band — a literal numeric seniority scale. Gated on
  //    clinical context, because "band 5" elsewhere means something else.
  //    Tested against the RAW title too: banding is very often written as a
  //    " - Band 3" suffix, which normaliseTitle() strips as a location.
  const rawTitle = String(title || '').toLowerCase()
  const bandMatch =
    normTitle.match(NHS_BAND_PATTERN) ||
    rawTitle.match(NHS_BAND_PATTERN) ||
    descriptionText.match(NHS_BAND_PATTERN)
  if (bandMatch) {
    const clinical =
      NHS_CONTEXT_PATTERN.test(context) || NHS_CONTEXT_PATTERN.test(descriptionText.slice(0, 2000))
    if (clinical) {
      const tier = nhsBandToTier(bandMatch[1])
      if (tier) return result(tier, 'nhs_band', `band ${bandMatch[1]}`, 0.9)
    }
  }

  // 5. Sector-ambiguous tokens, BEFORE the generic rules — these invert the
  //    generic answer, so letting TITLE_RULES see them first would be wrong.
  for (const entry of AMBIGUOUS_TOKENS) {
    if (!entry.pattern.test(normTitle)) continue

    // An explicit seniority word alongside the ambiguous one settles it, and the
    // generic rules handle that better. e.g. "Senior Associate" is not entry.
    if (/\b(senior|snr|sr\.?|junior|jnr|jr\.?|graduate|trainee|principal|lead|head of|director)\b/i.test(normTitle)) {
      break
    }

    let tier = entry.tier
    for (const override of entry.overrides) {
      if (override.when.test(context) || override.when.test(descriptionText.slice(0, 2000))) {
        tier = override.then
        break
      }
    }
    return result(tier, 'title_rule', entry.token, 0.7)
  }

  // 6. Ordered generic title rules. EXEC > SENIOR > ENTRY.
  for (const rule of TITLE_RULES) {
    const match = normTitle.match(rule.pattern)
    if (match) return result(rule.tier, 'title_rule', match[0].trim(), 0.8)
  }

  // 7. Years of experience from the description.
  //    Skipped for snippets: a truncated excerpt may quote "5 years" about
  //    something that is not the requirement at all.
  if (!isSnippet && descriptionText) {
    const yearsMatch = descriptionText.match(YEARS_EXPERIENCE_PATTERN)
    if (yearsMatch) {
      const years = Number(yearsMatch[1])
      if (Number.isFinite(years)) {
        return result(yearsToTier(years), 'years_experience', `${years} years`, 0.6)
      }
    }
  }

  // 8. Most jobs carry no seniority marker at all, and those are overwhelmingly
  //    mid-level. Low confidence, so the admin queue can surface them for review.
  return result('mid', 'default', null, 0.3)
}
