/**
 * Check user enrollments
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get emails
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailMap = new Map();
  for (const u of authUsers.users || []) {
    emailMap.set(u.id, u.email);
  }

  console.log('📊 User Enrollments:\n');

  const courseCount = {};

  for (const user of users) {
    const email = emailMap.get(user.id) || 'no-email';
    const course = user.enrolled_course || 'none';
    console.log(`${user.first_name || 'Unknown'} ${user.last_name || ''} (${email}): ${course}`);

    courseCount[course] = (courseCount[course] || 0) + 1;
  }

  console.log('\n📈 Summary:');
  for (const [course, count] of Object.entries(courseCount)) {
    console.log(`  ${course}: ${count} users`);
  }
}

main();
