-- ============================================================================
-- Public profiles: username slugs + anon-readable public_profiles view
-- ----------------------------------------------------------------------------
-- Adds the data layer for public, SEO-indexed profile pages at
-- ignite.education/{username}. Exposes ONLY public-safe fields (display name,
-- avatar, join date, lessons-completed count) to the anon role via a view —
-- never the raw public.users row.
-- ============================================================================

-- 1. New columns on public.users -------------------------------------------
--    username  : URL slug (unique). avatar_url: copied from auth metadata so
--    the anon client can read it (auth.users is not anon-readable).
--    is_public : opt-out flag (default true = profile is live + indexed).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_public  BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 2. Reserved top-level paths --------------------------------------------------
--    A username must never collide with a real top-level route, or the bare
--    /:username Vercel rewrite would shadow it. Kept in one function so the
--    trigger and any backfill share a single source of truth.
CREATE OR REPLACE FUNCTION public.is_reserved_username(slug TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT slug IS NULL OR slug = '' OR slug = ANY (ARRAY[
    'courses','blog','welcome','privacy','terms','release-notes',
    'sign-in','reset-password','auth','certificate','prompts','progress',
    'admin','office-hours','learning','api','sitemap','sitemap.xml',
    'robots.txt','ai.txt','_next','assets','index'
  ]);
$$;

-- 3. Slugify --------------------------------------------------------------------
--    lowercase -> runs of non-alphanumerics collapse to a single hyphen ->
--    trim leading/trailing hyphens. (No unaccent in v1: accented chars are
--    simply stripped, which is deterministic and avoids the extensions schema.)
CREATE OR REPLACE FUNCTION public.slugify(input TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT TRIM(BOTH '-' FROM
    regexp_replace(lower(COALESCE(input, '')), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- 4. Unique username generator -------------------------------------------------
--    Slugify "first last"; fall back to 'user' if empty; bump a -2/-3 suffix
--    while the candidate is reserved or already taken. The UNIQUE(username)
--    constraint remains the final safety net against concurrent-signup races.
CREATE OR REPLACE FUNCTION public.generate_username(p_first TEXT, p_last TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  base      TEXT;
  candidate TEXT;
  n         INT := 1;
BEGIN
  base := public.slugify(TRIM(COALESCE(p_first, '') || ' ' || COALESCE(p_last, '')));
  IF base IS NULL OR base = '' THEN
    base := 'user';
  END IF;

  candidate := base;
  LOOP
    IF public.is_reserved_username(candidate)
       OR EXISTS (SELECT 1 FROM public.users WHERE username = candidate) THEN
      n := n + 1;
      candidate := base || '-' || n;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 5. Public-safe view ----------------------------------------------------------
--    Anon reads this, never public.users. security_invoker stays OFF (the
--    default) so the view runs as its owner (postgres) and bypasses the strict
--    RLS on users + lesson_completions — anon never touches those tables and
--    needs no policy on them. The view itself enforces is_public + hand-picks
--    exactly the four safe columns. security_barrier blocks predicate push-down.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true) AS
SELECT
  u.username,
  TRIM(BOTH ' ' FROM (COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))) AS display_name,
  u.avatar_url,
  u.created_at AS joined_at,
  COALESCE(lc.lessons_completed, 0)::int AS lessons_completed
FROM public.users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS lessons_completed
  FROM public.lesson_completions
  GROUP BY user_id
) lc ON lc.user_id = u.id::text  -- lesson_completions.user_id is TEXT (and may hold non-UUID values like 'temp-user-id')
WHERE u.is_public = true
  AND u.username IS NOT NULL;

REVOKE ALL ON public.public_profiles FROM PUBLIC;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 6. Backfill usernames for existing rows --------------------------------------
--    Deterministic order keeps -2/-3 suffixes stable. (Avatar backfill needs
--    auth.users access and runs separately: scripts/backfill-profile-avatars.js)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, first_name, last_name FROM public.users
           WHERE username IS NULL ORDER BY created_at
  LOOP
    UPDATE public.users
       SET username = public.generate_username(r.first_name, r.last_name)
     WHERE id = r.id;
  END LOOP;
END $$;
