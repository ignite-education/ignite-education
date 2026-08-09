-- ============================================================================
-- Reserve the 'jobs' username for the job board route
-- ----------------------------------------------------------------------------
-- /jobs is served by the Next.js app via a vercel.json rewrite. The bare
-- /:username rewrite sits immediately before the catch-all, so a user holding
-- the username 'jobs' would shadow the entire board. This CREATE OR REPLACEs
-- public.is_reserved_username() with the existing list plus 'jobs'.
--
-- Keep in step with the RESERVED set in scripts/backfill-usernames.js.
--
-- Before applying, confirm nobody already holds it:
--   SELECT id, username FROM public.users WHERE username = 'jobs';
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_reserved_username(slug TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT slug IS NULL OR slug = '' OR slug = ANY (ARRAY[
    'courses','blog','welcome','privacy','terms','release-notes',
    'sign-in','reset-password','auth','certificate','prompts','progress',
    'admin','office-hours','learning','api','sitemap','sitemap.xml',
    'robots.txt','ai.txt','_next','assets','index','jobs'
  ]);
$$;
