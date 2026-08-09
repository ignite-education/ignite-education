/**
 * Find the job boards for allowlisted companies that have none.
 *
 * This is the bridge between "add a company in the admin UI" and "its jobs
 * appear on /jobs". The allowlist decides which companies we are willing to
 * show; this decides where their jobs actually come from.
 *
 *   node scripts/discover-job-boards.mjs --gaps
 *   node scripts/discover-job-boards.mjs --company "Marks & Spencer" --domain marksandspencer.com
 *   node scripts/discover-job-boards.mjs --company "BT" --careers-url https://www.bt.com/careers
 *   node scripts/discover-job-boards.mjs --gaps --sql
 *
 * --gaps          every allowed company with no enabled board and no company query
 * --sql           print only the INSERT, for piping into a file
 * --all           include allowed companies that already have a board (re-check)
 * --careers-url   the careers page to fingerprint, when it is not at a
 *                 conventional address. Overrides job_companies.careers_url for
 *                 this run; the stored value is used automatically otherwise.
 *
 * READ-ONLY against the database. It prints a paste-ready INSERT for the
 * Supabase SQL editor rather than writing, which matches how every other
 * schema and config change in this repo is applied — and means a bad probe
 * result can never quietly reconfigure the pipeline.
 *
 * The probing itself lives in server/jobs/lib/discover.js, shared with the
 * admin app's "Find boards" button. Vendor detection implemented twice would
 * drift apart within a month.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (job_companies is admin-only).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { discoverBoards, toSql, registrableDomain, DENYLIST } from '../server/jobs/lib/discover.js';
import { normaliseCompany } from '../server/jobs/lib/normalise.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const GAPS = flag('gaps');
const ALL = flag('all');
const SQL_ONLY = flag('sql');
const ONE_COMPANY = value('company');
const ONE_DOMAIN = value('domain');
const ONE_CAREERS_URL = value('careers-url');
const MARKET = value('market', 'gb');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!GAPS && !ALL && !ONE_COMPANY) {
  console.error('Nothing to do. Pass --gaps, --all, or --company "Name" [--domain example.com].');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const log = (...parts) => { if (!SQL_ONLY) console.log(...parts); };

async function targets() {
  // select('*') rather than naming columns, for the same reason the board query
  // below does: careers_url only exists after add_job_company_careers_url.sql,
  // and naming it would break the script on a database where that has not been
  // applied yet.
  if (ONE_COMPANY) {
    const { data } = await supabase
      .from('job_companies')
      .select('*')
      .eq('name_norm', normaliseCompany(ONE_COMPANY))
      .maybeSingle();
    return [{
      name_norm: data?.name_norm || normaliseCompany(ONE_COMPANY),
      display_name: data?.display_name || ONE_COMPANY,
      domain: ONE_DOMAIN || data?.domain || null,
      careers_url: ONE_CAREERS_URL || data?.careers_url || null,
      aliases: data?.aliases || [],
    }];
  }

  const { data, error } = await supabase
    .from('job_companies')
    .select('*')
    .eq('allowed', true)
    .order('display_name');
  if (error) throw new Error(`could not read the allowlist: ${error.message}`);

  if (ALL) return data;

  // --gaps: companies with nothing fetching their jobs. Read from the tables
  // directly rather than through job_company_coverage(), and with select('*')
  // rather than naming company_norm, so the script still runs BEFORE
  // add_job_board_multi_ats.sql is applied — which is exactly when it is most
  // needed.
  const [{ data: boards }, { data: queries }, { data: sources }] = await Promise.all([
    supabase.from('job_source_accounts').select('*').eq('enabled', true),
    supabase.from('job_queries').select('*').eq('enabled', true),
    supabase.from('job_sources').select('key, enabled'),
  ]);

  // An enabled query on a DISABLED source fetches nothing, so counting it as
  // coverage hides the company from the one command that exists to find it.
  // Company sweeps all belonged to a disabled aggregator, so without this
  // filter --gaps reported one gap where there were twenty-one.
  const liveSources = new Set((sources || []).filter(s => s.enabled).map(s => s.key));

  const covered = new Set([
    ...(boards || []).filter(b => liveSources.has(b.source))
      .map(b => b.company_norm || normaliseCompany(b.company)),
    ...(queries || []).filter(q => liveSources.has(q.source))
      .map(q => q.company_norm).filter(Boolean),
  ]);
  return data.filter(company => !covered.has(company.name_norm));
}

async function main() {
  const { data: market } = await supabase
    .from('job_markets').select('*').eq('code', MARKET).single();

  const companies = await targets();
  log(`Probing ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'} for market "${MARKET}".\n`);

  const header = ['Company', 'Vendor', 'Board', 'Jobs', MARKET.toUpperCase(), 'Status'];
  log(`  ${header[0].padEnd(24)}${header[1].padEnd(16)}${header[2].padEnd(22)}${header[3].padEnd(7)}${header[4].padEnd(6)}${header[5]}`);
  log(`  ${'─'.repeat(96)}`);

  const rows = [];
  const unsupported = new Map();

  for (const company of companies) {
    const result = await discoverBoards({
      company: company.display_name,
      domain: company.domain,
      careersUrl: company.careers_url || null,
      aliases: company.aliases || [],
      market,
    });

    if (result.denied) {
      log(`  ${company.display_name.padEnd(24)}${'—'.padEnd(16)}${'—'.padEnd(22)}${'—'.padEnd(7)}${'—'.padEnd(6)}⛔ ${result.denied}`);
      continue;
    }

    const best = result.candidates[0];
    if (best) {
      rows.push({
        ...best,
        companyNorm: company.name_norm,
        domain: company.domain,
        market: MARKET,
      });
      log(
        `  ${company.display_name.padEnd(24)}${best.source.padEnd(16)}${String(best.account).slice(0, 20).padEnd(22)}` +
        `${String(best.totalJobs).padEnd(7)}${String(best.marketJobs).padEnd(6)}✓ ready`
      );
      for (const note of best.notes || []) log(`  ${' '.repeat(24)}↳ ${note}`);
    } else {
      // A vendor we can name but cannot ingest is the most useful negative
      // result there is — it is the queue for the next adapter.
      const known = result.vendors.filter(v => !v.adapter).map(v => v.vendor);
      known.forEach(v => unsupported.set(v, (unsupported.get(v) || 0) + 1));
      log(
        `  ${company.display_name.padEnd(24)}${(known[0] || '—').padEnd(16)}${'—'.padEnd(22)}${'—'.padEnd(7)}${'—'.padEnd(6)}` +
        (known.length ? '⚠ no adapter' : '✗ not found')
      );
      for (const note of result.notes) log(`  ${' '.repeat(24)}↳ ${note}`);
    }
  }

  if (unsupported.size) {
    log('\n  Vendors seen but not supported (the adapter backlog, most common first):');
    for (const [vendor, count] of [...unsupported].sort((a, b) => b[1] - a[1])) {
      log(`    ${vendor} — ${count} compan${count === 1 ? 'y' : 'ies'}`);
    }
  }

  log(`\n  ${rows.length} board(s) found. Paste into the Supabase SQL editor:\n`);
  console.log(toSql(rows));

  if (!SQL_ONLY && rows.length) {
    // The rows above insert with enabled = false, so applying the SQL fetches
    // nothing until both steps below are done. That is the intended order:
    // a probe result is evidence a board exists, not evidence it is right.
    console.log('\n-- These insert DISABLED. Dry-run first:');
    console.log(`--   node scripts/run-job-ingest.mjs --dry-run --sources ${[...new Set(rows.map(r => r.source))].join(',')} --markets ${MARKET}`);
    console.log('-- then enable the board in the admin Coverage tab.');
  }
}

main().catch((err) => {
  console.error('Discovery failed:', err.message);
  process.exit(1);
});
