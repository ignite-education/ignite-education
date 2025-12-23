// Script to create initial backups for all existing lessons
// Run with: node scripts/backup-all-lessons.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupAllLessons() {
  console.log('🔍 Fetching all lessons from database...\n');

  // Get all lessons
  const { data: lessons, error: fetchError } = await supabase
    .from('lessons')
    .select('*')
    .order('course_id')
    .order('module_number')
    .order('lesson_number')
    .order('section_number');

  if (fetchError) {
    console.error('Error fetching lessons:', fetchError);
    process.exit(1);
  }

  if (!lessons || lessons.length === 0) {
    console.log('No lessons found in database.');
    process.exit(0);
  }

  console.log(`Found ${lessons.length} lesson sections total.\n`);

  // Group lessons by course_id, module_number, lesson_number
  const grouped = {};
  lessons.forEach(lesson => {
    const key = `${lesson.course_id}|${lesson.module_number}|${lesson.lesson_number}`;
    if (!grouped[key]) {
      grouped[key] = {
        course_id: lesson.course_id,
        module_number: lesson.module_number,
        lesson_number: lesson.lesson_number,
        lesson_name: lesson.lesson_name,
        sections: []
      };
    }
    grouped[key].sections.push(lesson);
  });

  const uniqueLessons = Object.values(grouped);
  console.log(`Found ${uniqueLessons.length} unique lessons to backup.\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const lesson of uniqueLessons) {
    const { course_id, module_number, lesson_number, lesson_name, sections } = lesson;

    // Check if backup already exists for this lesson
    const { data: existingBackup } = await supabase
      .from('lesson_backups')
      .select('id')
      .eq('course_id', course_id)
      .eq('module_number', module_number)
      .eq('lesson_number', lesson_number)
      .limit(1);

    if (existingBackup && existingBackup.length > 0) {
      console.log(`⏭️  Skipping ${course_id} M${module_number}L${lesson_number} - backup already exists`);
      skipCount++;
      continue;
    }

    // Create backup
    const { data: backup, error: backupError } = await supabase
      .from('lesson_backups')
      .insert({
        course_id,
        module_number,
        lesson_number,
        lesson_name: lesson_name || '',
        version_number: 1,
        backup_reason: 'initial_backup',
        created_by: null,
        content_blocks: sections
      })
      .select()
      .single();

    if (backupError) {
      console.error(`❌ Error backing up ${course_id} M${module_number}L${lesson_number}:`, backupError.message);
      errorCount++;
    } else {
      console.log(`✅ Backed up ${course_id} M${module_number}L${lesson_number} "${lesson_name}" (${sections.length} blocks)`);
      successCount++;
    }
  }

  console.log('\n========================================');
  console.log('Backup Summary:');
  console.log(`  ✅ Created: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log('========================================\n');
}

backupAllLessons().catch(console.error);
