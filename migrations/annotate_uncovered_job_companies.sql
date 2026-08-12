-- Housekeeping on the job board's company registry and source list.
--
-- Both changes exist to stop the Coverage tab lying about what is fixable.
-- After BBC and EY were seeded, ten of the remaining uncovered companies are
-- not "not done yet" — they are "cannot be done from an ATS feed", and until
-- that is written down every sweep re-probes them and every reviewer re-asks.
--
-- `allowed` is deliberately NOT changed. These brands can never produce a
-- listing while the board is ATS-only, but whether to drop them from the
-- allowlist is a brand decision rather than an engineering one, and the moment
-- an aggregator is ever accepted the eight DENYLIST names become reachable
-- again. Writing the reason costs nothing and is reversible; deleting the rows
-- would also delete the aliases and hand-checked logo domains behind them.
--
-- Safe to re-run.

/* -------------------------------------------------------------------------- */
/* 1. Why these companies have no board                                        */
/* -------------------------------------------------------------------------- */

-- Refuses automated access to its own job data, and is on DENYLIST in
-- server/jobs/lib/discover.js so the sweep does not waste a probe on it.
UPDATE public.job_companies SET reason =
  'Unreachable: blocks automated access to its own careers API, and working around that would breach its terms. DENYLIST in server/jobs/lib/discover.js. Its only legitimate route was the aggregator sweep, which went with Adzuna — see migrations/remove_adzuna_source.sql.'
WHERE name_norm IN (
  'apple', 'google', 'microsoft', 'meta', 'tiktok', 'uber', 'linkedin', 'jd com'
);

-- Fingerprints to a vendor we can detect but have no adapter for, and both are
-- additionally blocked at the network layer.
UPDATE public.job_companies SET reason =
  'Unreachable: careers site runs on Avature, for which there is no adapter, and careers.bloomberg.com returns 403 to automated clients.'
WHERE name_norm = 'bloomberg';

UPDATE public.job_companies SET reason =
  'Unreachable: careers site runs on BeApplied (app.beapplied.com/org/comic-relief), for which there is no adapter; its API requires authentication and its pages carry no JobPosting markup.'
WHERE name_norm = 'comic relief';

-- BT is a special case: same vendor as BBC and EY and it fingerprints
-- identically, but its microdata does not contain the advert.
UPDATE public.job_companies SET reason =
  'Uncovered: runs SAP SuccessFactors like BBC and EY, but its itemprop="description" holds only a one-line preamble and company boilerplate — the advert sits in an unmarked sibling element. Needs a SuccessFactors-specific adapter; the vendor-agnostic jsonld adapter should not learn one vendor''s page template. See migrations/seed_job_board_successfactors.sql.'
WHERE name_norm = 'bt';


/* -------------------------------------------------------------------------- */
/* 2. Drop the himalayas source row                                            */
/* -------------------------------------------------------------------------- */

-- Seeded as a `board` kind and never given an adapter, so every run logs
-- "⚠️ no adapter registered for source" and skips it (server/jobs/index.js).
-- Disabled, zero listings, zero boards — dead config rather than a decision
-- anyone made. Removing it makes the Sources tab match what can actually run.
DELETE FROM public.job_sources
WHERE key = 'himalayas'
  AND NOT EXISTS (SELECT 1 FROM public.job_listings WHERE source = 'himalayas')
  AND NOT EXISTS (SELECT 1 FROM public.job_source_accounts WHERE source = 'himalayas');
