/**
 * Run the job ingest locally.
 *
 * The same runJobIngest() the Render cron and the admin button call — this is
 * just a CLI over it, so nothing about the pipeline is duplicated here. It
 * exists because the two HTTP paths both need a secret (CRON_SECRET or an admin
 * bearer token), and iterating on an adapter should not.
 *
 *   node scripts/run-job-ingest.mjs --dry-run --sources workday --markets gb
 *   node scripts/run-job-ingest.mjs --dry-run --sources greenhouse,ashby,lever,workable
 *   node scripts/run-job-ingest.mjs --sources workday          # for real
 *
 * --dry-run classifies and reports without writing a single row, which is the
 * intended way to bring up a new adapter: the `dropped` breakdown tells you
 * whether the board is configured correctly long before anything reaches the
 * public page. Note that a dry run passes runId = null, so runLog.finish()
 * no-ops and NOTHING appears in the admin Runs tab — the numbers below are the
 * only output.
 *
 * --out <file> writes the per-source stats and drop counts as JSON, which is
 * what to diff when checking that a change to the orchestrator left the
 * existing sources untouched. A file rather than stdout because the pipeline
 * logs progress to stdout as it goes, so the two would interleave.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY: job_listings and job_ingest_runs have no
 * anon write policy.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { runJobIngest } from '../server/jobs/index.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const list = (name) => {
  const raw = value(name);
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : null;
};

const DRY_RUN = flag('dry-run');
const OUT = value('out');
const SOURCES = list('sources');
const MARKETS = list('markets');
const MAX_SECONDS = value('max-seconds') ? parseInt(value('max-seconds'), 10) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log(DRY_RUN ? 'Dry run — classifying only, nothing will be written.\n' : 'Ingesting…\n');

  const result = await runJobIngest({
    supabase,
    sources: SOURCES,
    markets: MARKETS,
    trigger: 'manual',
    dryRun: DRY_RUN,
    ...(MAX_SECONDS ? { deadlineMs: MAX_SECONDS * 1000 } : {}),
  });

  if (OUT) {
    // Keyed by label and sorted, so two runs diff cleanly. durationMs is
    // deliberately excluded — it varies run to run and would mask a real change.
    const byLabel = {};
    for (const run of [...result.runs].sort((a, b) => a.label.localeCompare(b.label))) {
      byLabel[run.label] = { status: run.status, stats: run.stats, dropped: run.dropped };
    }
    writeFileSync(OUT, `${JSON.stringify(byLabel, null, 2)}\n`);
    console.log(`\n  wrote ${OUT}`);
  }

  console.log('');
  for (const run of result.runs) {
    const s = run.stats;
    console.log(`  ${run.label.padEnd(24)} ${run.status}`);
    console.log(
      `    fetched ${s.fetched}  new ${s.inserted}  refreshed ${s.updated}  ` +
      `live ${s.autoApproved}  queued ${s.queued}  expired ${s.expired}  ` +
      `api ${s.apiCalls}  detail ${s.detailCalls || 0}`
    );
    const dropped = Object.entries(run.dropped || {}).filter(([, n]) => n > 0);
    if (dropped.length) {
      console.log(`    dropped  ${dropped.map(([k, n]) => `${k}=${n}`).join('  ')}`);
    }
    for (const job of run.samples || []) {
      console.log(
        `    + ${job.company} — ${job.title}` +
        `\n        ${job.location || 'no location'} · ${job.profession} · ${job.seniority}` +
        ` · posted ${job.postedAt?.slice(0, 10) || '?'}`
      );
    }
    if (run.note) console.log(`    note     ${run.note}`);
    if (run.error) console.log(`    error    ${run.error}`);
  }

  const t = result.totals;
  console.log('');
  console.log(
    `  TOTAL  ${t.fetched} fetched → ${t.inserted} new (${t.autoApproved} live, ` +
    `${t.queued} queued), ${t.updated} refreshed, ${t.expired} expired ` +
    `in ${Math.round(result.durationMs / 1000)}s`
  );
}

main().catch((err) => {
  console.error('Ingest failed:', err.message);
  process.exit(1);
});
