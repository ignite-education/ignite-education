-- ============================================================================
-- Job Board — configuration seed
-- ----------------------------------------------------------------------------
-- Apply AFTER create_job_board_tables.sql. Idempotent (ON CONFLICT DO NOTHING /
-- DO UPDATE), so it is safe to re-run.
--
-- ATS company accounts are seeded separately by
-- seed_job_board_ats_accounts.sql — that list is curated and changes often.
-- ============================================================================


-- ============================================================================
-- Markets
-- ----------------------------------------------------------------------------
-- location_matchers are JavaScript regex sources, tested case-insensitively
-- against an ATS job's raw location string to decide whether a global company's
-- posting belongs to this market.
-- ============================================================================
INSERT INTO public.job_markets (code, name, currency, locale, source_params, location_matchers, enabled)
VALUES (
  'gb',
  'United Kingdom',
  'GBP',
  'en-GB',
  '{"adzuna":{"country":"gb"},"reed":{}}'::jsonb,
  ARRAY[
    'united kingdom', '\buk\b', '\bg\.?b\.?\b', '\bengland\b', '\bscotland\b',
    '\bwales\b', 'northern ireland', '\bbritain\b',
    '\blondon\b', '\bmanchester\b', '\bbirmingham\b', '\bleeds\b', '\bglasgow\b',
    '\bedinburgh\b', '\bbristol\b', '\bcardiff\b', '\bbelfast\b', '\bliverpool\b',
    '\bsheffield\b', '\bnewcastle\b', '\bnottingham\b', '\bcambridge\b',
    '\boxford\b', '\breading\b', '\bbrighton\b', '\bmilton keynes\b', '\bleicester\b'
  ],
  true
)
ON CONFLICT (code) DO UPDATE
  SET location_matchers = EXCLUDED.location_matchers,
      source_params     = EXCLUDED.source_params,
      enabled           = EXCLUDED.enabled;


-- ============================================================================
-- Sources
-- ----------------------------------------------------------------------------
-- ATS feeds seed enabled + trust_level='auto': they are unauthenticated public
-- endpoints returning full descriptions from direct employers, with no agency
-- spam and no attribution burden. They are the quality tier, so they bypass the
-- approval queue.
--
-- Aggregators seed DISABLED and trust_level='review'. Enable them only once
-- their API keys are set and the queue UI exists to review what they bring in.
--
-- NOT seeded, deliberately:
--   linkedin / indeed — no readable API exists at any price; scraping is
--     forbidden by both. Anything sourced from them via a scraping vendor
--     inherits the same ToS problem.
--   remotive       — its terms forbid using its listings to collect signups,
--     which is a direct conflict with our sign-in-to-apply gate.
--   jobicy         — forbids redistribution to competing aggregators.
-- ============================================================================
INSERT INTO public.job_sources
  (key, name, kind, enabled, trust_level,
   rate_per_minute, rate_per_day, rate_per_week, rate_per_month,
   min_delay_ms, max_age_days, attribution, notes)
VALUES

  -- --- ATS feeds: no keys, full descriptions, direct employers --------------
  ('greenhouse', 'Greenhouse', 'ats', true, 'auto',
   null, null, null, null, 300, 45, '{"required":false}'::jsonb,
   'https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true — no auth, no published rate limit.'),

  ('lever', 'Lever', 'ats', true, 'auto',
   null, null, null, null, 300, 45, '{"required":false}'::jsonb,
   'https://api.lever.co/v0/postings/{site}?mode=json — EU accounts use api.eu.lever.co.'),

  ('ashby', 'Ashby', 'ats', true, 'auto',
   null, null, null, null, 300, 45, '{"required":false}'::jsonb,
   'https://api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true — no auth, no filtering.'),

  ('workable', 'Workable', 'ats', true, 'auto',
   null, null, null, null, 300, 45, '{"required":false}'::jsonb,
   'https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true — the public embed-widget endpoint.'),

  -- --- Aggregators: disabled until keys exist and the queue is built --------
  -- Adzuna ToS rate limits are hard: 25/min, 250/day, 1000/week, 2500/month.
  -- budget.js enforces these from job_ingest_runs.api_calls, because Render's
  -- free plan spins down and an in-process counter cannot survive a restart.
  ('adzuna', 'Adzuna', 'aggregator', false, 'review',
   25, 250, 1000, 2500, 2500, 30,
   '{"required":true,
     "label":"Jobs by Adzuna",
     "logoUrl":"https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/adzuna-jobs-by.png",
     "logoMinWidth":116,
     "logoMinHeight":23,
     "linkUrl":"https://www.adzuna.co.uk",
     "perAdvert":true,
     "salaryEstimate":{
       "iconUrl":"https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/adzuna-jobsworth.png",
       "minSize":20,
       "title":"Salary estimate powered by Adzuna Jobsworth"
     },
     "forbidsDerivedStats":true}'::jsonb,
   'Free self-service key. Operates DWP Find a Job, so deepest UK inventory. Descriptions are SNIPPETS only. Attribution logo is mandatory at >=116x23px on EVERY advert; non-compliance means suspension. forbidsDerivedStats: no job counts or average-salary widgets over Adzuna rows without written consent.'),

  ('reed', 'Reed.co.uk', 'aggregator', false, 'review',
   null, null, null, null, 500, 30,
   '{"required":true,
     "label":"Powered by reed.co.uk",
     "linkUrl":"https://www.reed.co.uk",
     "perAdvert":true}'::jsonb,
   'UK only. HTTP Basic, API key as username with a blank password. Key needs a recruiter account plus contacting Reed — not self-serve. Its `graduate` boolean is the best native entry-level signal available for the UK.'),

  ('himalayas', 'Himalayas', 'board', false, 'review',
   null, null, null, null, 1000, 30,
   '{"required":true,
     "label":"Originally posted on Himalayas",
     "linkUrl":"https://himalayas.app",
     "perAdvert":true}'::jsonb,
   'Remote roles. Free, no key. limit silently caps at 20 per request. One of the few sources with a NATIVE seniority field, plus locationRestrictions for filtering to UK-eligible roles.')

