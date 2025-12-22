/**
 * Sync Product Management enrolled users to Resend course-pm audience
 * Usage: node scripts/sync-pm-audience.js
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

const COURSE_PM_AUDIENCE = process.env.RESEND_AUDIENCE_COURSE_PM;

async function main() {
  console.log('🚀 Syncing Product Management users to course-pm audience...\n');

  if (!COURSE_PM_AUDIENCE) {
    console.error('❌ RESEND_AUDIENCE_COURSE_PM not set');
    process.exit(1);
  }

  // Get users enrolled in product-management
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name, enrolled_course')
    .eq('enrolled_course', 'product-manager');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    process.exit(1);
  }

  console.log(`Found ${users.length} users enrolled in Product Management\n`);

  if (users.length === 0) {
    console.log('No users to sync.');
    return;
  }

  // Get emails from auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    process.exit(1);
  }

  const emailMap = new Map();
  for (const authUser of authUsers.users || []) {
    emailMap.set(authUser.id, authUser.email);
  }

  let added = 0;
  let exists = 0;
  let errors = 0;

  for (const user of users) {
    const email = emailMap.get(user.id);
    if (!email) {
      console.log(`⚠️  User ${user.id} has no email - skipping`);
      continue;
    }

    console.log(`📋 Adding ${email} (${user.first_name} ${user.last_name})...`);

    try {
      const { data, error } = await resend.contacts.create({
        email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        unsubscribed: false,
        audienceId: COURSE_PM_AUDIENCE
      });

      if (error) {
        if (error.message?.includes('already exists')) {
          console.log(`   ✓ Already exists`);
          exists++;
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          errors++;
        }
      } else {
        console.log(`   ✅ Added (${data?.id})`);
        added++;
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errors++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n' + '='.repeat(40));
  console.log('📊 SYNC COMPLETE');
  console.log('='.repeat(40));
  console.log(`Added: ${added}`);
  console.log(`Already existed: ${exists}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
