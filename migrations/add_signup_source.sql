-- Where a user created their account.
--
-- Every sign-up funnels through the same two Supabase calls (signUp /
-- signInWithOAuth / signInWithIdToken), and until now nothing recorded which
-- surface the person was on. The admin user list could show *when* someone
-- joined but not *why* — a job listing, a course page, the welcome page's
-- "request a course" box, a public profile, the prompts library, or the plain
-- sign-in page.
--
-- Values are free text so a new surface needs no migration; the allowlist and
-- the human labels live in code:
--   next-app/src/lib/signupSource.ts   (what each entry point sends)
--   admin-app/src/lib/signupSource.js  (how the admin portal labels it)
--
-- Current values: jobs, course_page, course_request, profile, prompts,
-- sign_in_page, app. NULL means "before this existed" (or a path that slipped
-- through) — the admin portal renders that as "Unknown".
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_source TEXT;

-- Write-once, and only inside the sign-up window.
--
-- Why an RPC rather than letting each entry point UPDATE the column:
--   1. The row is created by whichever of five code paths gets there first
--      (the auth.users trigger, the OAuth callback, enroll.ts, EnrollmentCTA,
--      the Vite AuthContext). Threading a column through all of them is how
--      `username` ended up NULL for months. One call that runs *after* sign-in
--      and does not care who inserted the row is sturdier.
--   2. Google One Tap never navigates, so /auth/callback never runs for it.
--      The page has to record the source itself, from the browser.
--   3. The window check reads auth.users.created_at, the authoritative sign-up
--      time, which the anon/authenticated roles cannot see. SECURITY DEFINER
--      is what lets us consult it. A returning user clicking "sign in" on the
--      jobs page a year later must not get re-labelled as a jobs sign-up.
--
-- Mirrors REFERRAL_SIGNUP_WINDOW_MINUTES in server.js (the referral claim
-- uses the same idea of "is this account brand new").
CREATE OR REPLACE FUNCTION public.record_signup_source(p_source TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_created_at TIMESTAMPTZ;
  v_source     TEXT := NULLIF(TRIM(p_source), '');
BEGIN
  IF v_uid IS NULL OR v_source IS NULL OR LENGTH(v_source) > 40 THEN
    RETURN FALSE;
  END IF;

  SELECT created_at INTO v_created_at FROM auth.users WHERE id = v_uid;
  IF v_created_at IS NULL OR v_created_at < NOW() - INTERVAL '30 minutes' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.users
     SET signup_source = v_source
   WHERE id = v_uid
     AND signup_source IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.record_signup_source(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_signup_source(TEXT) TO authenticated;
