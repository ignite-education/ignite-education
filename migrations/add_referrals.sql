-- Referrals: a free week of Ignite Insider for both sides of a profile signup
--
-- When someone creates an account from a public profile page
-- (ignite.education/{username}), the new user gets a week of Insider
-- immediately and the profile owner earns a week once that new user completes
-- their first lesson.
--
-- Two tables, deliberately separate:
--   referrals      -- who invited whom, and whether it qualified. The audit log.
--   insider_grants -- the entitlement itself. A row with expires_at in the
--                     future IS the membership.
--
-- The grant deliberately does NOT live in auth.users.raw_user_meta_data,
-- unlike the Stripe flag `is_ad_free`. Two reasons:
--   1. Any signed-in user can write their own user_metadata
--      (supabase.auth.updateUser({ data })), so a grant stored there would be
--      forgeable from the browser console.
--   2. The checkout.session.completed handler in server.js rewrites that
--      object; a grant kept out of it cannot be clobbered.
--
-- Nothing evaluates expiry on a schedule. `expires_at > NOW()` is checked at
-- read time (resolveInsider() in server.js, AuthContext on the client), so the
-- week self-expires: no cron to forget to run, and a stale JWT cannot keep a
-- lapsed week alive.
--
-- Run add_public_profiles.sql and create_notifications_table.sql first.

-- ============================================================================
-- 1. REFERRALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- One referral per referee, for life. This unique constraint is the whole
  -- idempotency story: /api/referrals/claim is called from both the OAuth
  -- callback and the in-page Google One Tap path, and only one row survives.
  referee_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Snapshot of the slug that was actually clicked. users.username is unique
  -- but not immutable, so don't rely on joining back to it later.
  referrer_username TEXT NOT NULL,
  -- pending   : referee has their week; the referrer has not earned theirs yet
  -- qualified : referee completed a lesson; the referrer's week was granted
  -- capped    : qualified, but the referrer was over their rolling cap
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'qualified', 'capped')),
  qualified_at      TIMESTAMPTZ,
  -- Claim-time IP, used only for the burst throttle in /api/referrals/claim
  claim_ip          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT referrals_no_self CHECK (referrer_id <> referee_id)
);

-- Referrer's own list, newest first (powers GET /api/referrals/me)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON public.referrals (referrer_id, created_at DESC);

-- The qualification trigger's lookup. Partial, because it only ever probes for
-- pending rows and this keeps the index tiny on the lesson-completion hot path.
CREATE INDEX IF NOT EXISTS idx_referrals_pending_referee
  ON public.referrals (referee_id) WHERE status = 'pending';

-- Burst throttle lookup
CREATE INDEX IF NOT EXISTS idx_referrals_claim_ip
  ON public.referrals (claim_ip, created_at DESC) WHERE claim_ip IS NOT NULL;

-- ============================================================================
-- 2. INSIDER GRANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.insider_grants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'comp' is the manual-grant primitive: previously this was done by editing
  -- user_metadata with one-off scripts at the repo root.
  source      TEXT NOT NULL
              CHECK (source IN ('referral_referee', 'referral_referrer', 'comp')),
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  -- starts_at is not always NOW(): a second referral stacks onto the end of the
  -- first rather than overlapping it, so two invites really are two weeks.
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT insider_grants_window CHECK (expires_at > starts_at)
);

-- The only query shape that matters: "does this user have a live grant?"
CREATE INDEX IF NOT EXISTS idx_insider_grants_active
  ON public.insider_grants (user_id, expires_at DESC);

-- Idempotency: a referral can mint at most one grant per side, so a retried
-- claim or a re-fired trigger is a no-op rather than a second free week.
CREATE UNIQUE INDEX IF NOT EXISTS idx_insider_grants_referral_role
  ON public.insider_grants (referral_id, source) WHERE referral_id IS NOT NULL;

-- ============================================================================
-- 3. RLS
-- ============================================================================
-- SELECT only, own rows. No INSERT / UPDATE / DELETE policies: rows are written
-- exclusively by the service role (server.js) and the SECURITY DEFINER trigger
-- below. Absence of a policy is the deny. Same shape as public.notifications.
ALTER TABLE public.referrals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read referrals they are part of" ON public.referrals;
CREATE POLICY "Users can read referrals they are part of"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own insider grants" ON public.insider_grants;
CREATE POLICY "Users can read own insider grants"
  ON public.insider_grants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. NOTIFICATION TYPE
