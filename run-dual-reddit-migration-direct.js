import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function runMigration() {
  // Parse Supabase URL to get database connection details
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('📋 Reading migration file...');
  const migrationSQL = fs.readFileSync('./migrations/add_dual_reddit_threads.sql', 'utf8');

  console.log('🚀 Running migration to add dual Reddit thread support...');
  console.log('⚠️  Note: This migration needs to be run manually in Supabase SQL Editor');
  console.log('\n📝 Please run the following SQL in your Supabase dashboard:\n');
  console.log('=' .repeat(80));
  console.log(migrationSQL);
  console.log('=' .repeat(80));
  console.log('\nOr access: https://supabase.com/dashboard/project/YOUR_PROJECT/editor');
}

runMigration();
