/**
 * AI-written descriptions for the board.
 *
 * The card used to show buildSnippet(description_text, 300) — the first 300
 * characters, cut on a word boundary. This replaces that with a short written
 * summary of the same text, stored on job_listings.ai_summary.
 *
 * Runs in its own cron (render.yaml: jobs-summaries, 05:40 UTC), NOT inside
 * runJobIngest. The ingest is deadline-bounded at 240s because Render's free
 * plan kills long runs, which is already why it is split into two crons; adding
 * 60 sequential Claude calls at 2-5s each would blow that budget on its own.
 * Separating it also means a summarisation outage is visible as its own failed
 * cron rather than as a partial ingest.
 *
 * WHY A SEPARATE COLUMN AND NOT description_snippet
 * description_snippet is in VOLATILE_FIELDS (persist.js), so the ingest
 * recomputes and rewrites it for every listing every night. A summary written
 * there would be replaced by a truncation within 24 hours, silently. See the
 * header of migrations/add_job_ai_summary.sql.
 *
 * COST
 * ~1,500 input + ~100 output tokens per listing on Haiku 4.5 ($1/$5 per MTok):
 * about $0.60 to summarise a 300-row board from cold, and a few tens of pence a
 * month after that, because ai_summary_hash means only genuinely edited adverts
 * are regenerated.
 */

import crypto from 'crypto'
import { buildSnippet } from './normalise.js'

/**
 * Deliberately the alias, not the pinned `claude-haiku-4-5-20251001` that the
 * ~20 call sites in server.js use. Nothing here depends on a specific snapshot,
 * and the alias means this file does not need touching when that pin retires.
 *
 * Overridable because the whole board is ~36 listings, which puts the gap
 * between tiers at pennies: Haiku fills the "requirement" half of the summary
 * on roughly 6 listings in 10, a stronger model on more. Set
 * JOBS_SUMMARY_MODEL=claude-sonnet-5 to trade a few pence for that.
 */
const MODEL = process.env.JOBS_SUMMARY_MODEL || 'claude-haiku-4-5'

/**
 * `temperature` is rejected with a 400 — "`temperature` is deprecated for this
 * model" — on everything from the 4.6 generation onward: Sonnet 5, Opus 5,
 * Fable 5, Opus 4.7/4.8. Haiku 4.5 and the 4.5 family still accept it, and a low
 * temperature genuinely steadies a summarisation task, so it is sent only where
 * it is legal. Without this the override above is a trap: setting
 * JOBS_SUMMARY_MODEL to any current model would fail every single listing.
 */
const ACCEPTS_TEMPERATURE = /^claude-(haiku-4-5|sonnet-4-5|opus-4-5|opus-4-1|opus-4-0|sonnet-4-0)/.test(MODEL)

/** Ceiling per run. Matches lib/logos.js MAX_LOOKUPS_PER_RUN for the same reason. */
const MAX_SUMMARIES_PER_RUN = 60

/**
 * Rows to inspect per run when deciding what needs work. The board itself is
 * capped at 300 (jobsData.ts MAX_BOARD_ROWS), so this covers everything a
 * visitor can see. Ordered oldest-checked-first with nulls first, so new
 * listings are summarised immediately and edited ones rotate through.
 */
const MAX_CANDIDATES = 300

/**
 * Below this, description_text is not a description — it is a job title and a
 * sentence, or an aggregator's search-result excerpt. There is nothing to
 * summarise that the existing truncation does not already show in full.
 */
const MIN_TEXT_CHARS = 400

/** Between calls. The repo's standing approach to Claude rate limits. */
const DELAY_MS = 250

/**
 * Consecutive failures before abandoning the run.
 *
 * A single advert that upsets the model should cost one row, not the batch —
 * but a revoked API key or a rate limit fails EVERY row, and without this it
 * would mark 60 listings `failed` and log 60 identical errors before stopping.
 */
const MAX_CONSECUTIVE_FAILURES = 5

/**
 * Opening styles, one assigned per listing.
 *
 * Assigned in code rather than asked for in the prompt, because every listing is
 * its own API call with no shared context: the model cannot know what it opened
 * the previous summary with, so "vary the opening" is an instruction it has no
 * way to follow. Left to itself it picks one phrasing and uses it for all 300
 * cards, which is what a board of identical "We're looking for a ..." openings
 * looked like before this existed.
 *
 * Two of the four deliberately do not name the role — the card already shows it
 * as the heading directly above, so repeating it wastes words twice over.
 */
