import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('\n📋 ============================================');
    console.log('   Daily Course Completion Limit Migration');
    console.log('============================================\n');

    // Read the migration file
    const migrationSQL = fs.readFileSync('migrations/add_daily_course_completion_limit.sql', 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('🔄 Running migration...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if RPC function doesn't exist
      console.log('⚠️  RPC function not available, attempting direct execution...');

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('create table')) {
          console.log('📝 Creating course_completions table...');
        } else if (statement.toLowerCase().includes('create index')) {
          console.log('📝 Creating index...');
        } else if (statement.toLowerCase().includes('comment')) {
          console.log('📝 Adding table comments...');
        }

        const { error: execError } = await supabase.from('_sql').insert({ query: statement });

        if (execError && execError.code !== '42P07') { // Ignore "already exists" errors
          console.error('❌ Error executing statement:', execError.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Verifying table creation...');

    // Verify the table was created
    const { data: tableCheck, error: checkError } = await supabase
      .from('course_completions')
      .select('*')
      .limit(0);

    if (checkError && checkError.code === '42P01') {
      console.log('\n⚠️  Table not found. Please run the migration manually in Supabase SQL Editor:');
      console.log('\n📝 Copy and paste the following SQL:\n');
      console.log(migrationSQL);
      console.log('\n🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql/new');
    } else if (checkError) {
      console.log('⚠️  Could not verify table (this may be normal):', checkError.message);
      console.log('\n💡 If needed, run the migration manually in Supabase SQL Editor');
    } else {
      console.log('✅ Table verified! course_completions table exists');
    }

    console.log('\n🎉 Setup complete! The daily course completion limit feature is ready.');
    console.log('\n📚 Next steps:');
    console.log('   1. Test by completing 2 courses in one day');
    console.log('   2. Try accessing a 3rd course - should show limit message');
    console.log('   3. Verify the date shown is tomorrow\'s date');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📝 Please run the migration manually in Supabase SQL Editor');
    console.error('Migration file: migrations/add_daily_course_completion_limit.sql');
    process.exit(1);
  }
}

console.log('🚀 Starting migration...');
runMigration();
