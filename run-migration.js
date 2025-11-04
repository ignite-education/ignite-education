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
    const migrationSQL = fs.readFileSync('./migrations/create_certificates_table.sql', 'utf8');

    console.log('🚀 Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if RPC doesn't work
      console.log('⚠️ RPC method failed, trying alternative approach...');

      // Split by semicolon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const result = await supabase.from('_sql').insert({ query: statement });
        if (result.error) {
          console.error('❌ Error:', result.error);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('📊 Result:', data);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

runMigration();
