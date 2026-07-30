-- Notifications feed for the Progress Hub bell
--
-- One row per notifiable event. Rows are either targeted at a single user
-- (audience = 'user', user_id set) or broadcast to everyone (audience = 'all',
-- user_id null). There is no fan-out: a published release note is ONE row, not
-- one row per learner.
--
-- Read state is NOT stored here. The Progress Hub keeps a last-seen timestamp in
-- localStorage and derives the unread count client-side, so a shared broadcast
-- row needs no per-user bookkeeping.
--
-- The `audience` column is deliberately redundant with `user_id IS NULL`:
-- Supabase Realtime postgres_changes filters only support eq/neq/lt/lte/gt/gte/in
-- (there is no `is` operator), so a subscriber cannot filter on "user_id is null".
-- A CHECK constraint keeps the two columns in sync.

CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience     TEXT NOT NULL DEFAULT 'user' CHECK (audience IN ('user', 'all')),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The first four are trigger-generated; 'announcement' is published by hand
  -- from the admin portal. See add_announcement_notification_type.sql.
  type         TEXT NOT NULL CHECK (type IN (
                 'certificate', 'release_note', 'blog_post', 'office_hours',
                 'announcement'
               )),
  title        TEXT NOT NULL,
  body         TEXT,
  link_url     TEXT,
  course_id    TEXT,           -- when set, only shown to learners on that course
  -- Provenance, used for idempotency (see unique index below)
  source_table TEXT,
  source_id    UUID,
  -- Ephemeral notifications (a live office hours session) self-retire
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notifications_audience_target CHECK (
    (audience = 'user' AND user_id IS NOT NULL) OR
    (audience = 'all'  AND user_id IS NULL)
  )
);

-- Personal feed: newest-first per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC)
  WHERE audience = 'user';

-- Broadcast feed: newest-first
CREATE INDEX IF NOT EXISTS idx_notifications_global_created
  ON public.notifications (created_at DESC)
  WHERE audience = 'all';

-- Idempotency: a trigger that re-fires (re-publish, upsert, re-run of a seed
-- script) cannot create a second notification for the same source row + type.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_source_unique
  ON public.notifications (source_table, source_id, type)
  WHERE source_id IS NOT NULL;

-- RLS: a signed-in user sees their own notifications plus every broadcast.
-- This same predicate is what Realtime evaluates per-subscriber, so it also
-- governs which INSERTs are pushed down the websocket.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own and broadcast notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (audience = 'all' OR user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies. Rows are written exclusively by the
-- SECURITY DEFINER triggers in create_notification_triggers.sql and by the
-- service role (which bypasses RLS). Absence of a policy is the deny.

-- Enable Supabase Realtime on this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Retention. Called nightly from server.js.
-- SET search_path is required on SECURITY DEFINER functions, otherwise
-- Supabase's linter flags function_search_path_mutable.
CREATE OR REPLACE FUNCTION public.prune_notifications()
RETURNS integer AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
     OR (expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