ON CONFLICT (key) DO UPDATE
  SET name            = EXCLUDED.name,
      kind            = EXCLUDED.kind,
      rate_per_minute = EXCLUDED.rate_per_minute,
      rate_per_day    = EXCLUDED.rate_per_day,
      rate_per_week   = EXCLUDED.rate_per_week,
      rate_per_month  = EXCLUDED.rate_per_month,
      min_delay_ms    = EXCLUDED.min_delay_ms,
      max_age_days    = EXCLUDED.max_age_days,
      attribution     = EXCLUDED.attribution,
      notes           = EXCLUDED.notes,
      updated_at      = NOW();
      -- Deliberately NOT overwriting `enabled` or `trust_level`: those are
      -- operational state an admin sets in the UI, and re-running the seed
      -- must not silently re-disable a source that is live.


-- ============================================================================
-- Adzuna queries — one 'core' + one 'graduate' row per specialism
-- ----------------------------------------------------------------------------
-- Budget arithmetic, since Adzuna's monthly cap is the real ceiling:
--   8 specialisms x 2 queries x 2 pages = 32 calls/day
--   ToS allows 250/day but only 2500/month (~83/day)
-- One market fits comfortably. Three would not — which is exactly why pages and
-- queries are per-market rows rather than a global constant.
--
-- title_only + max_days_old=1 is what turns Adzuna's ~2,000 UK jobs/day into
-- tens of queue rows. Do not widen these without watching job_ingest_runs.
--
-- The 'graduate' rows use category=graduate-jobs, which doubles as an
-- entry-level seniority signal in server/jobs/lib/seniority.js.
-- ============================================================================
INSERT INTO public.job_queries (source, market, profession, label, params, max_pages, enabled)
VALUES
  ('adzuna','gb','UX Designer','core',
   '{"title_only":"ux designer product designer ui designer user experience","category":"creative-design-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','UX Designer','graduate',
   '{"title_only":"junior ux designer graduate designer","category":"graduate-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  ('adzuna','gb','Data Analyst','core',
   '{"title_only":"data analyst business intelligence analyst insight analyst","category":"it-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Data Analyst','graduate',
   '{"title_only":"graduate data analyst junior data analyst","category":"graduate-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  ('adzuna','gb','Cyber Security Analyst','core',
   '{"title_only":"cyber security analyst information security analyst soc analyst","category":"it-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Cyber Security Analyst','graduate',
   '{"title_only":"graduate cyber security junior security analyst","category":"graduate-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  ('adzuna','gb','Product Manager','core',
   '{"title_only":"product manager product owner associate product manager","category":"it-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Product Manager','graduate',
   '{"title_only":"graduate product manager junior product manager","category":"graduate-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  ('adzuna','gb','Digital Marketing Specialist','core',
   '{"title_only":"digital marketing executive digital marketing specialist seo specialist ppc executive","category":"pr-advertising-marketing-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Digital Marketing Specialist','graduate',
   '{"title_only":"graduate marketing executive junior digital marketing","category":"graduate-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  -- The three below have essentially no ATS presence (NHS and trades roles),
  -- so Adzuna is their ONLY source of inventory.
  ('adzuna','gb','Healthcare Assistant','core',
   '{"title_only":"healthcare assistant care assistant support worker hca","category":"healthcare-nursing-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Healthcare Assistant','graduate',
   '{"title_only":"trainee healthcare assistant apprentice healthcare","category":"healthcare-nursing-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  ('adzuna','gb','Mental Health Worker','core',
   '{"title_only":"mental health support worker mental health practitioner recovery worker","category":"healthcare-nursing-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Mental Health Worker','graduate',
   '{"title_only":"trainee mental health worker assistant psychologist","category":"healthcare-nursing-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true),

  ('adzuna','gb','Green Energy Technician','core',
   '{"title_only":"solar installer heat pump engineer wind turbine technician renewable energy technician ev charging engineer","category":"engineering-jobs","max_days_old":1,"results_per_page":50,"sort_by":"date"}'::jsonb, 2, true),
  ('adzuna','gb','Green Energy Technician','graduate',
   '{"title_only":"trainee solar installer apprentice heat pump renewable energy apprentice","category":"engineering-jobs","max_days_old":3,"results_per_page":50,"sort_by":"date"}'::jsonb, 1, true)

ON CONFLICT (source, market, profession, label) DO UPDATE
  SET params    = EXCLUDED.params,
      max_pages = EXCLUDED.max_pages;