-- ============================================================================
-- Widen the type CHECK before the trigger below can insert one. Kept in this
-- file (rather than a separate migration) because the trigger depends on it.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'certificate', 'release_note', 'blog_post', 'office_hours',
    'announcement', 'referral'
  ));

-- ============================================================================
-- 5. QUALIFICATION TRIGGER
-- ============================================================================
-- The referrer's week unlocks when their referee completes their FIRST lesson,
-- not at signup. Gating on real activity is what makes throwaway-account
-- farming cost something.
--
-- A trigger rather than app code because lesson_completions is written straight
-- from the browser (src/lib/api.js markLessonComplete) with no server hop --
-- the same reasoning as create_notification_triggers.sql. SECURITY DEFINER is
-- required: PostgREST executes as `authenticated`, and neither referrals,
-- insider_grants nor notifications has an INSERT policy for that role.
--
-- markLessonComplete() uses upsert(), which emits ON CONFLICT DO UPDATE against
-- UNIQUE(user_id, course_id, module_number, lesson_number). AFTER INSERT
-- therefore fires only for genuinely new completions, never on a re-save.
CREATE OR REPLACE FUNCTION public.qualify_referral_on_lesson()
RETURNS TRIGGER AS $$
DECLARE
  -- Rolling cap on credited referrals per referrer. Duplicated as
  -- REFERRAL_MONTHLY_CAP in server.js (Postgres can't read the app env);
  -- change both together.
  v_cap        INT := 10;
  v_ref        public.referrals%ROWTYPE;
  v_used       INT;
  v_stack_from TIMESTAMPTZ;
BEGIN
  -- Index probe on idx_referrals_pending_referee. Returns nothing for almost
  -- every completion, so this costs effectively zero on the hot path.
  --
  -- Cast both sides: lesson_completions.user_id is UUID in staging_schema.sql
  -- but TEXT in production, where it may hold non-UUID values like
  -- 'temp-user-id' (see the ::text cast in add_public_profiles.sql).
  SELECT * INTO v_ref
    FROM public.referrals
   WHERE referee_id::text = NEW.user_id::text
     AND status = 'pending'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_used
    FROM public.referrals
   WHERE referrer_id = v_ref.referrer_id
     AND status = 'qualified'
     AND qualified_at > NOW() - INTERVAL '30 days';

  IF v_used >= v_cap THEN
    UPDATE public.referrals
       SET status = 'capped', qualified_at = NOW()
     WHERE id = v_ref.id;
    RETURN NEW;
  END IF;

  UPDATE public.referrals
     SET status = 'qualified', qualified_at = NOW()
   WHERE id = v_ref.id;

  -- Stack onto the end of any live grant rather than overlapping it. A referrer
  -- who is already a paying subscriber gets the grant too -- it sits unused
  -- while they pay and materialises if they ever cancel.
  SELECT GREATEST(NOW(), COALESCE(MAX(expires_at), NOW())) INTO v_stack_from
    FROM public.insider_grants
   WHERE user_id = v_ref.referrer_id
     AND expires_at > NOW();

  INSERT INTO public.insider_grants
    (user_id, source, referral_id, starts_at, expires_at, note)
  VALUES (
    v_ref.referrer_id, 'referral_referrer', v_ref.id,
    v_stack_from, v_stack_from + INTERVAL '7 days',
    'Referral qualified'
  )
  ON CONFLICT DO NOTHING;

  -- The referrer's reward moment. source_id makes it idempotent against
  -- idx_notifications_source_unique.
  INSERT INTO public.notifications
    (audience, user_id, type, title, body, link_url, source_table, source_id)
  VALUES (
    'user', v_ref.referrer_id, 'referral',
    'Someone you invited just started learning',
    'Your free week of Ignite Insider is now active.',
    '/progress',
    'referrals', v_ref.id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_qualify_referral_on_lesson ON public.lesson_completions;
CREATE TRIGGER trg_qualify_referral_on_lesson
  AFTER INSERT ON public.lesson_completions
  FOR EACH ROW EXECUTE FUNCTION public.qualify_referral_on_lesson();

-- ============================================================================
COMMENT ON TABLE public.referrals IS
  'Profile-page signup attributions. One row per referee, for life.';
COMMENT ON TABLE public.insider_grants IS
  'Time-limited Ignite Insider entitlement. A row with expires_at > NOW() grants access. Written only by the service role and qualify_referral_on_lesson(). Deliberately not stored in user_metadata, which users can write themselves.';
