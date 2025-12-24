/**
 * Migration Script: Sync Existing Users to New Resend Audience Segmentation
 *
 * This script migrates users from old audience structure to new segmented audiences:
 * - General: Users with no enrolled course
 * - PM Free: PM enrolled users who are not paying
 * - PM Paid: PM enrolled users who are paying
 *
 * Usage: node scripts/migrate-resend-audiences.js [--dry-run]
 *
 * Required environment variables:
 * - VITE_SUPABASE_URL (or SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY
 * - RESEND_API_KEY
 * - RESEND_AUDIENCE_GENERAL
 * - RESEND_AUDIENCE_PM_FREE
 * - RESEND_AUDIENCE_PM_PAID
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const isDryRun = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const AUDIENCES = {
  GENERAL: process.env.RESEND_AUDIENCE_GENERAL,
  PM_FREE: process.env.RESEND_AUDIENCE_PM_FREE,
  PM_PAID: process.env.RESEND_AUDIENCE_PM_PAID,
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function addToAudience(contact, audienceId, audienceName) {
  if (!audienceId) {
    console.log(`  [SKIP] ${audienceName} - no audience ID configured`);
    return 'skipped';
  }

  if (isDryRun) {
    console.log(`  [DRY RUN] Would add to ${audienceName}`);
    return 'dry-run';
  }

  try {
    await resend.contacts.create({
      email: contact.email,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      unsubscribed: false,
      audienceId
    });
    console.log(`  [ADDED] ${audienceName}`);
    return 'added';
  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log(`  [EXISTS] ${audienceName}`);
      return 'exists';
    }
    console.error(`  [ERROR] ${audienceName}: ${err.message}`);
    return 'error';
  }
}

function determineAudience(user, authUser) {
  const enrolledCourse = user.enrolled_course;
  const isAdFree = authUser?.user_metadata?.is_ad_free === true;

  if (!enrolledCourse) {
    return { audience: 'GENERAL', audienceId: AUDIENCES.GENERAL };
  }

  if (enrolledCourse === 'product-manager') {
    if (isAdFree) {
      return { audience: 'PM_PAID', audienceId: AUDIENCES.PM_PAID };
    }
    return { audience: 'PM_FREE', audienceId: AUDIENCES.PM_FREE };
  }

  // Other courses default to General for now
  return { audience: 'GENERAL', audienceId: AUDIENCES.GENERAL };
}

async function main() {
  console.log('='.repeat(60));
  console.log('RESEND AUDIENCE MIGRATION');
  console.log('='.repeat(60));
  if (isDryRun) {
    console.log('[DRY RUN MODE] No changes will be made\n');
  }

  // Validate environment
  if (!process.env.RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY is not set');
    process.exit(1);
  }

  const missingAudiences = [];
  if (!AUDIENCES.GENERAL) missingAudiences.push('RESEND_AUDIENCE_GENERAL');
  if (!AUDIENCES.PM_FREE) missingAudiences.push('RESEND_AUDIENCE_PM_FREE');
  if (!AUDIENCES.PM_PAID) missingAudiences.push('RESEND_AUDIENCE_PM_PAID');

  if (missingAudiences.length > 0) {
    console.error('ERROR: Missing audience IDs:');
    missingAudiences.forEach(a => console.error(`  - ${a}`));
    console.log('\nCreate audiences in Resend dashboard and add IDs to .env');
    process.exit(1);
  }

  console.log('Audience IDs:');
  console.log(`  General: ${AUDIENCES.GENERAL}`);
  console.log(`  PM Free: ${AUDIENCES.PM_FREE}`);
  console.log(`  PM Paid: ${AUDIENCES.PM_PAID}\n`);

  // Fetch users from public.users table
  console.log('Fetching users from Supabase...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, enrolled_course');

  if (usersError) {
    console.error('ERROR fetching users:', usersError);
    process.exit(1);
  }

  console.log(`Found ${users.length} users in database\n`);

  // Fetch auth users (for is_ad_free metadata and emails)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('ERROR fetching auth users:', authError);
    process.exit(1);
  }

  // Create lookup maps
  const authUserMap = new Map();
  const emailMap = new Map();
  for (const au of authUsers.users || []) {
    authUserMap.set(au.id, au);
    emailMap.set(au.id, au.email);
  }

  // Stats tracking
  const stats = {
    total: users.length,
    processed: 0,
    noEmail: 0,
    general: { added: 0, exists: 0, skipped: 0, errors: 0 },
    pmFree: { added: 0, exists: 0, skipped: 0, errors: 0 },
    pmPaid: { added: 0, exists: 0, skipped: 0, errors: 0 },
  };

  // Process each user
  console.log('Processing users...\n');

  for (const user of users) {
    const email = emailMap.get(user.id);
    if (!email) {
      console.log(`[SKIP] User ${user.id} - no email found`);
      stats.noEmail++;
      continue;
    }

    const authUser = authUserMap.get(user.id);
    const { audience, audienceId } = determineAudience(user, authUser);
    const isAdFree = authUser?.user_metadata?.is_ad_free === true;

    console.log(`${email}`);
    console.log(`  enrolled: ${user.enrolled_course || 'none'}, is_ad_free: ${isAdFree} => ${audience}`);

    const contact = {
      email,
      firstName: user.first_name || '',
      lastName: user.last_name || ''
    };

    const result = await addToAudience(contact, audienceId, audience);

    // Update stats
    const statKey = audience === 'GENERAL' ? 'general' : audience === 'PM_FREE' ? 'pmFree' : 'pmPaid';
    if (result === 'added' || result === 'dry-run') stats[statKey].added++;
    else if (result === 'exists') stats[statKey].exists++;
    else if (result === 'skipped') stats[statKey].skipped++;
    else stats[statKey].errors++;

    stats.processed++;

    // Rate limiting - Resend allows 10 requests/second on free tier
    await sleep(150);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total users: ${stats.total}`);
  console.log(`Processed:   ${stats.processed}`);
  console.log(`No email:    ${stats.noEmail}`);
  console.log('');
  console.log('Audience Results:');
  console.log(`  General:  ${stats.general.added} added, ${stats.general.exists} existed, ${stats.general.errors} errors`);
  console.log(`  PM Free:  ${stats.pmFree.added} added, ${stats.pmFree.exists} existed, ${stats.pmFree.errors} errors`);
  console.log(`  PM Paid:  ${stats.pmPaid.added} added, ${stats.pmPaid.exists} existed, ${stats.pmPaid.errors} errors`);
  console.log('\nDone!');
}

main().catch(console.error);
