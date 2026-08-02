-- ============================================================================
-- Fix: public profile never activates at signup (username stayed NULL)
-- ----------------------------------------------------------------------------
-- Symptom: every user who signed up after add_public_profiles.sql was applied
-- had public.users.username = NULL, so they were filtered out of the
-- public_profiles view (WHERE username IS NOT NULL) and ignite.education/{slug}
-- 404'd. Same for avatar_url.
--
-- Why: username generation only lived in public.handle_new_user() (the
-- AFTER INSERT ON auth.users trigger), and that function's updated definition
-- was never applied to production. Worse, three app code paths insert into
-- public.users directly, bypassing that trigger entirely and never passing a
-- username at all:
--   - src/components/ProtectedRoute.jsx
--   - next-app/src/lib/enroll.ts
--   - next-app/src/app/courses/[courseSlug]/EnrollmentCTA.tsx
--
-- Fix: move the guarantee down to public.users itself with a BEFORE INSERT
-- trigger, so a row physically cannot land without a username regardless of
-- which path created it. handle_new_user() keeps setting them too — that's now
-- belt-and-braces rather than the only line of defence.
--
-- Depends on the helpers from migrations/add_public_profiles.sql
-- (slugify, is_reserved_username, generate_username).
-- ============================================================================

-- 1. Fill username + avatar_url on any insert that omits them -----------------
--    SECURITY DEFINER so it can read auth.users (the only place the OAuth
--    avatar lives, and not readable by the anon/authenticated roles doing the
--    inserts). search_path is pinned because SECURITY DEFINER functions must
--    never resolve names against the caller's path.
CREATE OR REPLACE FUNCTION public.ensure_public_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  meta JSONB;
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := public.generate_username(NEW.first_name, NEW.last_name);
  END IF;

  IF NEW.avatar_url IS NULL THEN
    SELECT au.raw_user_meta_data INTO meta FROM auth.users au WHERE au.id = NEW.id;
    NEW.avatar_url := COALESCE(
      meta->>'custom_avatar_url',
      meta->>'avatar_url',
      meta->>'picture'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_public_profile_fields_on_insert ON public.users;
CREATE TRIGGER ensure_public_profile_fields_on_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_public_profile_fields();

-- 2. Upgrade placeholder slugs once a real name arrives -----------------------
--    Email/password signups create the row before onboarding collects a name,
--    so generate_username('', '') yields the 'user' / 'user-2' fallback. When
--    the name is filled in later, re-slug — but ONLY from that placeholder
--    base, so a username that already reflects a real name stays stable (it is
--    a public URL).
CREATE OR REPLACE FUNCTION public.upgrade_placeholder_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.username IS NULL OR NEW.username ~ '^user(-[0-9]+)?$')
     AND TRIM(COALESCE(NEW.first_name, '') || COALESCE(NEW.last_name, '')) <> ''
  THEN
    NEW.username := public.generate_username(NEW.first_name, NEW.last_name);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS upgrade_placeholder_username_on_update ON public.users;
CREATE TRIGGER upgrade_placeholder_username_on_update
  BEFORE UPDATE OF first_name, last_name ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.upgrade_placeholder_username();

-- 3. Backfill the users stranded without a username ---------------------------
--    Deterministic order so the -2/-3 suffixes stay stable. Idempotent: reruns
--    are a no-op once every row has a slug.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, first_name, last_name FROM public.users
           WHERE username IS NULL OR username = '' ORDER BY created_at
  LOOP
    UPDATE public.users
       SET username = public.generate_username(r.first_name, r.last_name)
     WHERE id = r.id;
  END LOOP;
END $$;

-- Avatars for those same users come from auth.users, which plain SQL here can
-- read but the one-off script already handles consistently:
--   node scripts/backfill-profile-avatars.js
