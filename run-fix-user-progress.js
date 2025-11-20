/**
 * Fix user_progress table schema
 *
 * This script fixes the existing user_progress table to match API expectations:
 * - Changes course_id from UUID to TEXT (to match course names like "product-manager")
 * - Ensures column names use snake_case (current_lesson, not currentLesson)
 *
 * Run this with: node run-fix-user-progress.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================');
console.log('FIX User Progress Table Schema');
console.log('========================================\n');

console.log('⚠️  IMPORTANT: This will DROP and recreate the user_progress table!');
console.log('   If you have existing progress data, back it up first.\n');

console.log('📋 What this migration fixes:');
console.log('  1. Changes course_id from UUID to TEXT');
console.log('     - Old: course_id UUID (didn\'t match course names)');
console.log('     - New: course_id TEXT (matches "product-manager", etc.)');
console.log('  2. Ensures correct column names:');
console.log('     - current_module (INTEGER)');
console.log('     - current_lesson (INTEGER)');
console.log('  3. Recreates indexes and RLS policies\n');

console.log('🔍 Why this is needed:');
console.log('   The existing table had course_id as UUID, but courses are identified');
console.log('   by TEXT names like "product-manager", not UUIDs.\n');

// Read the migration file
const migrationPath = path.join(__dirname, 'migrations', 'fix_user_progress_table.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('========================================');
console.log('SQL TO RUN:');
console.log('========================================\n');
console.log(sql);
console.log('\n========================================');
console.log('END OF SQL');
console.log('========================================\n');

console.log('✅ Steps to apply this fix:');
console.log('   1. Copy the SQL above');
console.log('   2. Go to Supabase Dashboard > SQL Editor');
console.log('   3. Click "New Query"');
console.log('   4. Paste the SQL');
console.log('   5. Click "Run"');
console.log('   6. Refresh your application\n');

console.log('📝 After running this fix:');
console.log('   - Progress adjustment feature will work correctly');
console.log('   - Course IDs will match properly');
console.log('   - All columns will have correct names and types\n');

console.log('⚠️  Note: This drops existing progress data. If you need to preserve it,');
console.log('   export the table first, then re-import after the fix.\n');
