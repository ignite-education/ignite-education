/**
 * One-off backfill: copy each user's avatar URL out of auth.users metadata
 * into public.users.avatar_url, so the public profile page (which reads via the
 * anon client, and cannot see auth.users) can display it.
 *
 * Requires the service-role key — it's the only key that can read auth.users.
 * Run once after applying migrations/add_public_profiles.sql:
 *   node scripts/backfill-profile-avatars.js
 *
 * New signups get avatar_url via the handle_new_user() trigger, so this only
 * needs to run once for pre-existing users.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mirror the avatar priority used everywhere else (AuthContext, trigger).
function resolveAvatar(metadata = {}) {
  return metadata.custom_avatar_url || metadata.avatar_url || metadata.picture || null;
}

async function main() {
  console.log('Backfilling public.users.avatar_url from auth metadata...');

  let page = 1;
  const perPage = 200;
  let updated = 0;
  let skipped = 0;

  // listUsers is paginated; loop until a short page is returned.
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('Error listing users:', error);
      process.exit(1);
    }

    const users = data?.users || [];
    if (users.length === 0) break;

    for (const u of users) {
      const avatar = resolveAvatar(u.user_metadata);
      if (!avatar) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatar })
        .eq('id', u.id);

      if (updateError) {
        console.error(`Failed to update ${u.id}:`, updateError.message);
      } else {
        updated++;
      }
    }

    if (users.length < perPage) break;
    page++;
  }

  console.log(`Done. Updated ${updated} avatars, skipped ${skipped} users with no avatar.`);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
