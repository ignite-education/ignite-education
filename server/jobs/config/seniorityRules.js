/**
 * Seniority classification rules.
 *
 * Data only — the cascade that applies them lives in ../lib/seniority.js.
 *
 * The product taxonomy is three levels (entry / mid / senior). `executive` is a
 * fourth tier used only to DROP a job at ingest: letting CEOs and VPs through as
 * "senior" makes the senior filter useless.
 *
 * These are tuned for the UK. Generic US-built heuristics miss apprenticeships,
 * graduate schemes, placement years and — most importantly — the NHS Agenda for
 * Change banding, which is a literal numeric seniority scale.
 */

export const TIERS = ['entry', 'mid', 'senior', 'executive']

/**
 * Ordered title rules. EXEC is tested before SENIOR before ENTRY, so
 * "Senior Director" resolves as executive and "Graduate Scheme Manager"
 * resolves as senior. Order is the whole point — do not reorder.
 */
export const TITLE_RULES = [
  {
    tier: 'executive',
    pattern: /\b(chief|c[eftoi]o|cxo|vp|vice[\s-]president|head of|director|president|founder|managing partner)\b/i,
  },
  {
    tier: 'senior',
    pattern: /\b(senior|snr|sr\.?|lead|principal|staff|architect|manager|supervisor|iii|iv)\b/i,
  },
  {
    tier: 'entry',
    pattern: /\b(junior|jnr|jr\.?|graduate|grad scheme|new grad(uate)?|trainee|apprentice(ship)?|intern(ship)?|placement( year)?|sandwich year|entry[\s-]level|school[\s-]leaver|nqt|nq|fy[12]|st[1-8]|paralegal|assistant psychologist)\b/i,
  },
]

/**
 * Tokens whose plain reading is WRONG in some sectors. Consulted before the
 * generic TITLE_RULES because they invert the generic answer.
 *
 * `when` is tested against the normalised title plus the profession; if it
 * matches, `then` wins over `tier`.
 */
export const AMBIGUOUS_TOKENS = [
  {
    token: 'associate',
    pattern: /\bassociate\b/i,
    // Junior in tech; a senior fee-earning grade in law, consulting and banking.
    tier: 'entry',
    overrides: [
      { when: /\b(solicitor|lawyer|legal|counsel|consultant|consulting|advisory|investment|banking|equity|audit|tax)\b/i, then: 'senior' },
    ],
  },
  {
    token: 'staff',
    pattern: /\bstaff\b/i,
    // Senior IC in tech; generic elsewhere. "Staff nurse" is NHS Band 5 = mid.
    tier: 'senior',
    overrides: [
      { when: /\bstaff (nurse|member)\b/i, then: 'mid' },
    ],
  },
  {
    token: 'consultant',
    pattern: /\bconsultant\b/i,
    // The MOST senior grade in UK medicine; entry-to-mid in professional services.
    tier: 'mid',
    overrides: [
      { when: /\b(nhs|clinical|medical|surgeon|psychiatr|physician|hospital|trust)\b/i, then: 'senior' },
    ],
  },
  {
    token: 'manager',
    pattern: /\bmanager\b/i,
    tier: 'senior',
    overrides: [
      { when: /\b(retail|store|shift|duty|assistant|trainee|deputy)\b/i, then: 'mid' },
      // "Manager" here names a discipline, not a level of people-leadership. A
      // bare "Product Manager" is the mid rung — the senior one is called
      // "Senior Product Manager", and the generic `senior` rule catches that
      // first. Without this, an entire specialism would classify as senior and
      // the entry/mid filters for it would be empty.
      { when: /\b(product|project|programme|program|account|marketing|brand|campaign|community|content|social media)\s+manager\b/i, then: 'mid' },
    ],
  },
  {
    token: 'principal',
    pattern: /\bprincipal\b/i,
    tier: 'senior',
    overrides: [],
  },
]

/**
 * NHS Agenda for Change bands. Only applied when the job looks clinical —
 * "band 5" in a non-clinical advert usually means something else entirely.
 */
export const NHS_BAND_PATTERN = /\bband\s*([2-9])\b/i

export const NHS_CONTEXT_PATTERN =
  /\b(nhs|nurse|nursing|healthcare|health care|clinical|ward|patient|hospital|trust|care assistant|hca|midwif|paramedic|therapist|mental health|support worker)\b/i

export function nhsBandToTier(band) {
  const n = Number(band)
  if (n >= 2 && n <= 4) return 'entry'
  if (n >= 5 && n <= 6) return 'mid'
  if (n >= 7) return 'senior'
  return null
}

/**
 * Years-of-experience fallback. Takes the LOWER bound of any range, because
 * "3-5 years" is a role open to someone with three.
 */
export const YEARS_EXPERIENCE_PATTERN =
  /(\d+)\s*\+?\s*(?:-\s*(\d+)\s*)?years?['’]?\s+(?:of\s+)?(?:relevant\s+|commercial\s+|professional\s+)?experience/i

export function yearsToTier(years) {
  if (years < 2) return 'entry'
  if (years < 5) return 'mid'
  return 'senior'
}

/**
 * Native seniority values from sources that provide one (Himalayas, The Muse,
 * Jobicy), mapped onto our tiers.
 */
// NOTE: Workable's "Mid-Senior level" is deliberately absent. It spans two of
// our tiers, so mapping it either way would be a coin flip — better to leave it
// unmapped and let the title rules decide.
export const NATIVE_SENIORITY_MAP = {
  'entry-level': 'entry',
  'entry level': 'entry',
  entry: 'entry',
  internship: 'entry',
  intern: 'entry',
  junior: 'entry',
  'mid-level': 'mid',
  mid: 'mid',
  'mid level': 'mid',
  associate: 'mid',
  senior: 'senior',
  'senior-level': 'senior',
  lead: 'senior',
  staff: 'senior',
  principal: 'senior',
  manager: 'senior',
  management: 'senior',
  director: 'executive',
  executive: 'executive',
  'c-level': 'executive',
}

/**
 * Noise stripped from a title before any rule runs.
 * Order matters: bracketed suffixes go before the location/pipe split, so
 * "Designer (m/w/d) - London" reduces cleanly to "designer".
 */
export const TITLE_NOISE_PATTERNS = [
  /\((?:m|w|f|d|x)(?:\s*\/\s*(?:m|w|f|d|x))+\)/gi,  // (m/w/d), (m/f/d), (m/w/x)
  /\b(?:job\s*)?(?:req|requisition|ref|id)[\s#:-]*\d{3,}\b/gi,
  /[[(]\s*(?:remote|hybrid|on[\s-]?site|full[\s-]?time|part[\s-]?time|contract|permanent|ftc)\s*[\])]/gi,
  /[[(]\s*[£$€]\s*[\d,.]+\s*(?:-\s*[£$€]?\s*[\d,.]+)?\s*(?:k|per annum|pa)?\s*[\])]/gi,
  /\b\d{4,}\b/g,                                     // stray req numbers
]
