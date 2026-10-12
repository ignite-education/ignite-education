/**
 * Announce per-job pages to the Google Indexing API, outside the nightly run.
 *
 * The same notifyGoogleIndexing() the ingest calls as its last step — this is
 * a CLI over it for the initial backfill (a cold board has every live listing
 * to announce, and at ~180 a day that takes a night or two) and for recovery
 * after a quota or credential problem.
 *
 *   node scripts/notify-google-indexing.mjs --dry-run   # print the worklist
 *   node scripts/notify-google-indexing.mjs             # send, within today's cap
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (writes index_notified_* columns) and the
 * GOOGLE_INDEXING_CLIENT_EMAIL / GOOGLE_INDEXING_PRIVATE_KEY pair. Without the
 * latter it reports "skipped" — which is also what the nightly run does.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { notifyGoogleIndexing } from '../server/jobs/lib/googleIndexing.js';

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const result = await notifyGoogleIndexing(supabase, { dryRun: DRY_RUN });

  if (result.skipped) {
    console.log(`Skipped: ${result.reason}`);
    return;
  }

  if (result.dryRun) {
    const { deletions, additions } = result.worklist;
    console.log(`Dry run — ${result.budgetLeft} requests left in today's cap.\n`);
    console.log(`URL_DELETED (${deletions.length}):`);
    for (const url of deletions) console.log(`  - ${url}`);
    console.log(`\nURL_UPDATED (${additions.length}):`);
    for (const url of additions) console.log(`  + ${url}`);
    return;
  }

  console.log(
    `Announced ${result.updated}, removed ${result.deleted}, ${result.errors} errors, ` +
    `${result.budgetLeft} requests left in today's cap.`
  );
  if (result.stopped) console.log(`Stopped early: ${result.stopped}`);
  if (result.failed) console.log(`Step failed: ${result.failed}`);
}

main().catch((err) => {
  console.error('Indexing notification failed:', err.message);
  process.exit(1);
});
