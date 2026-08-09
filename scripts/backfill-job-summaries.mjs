/**
 * Generate AI summaries for job listings that predate the feature.
 *
 * The nightly cron (render.yaml: jobs-summaries) handles the steady state and
 * caps itself at 60 listings a run, so a cold board of ~300 would take five
 * nights to fill in. This does it in one pass.
 *
 * It calls the same summariseListings() the cron does — the prompt, the model,
 * the length cap and the hash bookkeeping all live in
 * server/jobs/lib/summarise.js and are not duplicated here. That also makes the
 * run resumable for free: ai_summary_hash is the state, so re-running only
 * picks up what is still outstanding.
 *
 * Anthropic bills per token, so --dry-run prices the run before anything is
 * spent and --limit lets a large board be worked through in stages.
 *
 *   node scripts/backfill-job-summaries.mjs --dry-run
 *   node scripts/backfill-job-summaries.mjs --limit 5
 *   node scripts/backfill-job-summaries.mjs            # the lot
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (the summariser writes to job_listings,
 * which has no anon write policy) and ANTHROPIC_API_KEY.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { summariseListings } from '../server/jobs/lib/summarise.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY_RUN = flag('dry-run');
const LIMIT = value('limit') ? parseInt(value('limit'), 10) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
// Checked up front rather than letting the first listing fail: without it the
// summariser would mark rows `failed` before its consecutive-failure guard
// stopped the run, leaving state to clean up for a missing env var.
if (!DRY_RUN && !process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function main() {
  console.log(DRY_RUN ? 'Dry run — nothing will be generated or written.\n' : 'Summarising…\n');

  // No limit means the whole board. summariseListings inspects at most 300
  // candidates per call (the board's own cap), so this is the ceiling too.
  const stats = await summariseListings(supabase, anthropic, {
    limit: LIMIT ?? Number.MAX_SAFE_INTEGER,
    dryRun: DRY_RUN,
    log: (msg) => console.log(`  ${msg}`),
  });

  console.log('');
  console.log(`  considered ${stats.considered}`);
  if (DRY_RUN) {
    console.log(`  would summarise ${stats.wouldSummarise}`);
  } else {
    console.log(`  summarised ${stats.summarised}`);
    console.log(`  failed     ${stats.failed}`);
  }
  console.log(`  unchanged  ${stats.unchanged}   (already current for this advert text)`);
  console.log(`  skipped    ${stats.skipped}   (excerpt-only source, or too short to summarise)`);
  if (stats.remaining) {
    console.log(`  remaining  ${stats.remaining}   — re-run to continue`);
  }

  if (stats.failed) {
    console.log('\nFailed rows are marked ai_summary_status = \'failed\' and are retried on the next run.');
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
