/**
 * Script to fix existing community posts that are missing author information
 * This should be run once to backfill author data for posts created before the fix
 *
 * Usage: node scripts/fix-post-authors.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (you'll need to set these environment variables)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPostAuthors() {
  console.log('🔧 Starting to fix post authors...\n');

  try {
    // Fetch all posts that don't have an author or user_id
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select('*')
      .or('author.is.null,user_id.is.null');

    if (postsError) {
      console.error('❌ Error fetching posts:', postsError);
      return;
    }

    if (!posts || posts.length === 0) {
      console.log('✅ No posts need fixing!');
      return;
    }

    console.log(`📊 Found ${posts.length} posts that need fixing\n`);

    // Get all users from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`👥 Found ${users.length} users in the system\n`);

    // For each post without author info, try to assign it to a user
    // Since we can't determine the original author, we'll need to manually decide
    // Option 1: Assign all to the first admin/user
    // Option 2: Delete these posts
    // Option 3: Keep them as anonymous posts but give them a consistent author

    console.log('⚠️  WARNING: Cannot automatically determine original post authors.');
    console.log('Options:');
    console.log('1. Assign all orphaned posts to a default user');
    console.log('2. Delete orphaned posts');
    console.log('3. Mark them as "Anonymous" posts\n');

    // For now, let's mark them as anonymous with a special user
    const anonymousAuthor = 'u/Anonymous';

    for (const post of posts) {
      if (!post.author && !post.user_id) {
        const { error: updateError } = await supabase
          .from('community_posts')
          .update({
            author: anonymousAuthor,
            user_id: null // Keep as null to indicate anonymous
          })
          .eq('id', post.id);

        if (updateError) {
          console.error(`❌ Error updating post ${post.id}:`, updateError);
        } else {
          console.log(`✅ Updated post ${post.id} - "${post.title}" -> ${anonymousAuthor}`);
        }
      } else if (!post.author && post.user_id) {
        // Has user_id but no author - fetch user info
        const user = users.find(u => u.id === post.user_id);
        if (user) {
          const firstName = user.user_metadata?.first_name ||
                           user.user_metadata?.full_name?.split(' ')[0] ||
                           'User';

          const { error: updateError } = await supabase
            .from('community_posts')
            .update({
              author: `u/${firstName}`
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`❌ Error updating post ${post.id}:`, updateError);
          } else {
            console.log(`✅ Updated post ${post.id} - "${post.title}" -> u/${firstName}`);
          }
        }
      } else if (post.author && !post.user_id) {
        // Has author but no user_id - try to find matching user
        const authorName = post.author.replace('u/', '');
        const matchingUser = users.find(u =>
          u.user_metadata?.first_name?.toLowerCase() === authorName.toLowerCase() ||
          u.user_metadata?.full_name?.toLowerCase().includes(authorName.toLowerCase())
        );

        if (matchingUser) {
          const { error: updateError } = await supabase
            .from('community_posts')
            .update({
              user_id: matchingUser.id
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`❌ Error updating post ${post.id}:`, updateError);
          } else {
            console.log(`✅ Updated post ${post.id} - "${post.title}" -> linked to user ${matchingUser.email}`);
          }
        } else {
          console.log(`⚠️  Could not find user for post ${post.id} with author "${post.author}"`);
        }
      }
    }

    console.log('\n✅ Finished fixing post authors!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
fixPostAuthors();
