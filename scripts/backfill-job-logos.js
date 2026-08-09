/**
 * One-off backfill: resolve a logo for every employer already on the job board.
 *
 * The nightly ingest resolves logos for companies in the batch it just fetched
 * (server/jobs/index.js, step 7), so this is only needed once — to cover
 * listings that were persisted before logo resolution existed.
 *
 * Requires the service-role key: the `assets` bucket's INSERT policy rejects the
 * anon key, and job_companies has no anon policy at all.
 *
 *   node scripts/backfill-job-logos.js            # resolve and upload
 *   node scripts/backfill-job-logos.js --dry-run  # report only, write nothing
 */

import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import dotenv from 'dotenv'
import { resolveCompanyLogos } from '../server/jobs/lib/logos.js'

dotenv.config()

const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const http = axios.create({
  headers: { 'User-Agent': 'IgniteEducationJobBot/1.0 (+https://ignite.education/jobs)' },
})

async function main() {
  // Every listing, not just approved ones — a queued job that gets approved
  // tomorrow should already have its logo.
  const { data, error } = await supabase
    .from('job_listings')
    .select('company, company_norm, source, source_account')
    .limit(5000)

  if (error) throw new Error(`could not read job_listings: ${error.message}`)

  const companies = (data || []).map(row => ({
    company: row.company,
    source: row.source,
    account: row.source_account,
  }))

  const distinct = new Set(companies.map(c => c.company)).size
  console.log(`Resolving logos for ${distinct} companies across ${companies.length} listings${dryRun ? ' (dry run)' : ''}...\n`)

  const stats = await resolveCompanyLogos(supabase, http, companies, {
    dryRun,
    log: msg => console.log(msg.trim()),
  })

  console.log(
    `\nDone. ${stats.resolved} resolved, ${stats.unchanged} unchanged, ` +
    `${stats.missing} no logo found, ${stats.skipped} skipped (fresh or suppressed), ` +
    `${stats.failed} failed.`
  )

  if (stats.missing > 0) {
    console.log(
      '\nCompanies with no logo fall back to the coloured initial tile on the board. ' +
      'Set a domain by hand in the admin Companies tab to fix one.'
    )
  }
}

main().catch(err => {
  console.error('Backfill failed:', err.message)
  process.exit(1)
})
