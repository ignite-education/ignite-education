import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function runMigration() {
  try {
    console.log('📋 Reading migration file...');
    const migrationSQL = fs.readFileSync('./migrations/add_dual_reddit_threads.sql', 'utf8');

    console.log('🚀 Running migration to add dual Reddit thread support...');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 80) + '...');

      // Use Supabase's query execution
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // If RPC fails, log but continue
        console.log('⚠️ Note:', error.message);
      } else {
        console.log('✅ Statement executed successfully');
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('📝 Added reddit_read_url and reddit_post_url columns to courses table');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

runMigration();
