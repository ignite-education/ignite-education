/**
 * Migration script to create the blocked_reddit_posts table
 * Run this with: node run-blocked-posts-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yjvdakdghkfnlhdpbocg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('   Set it in your .env file or run with: SUPABASE_SERVICE_ROLE_KEY=your_key node run-blocked-posts-migration.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🚀 Starting migration: create_blocked_reddit_posts_table.sql');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, 'migrations', 'create_blocked_reddit_posts_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL loaded from:', sqlPath);
    console.log('📝 Executing SQL...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct execution
      console.log('⚠️  exec_sql RPC not found, attempting direct execution...');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

      for (const statement of statements) {
        if (statement) {
          console.log('▶️  Executing:', statement.substring(0, 100) + '...');
          const result = await supabase.rpc('exec_sql', { query: statement });
          if (result.error) {
            throw result.error;
          }
        }
      }

      console.log('\n✅ Migration completed successfully!');
      console.log('📊 Table "blocked_reddit_posts" has been created');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Result:', data);
    }

    // Verify table exists
    const { data: tableCheck, error: checkError } = await supabase
      .from('blocked_reddit_posts')
      .select('count');

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('\n⚠️  Warning: Could not verify table creation:', checkError.message);
    } else {
      console.log('✅ Table verification successful');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📋 Manual setup instructions:');
    console.error('   1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/yjvdakdghkfnlhdpbocg');
    console.error('   2. Navigate to SQL Editor');
    console.error('   3. Copy and paste the contents of migrations/create_blocked_reddit_posts_table.sql');
    console.error('   4. Click "Run" to execute the migration');
    process.exit(1);
  }
}

runMigration();