const OPENINGS = [
  'Begin with "We\'re looking for a [role] to ...".',
  'Begin with the company name, as in "[Company] is hiring a [role] to ...".',
  'Begin with "This role " and a verb — "This role leads ...", "This role owns ...". Do NOT name the role; the card already shows it.',
  'Begin with the work itself as a gerund — "Leading design strategy for ...", "Owning the end-to-end ...". Do NOT name the role; the card already shows it.',
]

/** Stable per listing, so re-summarising an edited advert keeps its voice. */
function openingFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return OPENINGS[h % OPENINGS.length]
}

/**
 * Both sentences are separate required fields rather than one string.
 *
 * Asked for as prose — in five different phrasings, including "this sentence is
 * NOT optional" — the model wrote the role sentence and stopped, 10 or 11 times
 * out of 11. It treats a single dense sentence as a complete summary and no
 * amount of insistence changes that. A schema does: the response cannot
 * validate without both fields, so the requirement is structurally guaranteed
 * instead of merely requested. They are joined into one paragraph afterwards.
 */
const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    role: {
      type: 'string',
      description: 'One sentence, at most 22 words, on what the role does day to day and who or what it works with.',
    },
    requirement: {
      type: 'string',
      description: 'One sentence, at most 18 words, beginning "Requires", "Suited to" or "Needs", giving the single requirement that most determines eligibility. Where the advert states a number of years of experience, quote that figure — "Requires 8+ years", never "Requires extensive experience".',
    },
  },
  required: ['role', 'requirement'],
  additionalProperties: false,
}

function buildSystemPrompt(opening) {
  return [
    'You write the two-sentence summary that appears on a job board card.',
    '',
    '"role" — what the role actually is.',
    `  ${opening}`,
    '  Then say what they would do day to day, and who or what they would work',
    '  with: the team, the product, or the technologies the advert names.',
    '  At most 22 words. One sentence, ending in a full stop.',
    '',
    '"requirement" — who it is for.',
    '  The single requirement that most determines eligibility: years of',
    '  experience, a named technology, a qualification. Begin it with "Requires",',
    '  "Suited to" or "Needs". At most 18 words.',
    '  If the advert truly names no requirement, use this field for the part of',
    '  the work that did not fit into "role" — but never leave it empty.',
    '',
    'Rules:',
    '- British English, plain prose.',
    '- NEVER use "you" or "your". Describe the role, not the reader.',
    '- Use the advert\'s own figures instead of adjectives, every time it gives',
    '  one. Years of experience above all — write "Requires 8+ years in retail',
    '  marketing", never "Requires extensive experience". The same goes for team',
    '  size, number of markets, budget, scale, or anything else it quantifies:',
    '  "a team of 40 writers", "five European markets", "£2bn of annual volume".',
    '  A figure tells a reader in one glance whether the role is for them, which',
    '  is the whole job of this summary.',
    '- Never invent a figure, and never sharpen a vague phrase into a precise one.',
    '  If the advert says "significant experience", say that or say nothing — no',
    '  number is far better than a number that is not in the advert.',
    '- Count the words. Both sentences must fit on a small card, so one needing a',
    '  comma-spliced list of four things is too long — cut the list.',
    '- Use ONLY what is in the advert. Never invent or infer salary, location,',
    '  seniority, team size, or requirements. If the advert does not say, omit it.',
    '- Skip employer boilerplate ("we are a fast-growing team", mission statements,',
    '  benefits lists, EEO statements) unless it is genuinely what distinguishes',
    '  this role.',
    '- Never open with "The successful candidate" or "Join".',
    '- No markdown, no bullet points, no headings, no line breaks.',
  ].join('\n')
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/** Stable identity for a given advert body. */
function hashText(text) {
  return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex')
}

/**
 * Trim to the last complete sentence that fits inside `max`.
 *
 * Asking the model for a character count does not work — measured against real
 * adverts it overran 300 on 7 of 7 listings regardless of how the limit was
 * phrased, because models cannot count characters. So the limit is enforced
 * here instead, and enforced by dropping whole sentences rather than by cutting
 * mid-clause: a summary ending in "…plus" is precisely the mid-thought
 * truncation this feature exists to remove, and shipping one would leave the
 * board no better than the buildSnippet output it replaced.
 *
 * Losing the second sentence costs the eligibility line, which is the less
 * valuable half — the first sentence carries what the job actually is.
 *
 * Falls back to buildSnippet only when even one sentence exceeds `max`, where
 * an ellipsis is genuinely the least-bad option.
 */
function trimToSentence(text, max) {
  if (text.length <= max) return text

  // Split after ., ! or ? followed by whitespace. Decimals and "e.g." can fool
  // this; the cost is a slightly shorter summary, never a broken one.
  const parts = text.match(/[^.!?]+[.!?]+(?:\s|$)/g)
  if (!parts) return buildSnippet(text, max)

  let out = ''
  for (const part of parts) {
    if ((out + part).trim().length > max) break
    out += part
  }

  out = out.trim()
  return out || buildSnippet(text, max)
}

/**
 * Strip a code fence or wrapping quotes the model may add despite being told
 * not to, collapse whitespace, then enforce the length.
 *
 * 300 is what the card's four-line clamp fits at 0.9rem — see JobCard.tsx. The
 * prompt aims well under it so both sentences usually survive the trim.
 */
function cleanReply(raw) {
  let text = String(raw || '').trim()

  const fence = text.match(/^```(?:\w+)?\s*([\s\S]*?)```$/)
  if (fence) text = fence[1].trim()
  if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1).trim()

  // Collapse any line breaks it added — the card clamps to four lines and a
  // hard break inside 300 characters wastes one of them.
  text = text.replace(/\s+/g, ' ').trim()

  return trimToSentence(text, 300)
}

