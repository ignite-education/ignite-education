-- Bring back listings that were expired only because the age window was 21 days.
--
-- MAX_POSTED_AGE_DAYS moved 21 → 45 in server/jobs/lib/expire.js (and the
-- read-time copy in next-app/src/data/jobsData.ts). Widening the constant alone
-- does NOT restore anything, and that is deliberate: persistBatch() never writes
-- `status`, so a re-seen row keeps whatever status it already had. See the
-- comment at the top of server/jobs/lib/persist.js — the same rule is what stops
-- a nightly run from resurrecting jobs an admin rejected.
--
-- So the rows the old sweep retired stay retired unless something explicitly
-- un-retires them. This is that something. Run it ONCE, after deploying the
-- constant change.
--
-- Measured on the live board when written: 8 of 27 expired rows qualify. The
-- other 19 are genuinely stale — Palantir has a "Product Designer" requisition
-- dated 4,939 days ago that is still in its live feed, which is exactly the
-- evergreen-requisition problem the constant exists to hide.

/* -------------------------------------------------------------------------- */
/* 1. What will change                                                         */
/* -------------------------------------------------------------------------- */

-- Run this first and read it. It is the same predicate as the UPDATE below.
--
--   SELECT company, title, profession,
--          (NOW()::date - posted_at::date)     AS posted_days_ago,
--          (NOW()::date - last_seen_at::date)  AS last_seen_days_ago
--   FROM public.job_listings
--   WHERE status = 'expired'
--     AND approved_at  IS NOT NULL
--     AND posted_at    > NOW() - INTERVAL '45 days'
--     AND expires_at   > NOW()
--     AND last_seen_at > NOW() - INTERVAL '3 days'
--   ORDER BY posted_at DESC;


/* -------------------------------------------------------------------------- */
/* 2. Revive                                                                   */
/* -------------------------------------------------------------------------- */

-- Four conditions, each closing off a different way this could republish
-- something it should not:
--
--   approved_at IS NOT NULL   it was live before, so no admin decision is being
--                             overridden. A rejected job carries status
--                             'rejected', not 'expired', but this also excludes
--                             anything that expired straight out of the pending
--                             queue via sweepStalePending().
--   posted_at   > 45 days ago inside the new window. Without it this revives the
--                             13-year-old Palantir requisition.
--   expires_at  > NOW()       not past its own first-seen + max_age_days expiry.
--   last_seen_at > 3 days ago the source still lists it. This is the important
--                             one: it separates "we hid it because of the age
--                             rule" from "the employer took it down", and 3 days
--                             is DELIST_GRACE_DAYS from expire.js.
--
-- expired_at is cleared so the row does not read as both live and expired.

UPDATE public.job_listings
SET status     = 'approved',
    expired_at = NULL
WHERE status = 'expired'
  AND approved_at  IS NOT NULL
  AND posted_at    > NOW() - INTERVAL '45 days'
  AND expires_at   > NOW()
  AND last_seen_at > NOW() - INTERVAL '3 days';


/* -------------------------------------------------------------------------- */
/* 3. Verify                                                                   */
/* -------------------------------------------------------------------------- */

-- The board as the public page will see it (getJobs() re-applies the same age
-- cut at read time, so this is the honest count, not the approved count).
--
--   SELECT COUNT(*) FROM public.job_listings
--   WHERE status = 'approved'
--     AND (posted_at IS NULL OR posted_at > NOW() - INTERVAL '45 days');
--
-- Nothing revived should be older than the window:
--
--   SELECT COUNT(*) FROM public.job_listings
--   WHERE status = 'approved' AND posted_at < NOW() - INTERVAL '45 days';
--   -- expect 0
