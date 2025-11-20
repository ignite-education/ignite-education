/**
 * Migration runner for creating user_progress table
 *
 * This script creates the user_progress table which tracks:
 * - Which module and lesson a user is currently on
 * - When the progress was last updated
 *
 * Run this with: node run-user-progress-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('User Progress Table Migration');
console.log('========================================\n');

console.log('This migration will create the user_progress table in your Supabase database.\n');

console.log('📋 What this migration does:');
console.log('  1. Creates user_progress table with columns:');
console.log('     - user_id (UUID, references auth.users)');
console.log('     - course_id (TEXT)');
console.log('     - current_module (INTEGER, default 1)');
console.log('     - current_lesson (INTEGER, default 1)');
console.log('     - updated_at (TIMESTAMP)');
console.log('  2. Adds indexes for performance');
console.log('  3. Sets up Row Level Security (RLS) policies');
console.log('  4. Allows users to track their own progress');
console.log('  5. Allows admins to manage any user\'s progress\n');

console.log('⚠️  IMPORTANT: Run this SQL in your Supabase SQL Editor');
console.log('    (Dashboard > SQL Editor > New Query)\n');

// Read the migration file
const migrationPath = path.join(__dirname, 'migrations', 'create_user_progress_table.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('========================================');
console.log('SQL TO RUN:');
console.log('========================================\n');
console.log(sql);
console.log('\n========================================');
console.log('END OF SQL');
console.log('========================================\n');

console.log('✅ Steps to apply this migration:');
console.log('   1. Copy the SQL above');
console.log('   2. Go to Supabase Dashboard > SQL Editor');
console.log('   3. Click "New Query"');
console.log('   4. Paste the SQL');
console.log('   5. Click "Run"');
console.log('   6. Verify the table was created in the Table Editor\n');

console.log('📝 After running the migration:');
console.log('   - Users will be able to track their progress');
console.log('   - The Progress Adjustment feature will work');
console.log('   - Current progress will persist across sessions\n');
