/**
 * Script to generate and populate knowledge check questions for all lessons in a course
 *
 * Usage:
 * node scripts/populate-questions.js <courseId>
 * node scripts/populate-questions.js <courseId> --force  (regenerate even if unchanged)
 *
 * Examples:
 * node scripts/populate-questions.js product-manager
 * node scripts/populate-questions.js product-manager --force
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

async function getAllLessons(courseId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('module_number, lesson_number, lesson_name')
    .eq('course_id', courseId)
    .order('module_number')
    .order('lesson_number');

  if (error) {
    throw new Error(`Error fetching lessons: ${error.message}`);
  }

  // Get unique lessons (since there are multiple rows per lesson for sections)
  const uniqueLessons = [];
  const seen = new Set();

  for (const lesson of data || []) {
    const key = `${lesson.module_number}-${lesson.lesson_number}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLessons.push(lesson);
    }
  }

  return uniqueLessons;
}

async function generateQuestionsForLesson(courseId, moduleNumber, lessonNumber, forceRegenerate) {
  const response = await fetch(`${API_URL}/api/admin/generate-lesson-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      moduleNumber,
      lessonNumber,
      forceRegenerate
    })
  });

  return response.json();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node scripts/populate-questions.js <courseId> [--force]');
    console.error('Examples:');
    console.error('  node scripts/populate-questions.js product-manager');
    console.error('  node scripts/populate-questions.js product-manager --force');
    process.exit(1);
  }

  const courseId = args[0];
  const forceRegenerate = args.includes('--force');

  console.log(`\n📝 Generating knowledge check questions for course: ${courseId}`);
  if (forceRegenerate) {
    console.log('   (Force regenerate mode - will regenerate all questions)\n');
  } else {
    console.log('   (Normal mode - will skip lessons with unchanged content)\n');
  }

  try {
    // Fetch all lessons
    console.log('📚 Fetching lessons...');
    const lessons = await getAllLessons(courseId);
    console.log(`   Found ${lessons.length} lessons\n`);

    if (lessons.length === 0) {
      console.log('❌ No lessons found for this course');
      process.exit(1);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Process each lesson
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const { module_number, lesson_number, lesson_name } = lesson;
      const progress = `[${i + 1}/${lessons.length}]`;

      process.stdout.write(`${progress} M${module_number}L${lesson_number} "${lesson_name || 'Unnamed'}"... `);

      try {
        const result = await generateQuestionsForLesson(
          courseId,
          module_number,
          lesson_number,
          forceRegenerate
        );

        if (result.skipped) {
          console.log('⏭️  Skipped (unchanged)');
          skipCount++;
        } else if (result.success) {
          console.log(`✅ ${result.questionCount} questions`);
          successCount++;
        } else {
          console.log(`❌ ${result.error}`);
          errorCount++;
        }
      } catch (error) {
        console.log(`❌ ${error.message}`);
        errorCount++;
      }

      // Rate limiting - wait 1.5 seconds between API calls to avoid rate limits
      if (i < lessons.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    console.log('📊 Summary:');
    console.log(`   ✅ Generated: ${successCount}`);
    console.log(`   ⏭️  Skipped:   ${skipCount}`);
    console.log(`   ❌ Errors:    ${errorCount}`);
    console.log(`${'='.repeat(50)}\n`);

    if (errorCount > 0) {
      console.log('⚠️  Some lessons failed. Re-run the script to retry failed lessons.\n');
      process.exit(1);
    }

    console.log('✨ Done! Knowledge check questions are ready.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
