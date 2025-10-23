/**
 * Script to run SQL migrations
 *
 * Usage:
 * node scripts/run-migration.js <path-to-sql-file>
 *
 * Example:
 * node scripts/run-migration.js migrations/create_lesson_ratings_table.sql
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function runMigration(sqlFilePath) {
  try {
    // Read the SQL file
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log(`Running migration from: ${sqlFilePath}`);
    console.log('SQL:', sql.substring(0, 200) + '...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error running migration:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully!');
    console.log('Result:', data);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get SQL file path from command line arguments
const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error('Please provide a SQL file path');
  console.error('Usage: node scripts/run-migration.js <path-to-sql-file>');
  process.exit(1);
}

runMigration(sqlFilePath);
