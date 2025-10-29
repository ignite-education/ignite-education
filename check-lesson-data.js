import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yjvdakdghkfnlhdpbocg.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLessonData() {
  console.log('🔍 Checking lesson data in database...\n');

  // Check courses table for module_structure
  console.log('📚 Fetching Product Management course...');
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('name, title, module_structure')
    .eq('name', 'product-management')
    .single();

  if (courseError) {
    console.error('❌ Error fetching course:', courseError);

    // Try alternative course names
    console.log('\n🔍 Trying alternative course names...');
    const { data: allCourses, error: allCoursesError } = await supabase
      .from('courses')
      .select('name, title');

    if (allCoursesError) {
      console.error('❌ Error fetching all courses:', allCoursesError);
    } else {
      console.log('📋 Available courses:');
      allCourses.forEach(c => console.log(`  - ${c.name} (${c.title})`));
    }
    return;
  }

  console.log('✅ Course found:', courseData.title);
  console.log('\n📦 Module Structure:');

  if (!courseData.module_structure) {
    console.log('⚠️  No module_structure found for this course!');
    console.log('   This is why lesson cards are blank.');
    console.log('\n💡 Solution: The course needs to have a module_structure field populated.');
    return;
  }

  if (!Array.isArray(courseData.module_structure)) {
    console.log('⚠️  module_structure exists but is not an array:', courseData.module_structure);
    return;
  }

  console.log(`✅ Found ${courseData.module_structure.length} module(s)\n`);

  courseData.module_structure.forEach((module, moduleIdx) => {
    console.log(`📁 Module ${moduleIdx + 1}: ${module.name || '(no name)'}`);

    if (!module.lessons || !Array.isArray(module.lessons)) {
      console.log('   ⚠️  No lessons array in this module');
      return;
    }

    module.lessons.forEach((lesson, lessonIdx) => {
      console.log(`   📝 Lesson ${lessonIdx + 1}:`);
      console.log(`      Name: ${lesson.name || '(empty)'}`);
      console.log(`      Description: ${lesson.description || '(empty)'}`);

      if (lesson.bullet_points && Array.isArray(lesson.bullet_points)) {
        lesson.bullet_points.forEach((bp, bpIdx) => {
          console.log(`      • Bullet ${bpIdx + 1}: ${bp || '(empty)'}`);
        });
      } else {
        console.log('      ⚠️  No bullet_points array');
      }
      console.log('');
    });
  });
}

checkLessonData().catch(console.error);
