/**
 * Profession mapping rules.
 *
 * Keys MUST match `courses.title` exactly for rows where course_type =
 * 'specialism' — that is the board's taxonomy, shared with /prompts, and there
 * is no separate professions table to invent.
 *
 * No two job sources agree on a category taxonomy — aggregators publish a fixed
 * tag list, Reed has none at all, and ATS "departments" are per-company and not
 * comparable. So each source's native category is mapped INTO our list here,
 * with a title/keyword fallback.
 *
 * `exactCategories` (whole-string match against a closed vocabulary) is empty on
 * every rule since the Adzuna adapter was removed; `sourceCategories` (regexes
 * against free text) is what the ATS sources use. The Adzuna tag mappings are
 * recoverable from git history if an aggregator is ever added back.
 *
 * A job that scores below THRESHOLD maps to nothing and is dropped at ingest —
 * it never reaches the approval queue. Keeping irrelevant jobs out of the queue
 * is what keeps the queue reviewable in minutes.
 */

/**
 * Scoring weights.
 *
 * Tuned against live Greenhouse/Lever/Ashby/Workable data. Two rules matter
 * more than the numbers:
 *
 *  1. A profession needs TITLE evidence. Category plus description keywords can
 *     never map a job on their own — company boilerplate mentions SQL and
 *     dashboards on every advert, which is how "Engineering Manager" first
 *     classified as a Data Analyst.
 *  2. A weak title ("Analyst", "Designer") cannot clear the bar by itself; it
 *     needs a category match too.
 *
 * So: strong title alone passes (5). Weak title + keywords does not (2+2=4).
 * Weak title + category does (2+3=5).
 */
export const SCORE = {
  queryProfession: 3, // the aggregator query that found it was scoped to this profession
  category: 3, // the source's own category matched
  titleInclude: 5, // an unambiguous title match — the strongest single signal
  titleWeak: 2, // a generic title like "Analyst"; real evidence, not sufficient alone
  keyword: 1, // a supporting keyword in the description (capped at 2)
  keywordCap: 2,
  threshold: 5, // below this, drop
}

