-- Allow manually-published notifications from the admin portal.
--
-- The four original types are all trigger-generated and named after their source
-- table. Announcements have no source row — an admin writes the title, body and
-- link by hand — so they need their own type.
--
-- Run this after create_notifications_table.sql. Safe to re-run.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'certificate', 'release_note', 'blog_post', 'office_hours', 'announcement'
  ));
