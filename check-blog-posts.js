import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yjvdakdghkfnlhdpbocg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqdmRha2RnaGtmbmxoZHBib2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNzI2MzMsImV4cCI6MjA3NTg0ODYzM30.oHy2jb2rkebVg8AF2K5jLULdCEgCGuYYwp5h57nA0HE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPosts() {
  console.log('🔍 Checking blog posts...\n');

  const { data: allPosts, error: allError } = await supabase
    .from('blog_posts')
    .select('id, title, status, published_at');

  console.log('📊 All posts in database:');
  if (allError) {
    console.log('   Error:', allError.message);
  } else {
    console.log(`   Found ${allPosts.length} total posts`);
    allPosts.forEach(post => {
      console.log(`   - ${post.title}`);
      console.log(`     Status: ${post.status}`);
      console.log(`     Published: ${post.published_at || 'Not set'}\n`);
    });
  }

  const { data: publishedPosts, error: pubError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  console.log('\n✅ Published posts (what carousel shows):');
  if (pubError) {
    console.log('   Error:', pubError.message);
  } else {
    console.log(`   Found ${publishedPosts.length} published posts`);
    publishedPosts.forEach(post => {
      console.log(`   ✓ ${post.title}`);
      console.log(`     Slug: ${post.slug}`);
      console.log(`     Published: ${post.published_at}\n`);
    });
  }

  if (publishedPosts.length === 0 && allPosts.length > 0) {
    console.log('⚠️  You have posts but none are published!');
    console.log('   Go to /admin/blog and:');
    console.log('   1. Click on your post');
    console.log('   2. Set Status to "Published"');
    console.log('   3. Set a Publish Date');
    console.log('   4. Click "Update Post"');
  }
}

checkPosts();
