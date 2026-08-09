/**
 * Profession mapping — decide which Ignite specialism a job belongs to.
 *
 * Pure, like ./seniority.js, for the same reason: testable without a database.
 *
 * Returns null when nothing scores above threshold. The caller MUST drop those
 * jobs rather than queueing them — an unmapped job is noise, and noise in the
 * approval queue is what makes a manual queue unsustainable.
 */

import { PROFESSION_RULES, MUTUALLY_EXCLUSIVE, SCORE } from '../config/professionMap.js'

function countMatches(patterns, haystack) {
  let n = 0
  for (const pattern of patterns) {
    if (pattern.test(haystack)) n++
  }
  return n
}

/**
 * @param {object}  input
 * @param {string}  input.title
 * @param {string} [input.descriptionText]
 * @param {string} [input.sourceCategory]     the source's own category label/tag
 * @param {string} [input.queryProfession]    profession the aggregator query was scoped to
 * @param {string[]} [input.allowedProfessions] live specialisms; anything else is ignored
 * @returns {{profession: string, score: number, reason: string}|null}
 */
export function mapProfession({
  title,
  descriptionText = '',
  sourceCategory = '',
  queryProfession = null,
  allowedProfessions = null,
} = {}) {
  const titleText = String(title || '').toLowerCase()
  // Cap the description: keyword boosts should reflect the role, not a long
  // boilerplate benefits section, and scanning 40KB per job per pattern adds up.
  const bodyText = String(descriptionText || '').toLowerCase().slice(0, 4000)
  const category = String(sourceCategory || '').toLowerCase()

  const scores = []

  for (const [profession, rules] of Object.entries(PROFESSION_RULES)) {
    if (allowedProfessions && !allowedProfessions.includes(profession)) continue

    // Hard exclusions first. "Credit Analyst" is not a Data Analyst and no
    // amount of supporting evidence should make it one.
    if (countMatches(rules.titleExclude || [], titleText) > 0) continue

    const titleHits = countMatches(rules.titleInclude || [], titleText)
    const weakHits = titleHits === 0 ? countMatches(rules.titleWeak || [], titleText) : 0

    // Title evidence is mandatory. Without this, category + boilerplate keywords
    // alone map arbitrary jobs — every company advert mentions SQL somewhere.
    if (titleHits === 0 && weakHits === 0) continue

    let score = 0
    const reasons = []
    const strongTitle = titleHits > 0

    if (strongTitle) {
      score += SCORE.titleInclude
      reasons.push('title')
    } else {
      score += SCORE.titleWeak
      reasons.push('title-weak')
    }

    if (queryProfession && queryProfession === profession) {
      score += SCORE.queryProfession
      reasons.push('query')
    }

    if (category) {
      const byTag = (rules.adzunaCategories || []).some(t => category === t.toLowerCase())
      const byPattern = countMatches(rules.sourceCategories || [], category) > 0
      if (byTag || byPattern) {
        score += SCORE.category
        reasons.push('category')
      }
    }

    const keywordHits = countMatches(rules.keywordBoost || [], bodyText)
    if (keywordHits > 0) {
      score += Math.min(keywordHits, SCORE.keywordCap) * SCORE.keyword
      reasons.push(`keywords:${keywordHits}`)
    }

    scores.push({ profession, score, strongTitle, reason: reasons.join('+') })
  }

  if (scores.length === 0) return null

  scores.sort((a, b) => b.score - a.score)

  // Sibling professions share a category, so both can score. A matched title is
  // the tiebreak; without one it is genuinely ambiguous.
  const [top, second] = scores
  if (second && second.score === top.score) {
    const siblings = MUTUALLY_EXCLUSIVE.some(
      pair => pair.includes(top.profession) && pair.includes(second.profession)
    )
    if (siblings && top.strongTitle !== second.strongTitle) {
      const winner = top.strongTitle ? top : second
      return winner.score >= SCORE.threshold
        ? { profession: winner.profession, score: winner.score, reason: winner.reason }
        : null
    }
    // A tie we cannot break is a guess. Dropping beats mis-filing.
    return null
  }

  if (top.score < SCORE.threshold) return null

  return { profession: top.profession, score: top.score, reason: top.reason }
}

/**
 * Could this title possibly map to a specialism, judged on the title alone?
 *
 * The cheap pre-gate for two-phase sources. Workday and Oracle return no
 * description in their list response, so the full mapProfession() cannot run
 * until we have paid for a per-job detail fetch — and on a board like Roche's
 * (1,191 requisitions) that would be the entire run's time budget spent on jobs
 * we were always going to drop.
 *
 * Sound because title evidence is MANDATORY above: a job with neither a
 * titleInclude nor a titleWeak hit can never score, no matter what its
 * description says. So a false here is a certain drop, not a guess. A true is
 * not a promise — mapProfession() still runs properly once the description is
 * in hand, and titleWeak-only jobs frequently fail it.
 *
 * Deliberately does NOT apply the threshold. A titleWeak hit scores 2 and needs
 * category or keyword support to reach 5, and that support only exists after
 * hydration. Gating on the score here would drop every weak-title job before it
 * could earn its way in.
 */
export function couldMapProfession({ title, allowedProfessions = null } = {}) {
  const titleText = String(title || '').toLowerCase()
  if (!titleText) return false

  for (const [profession, rules] of Object.entries(PROFESSION_RULES)) {
    if (allowedProfessions && !allowedProfessions.includes(profession)) continue
    if (countMatches(rules.titleExclude || [], titleText) > 0) continue
    if (countMatches(rules.titleInclude || [], titleText) > 0) return true
    if (countMatches(rules.titleWeak || [], titleText) > 0) return true
  }
  return false
}
