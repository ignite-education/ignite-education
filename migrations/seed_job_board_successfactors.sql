-- SuccessFactors boards for the job board, read through the `jsonld` adapter.
--
-- BBC and EY run SAP SuccessFactors RMK. Those sites publish a sitemap of every
-- advert and mark each advert page up with schema.org JobPosting MICRODATA
-- (itemtype/itemprop) rather than a JSON-LD <script> block. The jsonld adapter
-- reads both serialisations, so these are config rows and not a new adapter.
--
-- Both companies were already on the allowlist producing nothing: they are the
-- two largest employers in `job_company_coverage()` with zero boards.
--
-- WHY `locationPattern` MATTERS HERE. Neither board publishes a usable
-- jobLocation, and EY's sitemap is 7,414 adverts worldwide. Without an early
-- market gate the run would spend its whole per-run detail budget fetching
-- Suriname and Doha adverts only to drop them as wrong_market afterwards. The
-- pattern reads the city out of the RMK slug convention
-- ({City}-{Title}-{Postcode}), and the adapter drops entries that fail
-- matchesMarket() before they ever cost a request. Measured on a live sitemap
-- read: BBC 67 adverts → 38 UK, EY 7,414 → 315 UK.
--
-- max_pages follows from those counts at the adapter's PAGE_SIZE of 100.
--
-- BT IS DELIBERATELY NOT HERE. It is the same vendor and fingerprints
-- identically, but its `itemprop="description"` covers only a one-line
-- hybrid-working preamble and a block of company boilerplate — the actual advert
-- sits in an unmarked sibling element with no microdata on it at all. Ingesting
-- it would give every BT listing the same boilerplate description, which
-- stripSharedPrefix() would then reduce to nothing. Reaching BT needs a
-- SuccessFactors-specific adapter that knows the RMK page template; the
-- vendor-agnostic jsonld adapter should not learn one vendor's CSS classes.
--
-- Ships DISABLED. Verify before publishing anything to the public board:
--
--   node scripts/run-job-ingest.mjs --dry-run --sources jsonld --markets gb
--   -- then flip `enabled` in the admin Sources tab
--
-- Safe to re-run.

INSERT INTO public.job_source_accounts
  (source, account, company, company_norm, markets, enabled, max_pages, domain, params)
VALUES
  -- 67 adverts, 38 matching gb on the slug. The advert pages carry no
  -- datePosted, so posted_at falls back to the sitemap's per-URL <lastmod> —
  -- page-changed rather than job-posted, the same approximation British Airways
  -- has always run on.
  ('jsonld', 'bbc', 'BBC', 'bbc', ARRAY['gb'], false, 1, 'bbc.co.uk',
   '{"sitemapUrl":"https://careers.bbc.co.uk/sitemap.xml","jobUrlPattern":"\\/job\\/","locationPattern":"\\/job\\/([^\\/-]+)-"}'::jsonb),
  -- 7,414 adverts, 315 matching gb on the slug. Publishes datePosted and a
  -- streetAddress-only jobLocation, both read at hydration.
  ('jsonld', 'ey', 'EY', 'ey', ARRAY['gb'], false, 4, 'ey.com',
   '{"sitemapUrl":"https://careers.ey.com/sitemap.xml","jobUrlPattern":"\\/job\\/","locationPattern":"\\/job\\/([^\\/-]+)-"}'::jsonb)
ON CONFLICT (source, account) DO UPDATE SET
  company      = EXCLUDED.company,
  company_norm = EXCLUDED.company_norm,
  markets      = EXCLUDED.markets,
  max_pages    = EXCLUDED.max_pages,
  domain       = EXCLUDED.domain,
  params       = EXCLUDED.params;
