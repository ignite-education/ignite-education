/**
 * One-off backfill: give every public.users row a username slug.
 *
 * Users created after add_public_profiles.sql was applied were left with
 * username = NULL (see migrations/fix_username_on_signup.sql for the why),
 * which drops them out of the public_profiles view and 404s their public page.
 *
 * This is the JS twin of step 3 in that migration — run it when you want the
 * profiles live immediately without waiting to apply the SQL. Idempotent:
 * only touches rows where username IS NULL.
 *
 *   node scripts/backfill-usernames.js          # dry run, prints the plan
 *   node scripts/backfill-usernames.js --apply  # writes
 *
 * Requires the service-role key (RLS on public.users blocks the anon key).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APPLY = process.argv.includes('--apply');

// Mirrors public.is_reserved_username() — keep the two lists in step.
const RESERVED = new Set([
  'courses', 'blog', 'welcome', 'privacy', 'terms', 'release-notes',
  'sign-in', 'reset-password', 'auth', 'certificate', 'prompts', 'progress',
  'admin', 'office-hours', 'learning', 'api', 'sitemap', 'sitemap.xml',
  'robots.txt', 'ai.txt', '_next', 'assets', 'index',
]);

// Mirrors public.slugify(): lowercase -> non-alphanumeric runs to one hyphen
// -> trim leading/trailing hyphens.
function slugify(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Mirrors public.generate_username(): bump a -2/-3 suffix while the candidate
// is reserved or taken. `taken` is mutated so a single run stays collision-free.
function generateUsername(first, last, taken) {
  let base = slugify(`${first || ''} ${last || ''}`.trim());
  if (!base) base = 'user';

  let candidate = base;
  let n = 1;
  while (RESERVED.has(candidate) || taken.has(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

async function main() {
  const { data: all, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, username, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }

  const taken = new Set(all.filter(u => u.username).map(u => u.username));
  const missing = all.filter(u => !u.username);

  if (missing.length === 0) {
    console.log('Every user already has a username. Nothing to do.');
    return;
  }

  console.log(`${missing.length} user(s) missing a username:\n`);

  const plan = missing.map(u => {
    const username = generateUsername(u.first_name, u.last_name, taken);
    taken.add(username);
    return { ...u, username };
  });

  for (const p of plan) {
    const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || '(no name)';
    console.log(`  ${name.padEnd(28)} -> /${p.username}`);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these.');
    return;
  }

  console.log('');
  let updated = 0;
  for (const p of plan) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ username: p.username })
      .eq('id', p.id);

    if (updateError) {
      console.error(`  FAILED ${p.username}:`, updateError.message);
      continue;
    }
    updated++;
  }

  console.log(`Done. ${updated}/${plan.length} updated.`);
  console.log('Public pages are ISR-cached for up to an hour before they resolve.');
}

main();