/**
 * One generation. `insist` is the retry pass, used when the first answer left
 * the requirement field blank.
 *
 * The schema guarantees valid JSON with both keys present, so the reply needs
 * none of the fence-stripping or repair the other Claude call sites in this
 * repo carry.
 */
async function generate(anthropic, job, insist = false) {
  const message = await anthropic.messages.create({
    model: MODEL,
    // Generous, and deliberately not tuned down to the ~80 tokens a good answer
    // needs. Billing is on tokens produced, not on the ceiling, so a high cap is
    // free — while a low one is actively dangerous here: a reply cut off at the
    // limit lands mid-JSON-string, which is unparseable, so an over-long answer
    // fails the listing outright instead of merely being trimmed. That is
    // exactly how the one failure in the first 35-listing run happened at 150.
    max_tokens: 400,
    ...(ACCEPTS_TEMPERATURE ? { temperature: 0.2 } : {}),
    system: buildSystemPrompt(openingFor(job.id)),
    output_config: { format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
    messages: [{
      role: 'user',
      content: [
        `Job title: ${job.title}`,
        `Company: ${job.company}`,
        '',
        'Advert:',
        job.text,
        ...(insist ? [
          '',
          'The "requirement" field must not be empty. Re-read the advert for the',
          'experience, qualification or technology it asks for, and put it there.',
        ] : []),
      ].join('\n'),
    }],
  })
  // Structured outputs guarantee well-formed JSON for a reply that completes,
  // so this only trips when the reply was cut short. Degrade to an empty object
  // rather than throwing: the caller reads that as a blank requirement and
  // retries, which is a better answer than failing the listing on a bad roll.
  try {
    return JSON.parse(message.content[0]?.text || '{}')
  } catch {
    return {}
  }
}

/**
 * Summarise the listings that need it.
 *
 * `anthropic` is injected rather than constructed here, matching how
 * resolveCompanyLogos takes its `http` client — server.js already owns a
 * configured singleton, and the backfill script builds its own.
 */
export async function summariseListings(supabase, anthropic, {
  limit = MAX_SUMMARIES_PER_RUN,
  dryRun = false,
  log = () => {},
} = {}) {
  const stats = { considered: 0, summarised: 0, unchanged: 0, skipped: 0, failed: 0, remaining: 0 }

  const { data, error } = await supabase
    .from('job_listings')
    .select('id, title, company, description_text, is_snippet, ai_summary, ai_summary_hash, ai_summary_status')
    .eq('status', 'approved')
    // A 'skipped' row is either an aggregator excerpt or an admin's decision to
    // opt this listing out. Never revisited — that is the point of the state.
    .or('ai_summary_status.is.null,ai_summary_status.in.(ok,failed)')
    .order('ai_summary_at', { ascending: true, nullsFirst: true })
    .limit(MAX_CANDIDATES)

  if (error) {
    throw new Error(
      `could not read job_listings.ai_summary — is migrations/add_job_ai_summary.sql applied? (${error.message})`
    )
  }

  const candidates = data || []
  stats.considered = candidates.length

  const work = []
  for (const row of candidates) {
    const text = (row.description_text || '').trim()

    // No fuller text than the card already shows. Mark it rather than checking
    // again every night: is_snippet is a property of the source, not the row.
    if (row.is_snippet || text.length < MIN_TEXT_CHARS) {
      stats.skipped++
      if (!dryRun && row.ai_summary_status !== 'skipped') {
        await writeState(supabase, row.id, { ai_summary_status: 'skipped', ai_summary_at: new Date().toISOString() })
      }
      continue
    }

    const hash = hashText(text)
    if (row.ai_summary && row.ai_summary_hash === hash) { stats.unchanged++; continue }

    work.push({ id: row.id, title: row.title, company: row.company, text, hash })
  }

  if (work.length > limit) {
    stats.remaining = work.length - limit
    work.length = limit
  }

  if (dryRun) {
    // ~4 chars per token is close enough to size a spend before committing to it.
    const inputTokens = work.reduce((sum, job) => sum + Math.ceil(job.text.length / 4), 0)
    const cost = (inputTokens / 1e6) * 1 + (work.length * 100 / 1e6) * 5
    log(`dry run: ${work.length} to summarise, ~${inputTokens.toLocaleString()} input tokens, ~$${cost.toFixed(2)}`)
    return { ...stats, wouldSummarise: work.length }
  }

  let consecutiveFailures = 0

  for (let i = 0; i < work.length; i++) {
    const job = work[i]
    try {
      let parsed = await generate(anthropic, job)

      // `required` forces the key to exist, but an empty string is a valid
      // string — so the model can and does satisfy the schema with "" about a
      // third of the time, on adverts that plainly do state requirements.
      // Structured outputs do not support minLength, so the constraint is
      // enforced with one retry instead. Cheap: it only fires on the rows that
      // came back short, and a second empty answer is taken at face value as
      // "this advert really has no stated requirement" rather than failing it.
      if (!parsed.requirement?.trim()) parsed = await generate(anthropic, job, true)

      const summary = cleanReply([parsed.role, parsed.requirement].filter(Boolean).join(' '))
      // Quote what actually came back. "empty summary" alone is undiagnosable
      // after the fact, and the interesting failures here are all about WHICH
      // field came back blank.
      if (!summary) throw new Error(`empty summary — model returned ${JSON.stringify(parsed).slice(0, 200)}`)

      await writeState(supabase, job.id, {
        ai_summary: summary,
        ai_summary_hash: job.hash,
        ai_summary_status: 'ok',
        ai_summary_at: new Date().toISOString(),
      })

      stats.summarised++
      consecutiveFailures = 0
    } catch (err) {
      stats.failed++
      consecutiveFailures++
      log(`failed on "${job.title}" at ${job.company}: ${err.message}`)

      await writeState(supabase, job.id, {
        ai_summary_status: 'failed',
        ai_summary_at: new Date().toISOString(),
      }).catch(() => {})

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        stats.remaining += work.length - i - 1
        log(`abandoning run after ${consecutiveFailures} consecutive failures — this is an API or auth fault, not bad adverts`)
        break
      }
    }

    if (i < work.length - 1) await sleep(DELAY_MS)
  }

  return stats
}

/**
 * Targeted UPDATE on the primary key.
 *
 * Never .upsert(): per the rule at the top of persist.js, upserting this table
 * resets status, approved_at and both *_override columns, which would
 * resurrect rejected jobs and discard every admin decision.
 */
async function writeState(supabase, id, patch) {
  const { error } = await supabase.from('job_listings').update(patch).eq('id', id)
  if (error) throw new Error(`could not write summary state: ${error.message}`)
}