export const PROFESSION_RULES = {
  'UX Designer': {
    sourceCategories: [/design/i, /user experience/i, /product design/i],
    titleInclude: [
      /\bux\b/i, /\bui\b/i, /\bux\/ui\b/i, /user experience/i, /user interface/i,
      /product design(er)?/i, /interaction design(er)?/i, /service design(er)?/i,
      /\bux research(er)?\b/i, /visual design(er)?/i,
    ],
    // A generic "Designer" is only ours with supporting evidence.
    titleWeak: [/\bdesigner\b/i],
    // Graphic/print/fashion design and design *engineering* are adjacent but not ours.
    titleExclude: [/\b(graphic|print|fashion|textile|interior|industrial|motion|game|packaging|cad|floral)\b/i, /\bdesign engineer\b/i, /\bhairdress/i],
    keywordBoost: [/figma/i, /wireframe/i, /usability/i, /design system/i, /prototyp/i, /user research/i, /accessib/i],
  },

  'Data Analyst': {
    sourceCategories: [/data/i, /analytics/i, /business intelligence/i],
    titleInclude: [
      /\bdata analyst\b/i, /\bbusiness intelligence\b/i, /\bbi analyst\b/i,
      /\binsight(s)? analyst\b/i, /\breporting analyst\b/i, /\bdata scientist\b/i,
      /\banalytics (analyst|engineer|manager)\b/i, /\bmi analyst\b/i,
    ],
    titleWeak: [/\banalyst\b/i],
    // "Analyst" is the most over-loaded title in the market. These are all
    // real analyst roles that are emphatically not data analytics.
    titleExclude: [/\b(credit|finance|financial|risk|compliance|aml|fraud|policy|pricing|actuarial|procurement|treasury|hr|people|legal|planning|quantity|security|cyber|soc|systems|network|test|qa)\b/i, /\b(data|analytics|machine learning|ml|software|platform|backend|devops)\s+engineer\b/i, /\bmachine learning\b/i, /\bresearch scientist\b/i],
    keywordBoost: [/\bsql\b/i, /power ?bi/i, /tableau/i, /looker/i, /\bpython\b/i, /dashboard/i, /\betl\b/i, /data warehouse/i],
  },

  'Cyber Security Analyst': {
    sourceCategories: [/security/i, /cyber/i, /infosec/i],
    titleInclude: [
      /cyber ?security/i, /information security/i, /\binfosec\b/i,
      /\bsoc analyst\b/i, /security (analyst|engineer|operations|consultant)/i,
      /penetration test/i, /\bpen test/i, /threat (intel|analyst|hunt)/i,
      /security operations centre/i,
    ],
    titleWeak: [],
    titleExclude: [/\b(physical|door|fire|guard|officer on site)\b/i, /\bsecurity (guard|officer|steward)\b/i],
    keywordBoost: [/\bsiem\b/i, /vulnerabilit/i, /\bsoc\b/i, /incident response/i, /\biso ?27001\b/i, /firewall/i, /malware/i, /\bnist\b/i],
  },

  'Product Manager': {
    sourceCategories: [/product/i],
    titleInclude: [
      /\bproduct manager\b/i, /\bproduct owner\b/i, /\bproduct lead\b/i,
      /\bproduct director\b/i, /\bhead of product\b/i, /\bproduct analyst\b/i,
      /\btechnical product manager\b/i, /\bgroup product manager\b/i,
    ],
    titleWeak: [],
    // Production, product *marketing* and physical-product roles are not ours.
    titleExclude: [/\bproduct(ion)? (operative|assistant|technician)\b/i, /\bproduct marketing\b/i, /\bproduction manager\b/i],
    keywordBoost: [/roadmap/i, /stakeholder/i, /\bagile\b/i, /\bscrum\b/i, /discovery/i, /backlog/i, /user stor/i],
  },

  'Digital Marketing Specialist': {
    sourceCategories: [/marketing/i, /growth/i, /advertis/i],
    titleInclude: [
      /digital marketing/i, /\bseo\b/i, /\bppc\b/i, /\bsem\b/i,
      /paid (search|social|media)/i, /content marketing/i, /social media (manager|executive|specialist)/i,
      /growth marketing/i, /marketing (executive|specialist|manager|coordinator)/i,
      /crm (executive|manager|specialist)/i, /email marketing/i, /performance marketing/i,
    ],
    titleWeak: [/\bmarketing\b/i],
    // Product marketing sits with product, not digital marketing.
    titleExclude: [/\b(field|telesales|door to door|events? (assistant|coordinator))\b/i, /\bmarket research\b/i, /\bproduct marketing\b/i, /\bbrand ambassador\b/i],
    keywordBoost: [/google ads/i, /google analytics/i, /\bga4\b/i, /hubspot/i, /mailchimp/i, /conversion rate/i, /\bcpc\b/i, /\broas\b/i],
  },

  'Healthcare Assistant': {
    sourceCategories: [/health/i, /care/i, /nursing/i],
    titleInclude: [
      /healthcare assistant/i, /health care assistant/i, /\bhca\b/i,
      /care assistant/i, /\bcarer\b/i, /support worker/i, /care worker/i,
      /nursing assistant/i, /clinical support worker/i, /domiciliary care/i,
      /\bhealthcare support worker\b/i,
    ],
    titleWeak: [],
    // Excludes mental-health-specific roles, which belong to the sibling
    // specialism below — see MUTUALLY_EXCLUSIVE.
    // Mental-health-specific roles belong to the sibling specialism; registered
    // clinicians are a different level of qualification entirely.
    titleExclude: [/\bmental health\b/i, /\b(registered|staff|specialist) nurse\b/i, /\b(doctor|consultant|surgeon|pharmacist|physiotherapist|radiograph|dentist|midwife)\b/i, /\bveterinar/i],
    keywordBoost: [/\bnhs\b/i, /patient/i, /\bward\b/i, /care home/i, /residential care/i, /personal care/i, /\bcqc\b/i],
  },

  'Mental Health Worker': {
    sourceCategories: [/mental health/i, /wellbeing/i, /psycholog/i],
    titleInclude: [
      /mental health (worker|support|practitioner|nurse|assistant)/i,
      /\brecovery worker\b/i, /\bsubstance misuse\b/i, /assistant psychologist/i,
      /psychological wellbeing practitioner/i, /\bpwp\b/i, /counsellor/i,
      /\bcamhs\b/i, /wellbeing practitioner/i, /support time recovery/i,
    ],
    titleWeak: [],
    titleExclude: [/\bveterinar/i, /\banimal\b/i],
    keywordBoost: [/mental health/i, /\bcamhs\b/i, /safeguard/i, /\bcbt\b/i, /therapeutic/i, /crisis team/i, /\bsection 136\b/i],
  },

  'Green Energy Technician': {
    sourceCategories: [/energy/i, /renewable/i, /sustainab/i],
    titleInclude: [
      /solar (installer|engineer|technician|pv)/i, /\bsolar pv\b/i,
      /heat pump/i, /\bashp\b/i, /\bgshp\b/i,
      /wind turbine/i, /renewable energy/i, /\bev charg/i,
      /retrofit (assessor|coordinator|installer)/i, /energy assessor/i,
      /battery storage/i, /green energy/i, /sustainability technician/i,
    ],
    titleWeak: [],
    // Sales and desk roles at renewable-energy firms are not technician jobs.
    titleExclude: [/\b(sales|account|business development|telesales|marketing|recruit)\b/i, /\bgas (safe )?engineer\b/i],
    keywordBoost: [/photovoltaic/i, /\bmcs\b/i, /net zero/i, /decarbonis/i, /insulation/i, /\bnvq\b/i, /\bepc\b/i, /renewable/i],
  },
}

/**
 * Sibling professions that share a category and would otherwise both score.
 * When both are candidates, the one whose titleInclude matched wins; a genuine
 * tie is ambiguous and drops.
 */
export const MUTUALLY_EXCLUSIVE = [['Healthcare Assistant', 'Mental Health Worker']]
