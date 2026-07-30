-- Triggers that populate public.notifications
-- Run create_notifications_table.sql first.
--
-- Every writer of a notifiable event uses a different Supabase key:
--   certificates, office_hours_sessions -> service role (server.js)
--   release_notes, blog_posts           -> anon key    (admin-app browser client)
-- A trigger is the only single place that catches all of them, and it runs in
-- the same transaction as the source write, so notifications cannot drift.
--
-- SECURITY DEFINER is required: PostgREST executes as `authenticated`, and
-- notifications has no INSERT policy for that role.
--
-- Every insert is ON CONFLICT DO NOTHING against idx_notifications_source_unique,
-- so re-publishing, upserting, or re-running a seed script is a no-op.

-- Certificate issued -> notify that learner
CREATE OR REPLACE FUNCTION public.notify_certificate_issued()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications
    (audience, user_id, type, title, body, link_url, course_id, source_table, source_id)
  VALUES (
    'user', NEW.user_id, 'certificate',
    'Your certificate is ready',
    format('You completed %s. Your certificate is available to download and share.', NEW.course_name),
    '/certificate/' || NEW.id,
    NEW.course_id, 'certificates', NEW.id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_certificate_issued ON public.certificates;
CREATE TRIGGER trg_notify_certificate_issued
  AFTER INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.notify_certificate_issued();

-- Release note published -> notify everyone
-- Fires on the draft -> published transition, and on a row inserted already
-- published. Not on later edits of an already-published release.
CREATE OR REPLACE FUNCTION public.notify_release_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (audience, type, title, body, link_url, source_table, source_id)
  VALUES (
    'all', 'release_note',
    format('What''s new in %s', NEW.version),
    'We shipped some updates to Ignite. See what changed.',
    COALESCE(NEW.blog_url, '/release-notes'),
    'release_notes', NEW.id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_release_published ON public.release_notes;
CREATE TRIGGER trg_notify_release_published
  AFTER INSERT OR UPDATE OF status ON public.release_notes
  FOR EACH ROW EXECUTE FUNCTION public.notify_release_published();

-- Blog post published -> notify everyone
CREATE OR REPLACE FUNCTION public.notify_blog_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (audience, type, title, body, link_url, source_table, source_id)
  VALUES (
    'all', 'blog_post',
    'New article',
    NEW.title,
    '/blog/' || NEW.slug,
    'blog_posts', NEW.id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_blog_published ON public.blog_posts;
CREATE TRIGGER trg_notify_blog_published
  AFTER INSERT OR UPDATE OF status ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_blog_published();

-- Office hours went live -> notify learners on that course.
-- Ephemeral: expires 2h after the session starts so a session that ended days
-- ago doesn't linger in the list.
CREATE OR REPLACE FUNCTION public.notify_office_hours_live()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'live' THEN RETURN NEW; END IF;

  INSERT INTO public.notifications
    (audience, type, title, body, link_url, course_id, expires_at, source_table, source_id)
  VALUES (
    'all', 'office_hours',
    'Office hours are live',
    'A coach is online right now. Join the queue to talk one-to-one.',
    '/progress',
    NEW.course_id,
    NEW.started_at + INTERVAL '2 hours',
    'office_hours_sessions', NEW.id
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_office_hours_live ON public.office_hours_sessions;
CREATE TRIGGER trg_notify_office_hours_live
  AFTER INSERT ON public.office_hours_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_office_hours_live();
