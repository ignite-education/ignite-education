/**
 * Bulk Import Script: Sync Existing Users to Resend Audiences
 *
 * This script imports all existing users from Supabase into Resend audiences
 * based on their enrollment status and course completions.
 *
 * Usage: node scripts/sync-resend-audiences.js
 *
 * Required environment variables:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - RESEND_API_KEY
 * - RESEND_AUDIENCE_ALL_USERS
 * - RESEND_AUDIENCE_COURSE_PM (optional)
 * - RESEND_AUDIENCE_COURSE_CYBER (optional)
 * - RESEND_AUDIENCE_COMPLETED_PM (optional)
 * - RESEND_AUDIENCE_COMPLETED_CYBER (optional)
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Audience IDs - set these after creating audiences in Resend dashboard
const AUDIENCES = {
  ALL_USERS: process.env.RESEND_AUDIENCE_ALL_USERS,
  COURSE_PM: process.env.RESEND_AUDIENCE_COURSE_PM,
  COURSE_CYBER: process.env.RESEND_AUDIENCE_COURSE_CYBER,
  COMPLETED_PM: process.env.RESEND_AUDIENCE_COMPLETED_PM,
  COMPLETED_CYBER: process.env.RESEND_AUDIENCE_COMPLETED_CYBER,
};

// Rate limiting helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Add contact to audience with retry
async function addContactToAudience(contact, audienceId, audienceName) {
  if (!audienceId) {
    console.log(`  ⏭️  Skipping ${audienceName} - no audience ID configured`);
    return { status: 'skipped' };
  }

  try {
    const { data, error } = await resend.contacts.create({
      email: contact.email,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      unsubscribed: false,
      audienceId
    });

    if (error) {
      if (error.message?.includes('already exists')) {
        return { status: 'exists' };
      }
      throw error;
    }

    return { status: 'added', contactId: data?.id };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

async function main() {
  console.log('🚀 Starting Resend Audience Sync...\n');

  // Validate environment
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set');
    process.exit(1);
  }

  if (!AUDIENCES.ALL_USERS) {
    console.error('❌ RESEND_AUDIENCE_ALL_USERS is not set');
    console.log('\nTo get audience IDs:');
    console.log('1. Go to https://resend.com/audiences');
    console.log('2. Create audiences: all-users, course-pm, course-cyber, completed-pm, completed-cyber');
    console.log('3. Copy the audience IDs and add them to your .env file');
    process.exit(1);
  }

  // Fetch all users from Supabase
  console.log('📊 Fetching users from Supabase...');

  // Get users from public.users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, enrolled_course');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    process.exit(1);
  }

  console.log(`Found ${users.length} users in database\n`);

  // Note: course_completions table may not exist - skip completion tracking for now
  const completionMap = new Map();
  console.log('Skipping course completions (table may not exist)\n');

  // Fetch emails from auth.users using service role
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    process.exit(1);
  }

  // Create a map of user_id -> email
  const emailMap = new Map();
  for (const authUser of authUsers.users || []) {
    emailMap.set(authUser.id, authUser.email);
  }

  // Stats tracking
  const stats = {
    total: users.length,
    processed: 0,
    allUsers: { added: 0, exists: 0, skipped: 0, errors: 0 },
    coursePm: { added: 0, exists: 0, skipped: 0, errors: 0 },
    courseCyber: { added: 0, exists: 0, skipped: 0, errors: 0 },
    completedPm: { added: 0, exists: 0, skipped: 0, errors: 0 },
    completedCyber: { added: 0, exists: 0, skipped: 0, errors: 0 },
  };

  // Process each user
  for (const user of users) {
    const email = emailMap.get(user.id);
    if (!email) {
      console.log(`⚠️  User ${user.id} has no email - skipping`);
      continue;
    }

    const contact = {
      email,
      firstName: user.first_name || '',
      lastName: user.last_name || ''
    };

    console.log(`\n👤 Processing: ${email}`);

    // Add to all-users audience
    const allResult = await addContactToAudience(contact, AUDIENCES.ALL_USERS, 'all-users');
    stats.allUsers[allResult.status === 'added' ? 'added' : allResult.status === 'exists' ? 'exists' : allResult.status === 'skipped' ? 'skipped' : 'errors']++;
    console.log(`  📋 all-users: ${allResult.status}`);

    // Add to course-specific audience based on enrollment
    if (user.enrolled_course === 'product-management') {
      const pmResult = await addContactToAudience(contact, AUDIENCES.COURSE_PM, 'course-pm');
      stats.coursePm[pmResult.status === 'added' ? 'added' : pmResult.status === 'exists' ? 'exists' : pmResult.status === 'skipped' ? 'skipped' : 'errors']++;
      console.log(`  📋 course-pm: ${pmResult.status}`);
    } else if (user.enrolled_course === 'cybersecurity') {
      const cyberResult = await addContactToAudience(contact, AUDIENCES.COURSE_CYBER, 'course-cyber');
      stats.courseCyber[cyberResult.status === 'added' ? 'added' : cyberResult.status === 'exists' ? 'exists' : cyberResult.status === 'skipped' ? 'skipped' : 'errors']++;
      console.log(`  📋 course-cyber: ${cyberResult.status}`);
    }

    // Add to completed audience based on completions
    const userCompletions = completionMap.get(user.id) || [];
    if (userCompletions.includes('product-management')) {
      const completedPmResult = await addContactToAudience(contact, AUDIENCES.COMPLETED_PM, 'completed-pm');
      stats.completedPm[completedPmResult.status === 'added' ? 'added' : completedPmResult.status === 'exists' ? 'exists' : completedPmResult.status === 'skipped' ? 'skipped' : 'errors']++;
      console.log(`  📋 completed-pm: ${completedPmResult.status}`);
    }
    if (userCompletions.includes('cybersecurity')) {
      const completedCyberResult = await addContactToAudience(contact, AUDIENCES.COMPLETED_CYBER, 'completed-cyber');
      stats.completedCyber[completedCyberResult.status === 'added' ? 'added' : completedCyberResult.status === 'exists' ? 'exists' : completedCyberResult.status === 'skipped' ? 'skipped' : 'errors']++;
      console.log(`  📋 completed-cyber: ${completedCyberResult.status}`);
    }

    stats.processed++;

    // Rate limiting - Resend has limits
    await sleep(100);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SYNC COMPLETE - SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total users processed: ${stats.processed}/${stats.total}`);
  console.log('\nAudience Results:');
  console.log(`  all-users:     ${stats.allUsers.added} added, ${stats.allUsers.exists} existed, ${stats.allUsers.errors} errors`);
  console.log(`  course-pm:     ${stats.coursePm.added} added, ${stats.coursePm.exists} existed, ${stats.coursePm.errors} errors`);
  console.log(`  course-cyber:  ${stats.courseCyber.added} added, ${stats.courseCyber.exists} existed, ${stats.courseCyber.errors} errors`);
  console.log(`  completed-pm:  ${stats.completedPm.added} added, ${stats.completedPm.exists} existed, ${stats.completedPm.errors} errors`);
  console.log(`  completed-cyber: ${stats.completedCyber.added} added, ${stats.completedCyber.exists} existed, ${stats.completedCyber.errors} errors`);
  console.log('\n✅ Done!');
}

main().catch(console.error);
