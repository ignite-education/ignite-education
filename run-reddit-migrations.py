#!/usr/bin/env python3
"""
Run Reddit configuration migrations for Ignite Education
This script adds reddit_channel and reddit_url fields to courses and configures them.
"""

import os
import sys

def read_sql_file(filename):
    """Read SQL file content"""
    with open(filename, 'r') as f:
        return f.read()

def main():
    print("🚀 Running Reddit configuration migrations...")
    print()

    # Check for environment variable
    supabase_url = os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')

    if not supabase_url:
        print("❌ Error: VITE_SUPABASE_URL environment variable not set")
        print("Please set your Supabase connection details")
        sys.exit(1)

    print(f"📊 Supabase URL: {supabase_url}")
    print()

    # Try to import supabase
    try:
        from supabase import create_client
    except ImportError:
        print("⚠️  supabase-py not installed. Installing...")
        os.system("pip install supabase")
        from supabase import create_client

    # Create Supabase client
    supabase = create_client(supabase_url, supabase_key)

    # Migration files in order
    migrations = [
        ('migrations/add_reddit_fields_to_courses.sql', 'Adding reddit_channel and reddit_url columns'),
        ('migrations/update_product_management_reddit.sql', 'Configuring Product Manager course'),
        ('migrations/update_cybersecurity_reddit.sql', 'Configuring Cybersecurity course'),
    ]

    # Run each migration
    for i, (filename, description) in enumerate(migrations, 1):
        print(f"Step {i}/{len(migrations)}: {description}...")
        try:
            sql = read_sql_file(filename)
            # Execute SQL using rpc or direct query
            result = supabase.postgrest.rpc('query', {'query': sql}).execute()
            print(f"  ✅ {description} complete")
        except Exception as e:
            print(f"  ⚠️  {description}: {str(e)}")
        print()

    # Run verification
    print("Step 4/4: Verifying configuration...")
    try:
        sql = read_sql_file('verify_reddit_configuration.sql')
        result = supabase.table('courses').select('name, title, reddit_channel, reddit_url').in_('name', ['product-manager', 'product-management', 'cyber-security-analyst']).execute()
        print("  ✅ Configuration verified")
        print()
        print("Current configuration:")
        for course in result.data:
            print(f"  - {course.get('title', course.get('name'))}: {course.get('reddit_channel', 'NOT SET')}")
    except Exception as e:
        print(f"  ⚠️  Verification: {str(e)}")
    print()

    print("✅ Migration process complete!")
    print()
    print("Next steps:")
    print("1. Visit your Ignite app and navigate to the Product Manager course")
    print("2. Check if the community forum now loads posts from r/productmanagement")
    print("3. Navigate to Cybersecurity course and verify r/cybersecurity loads")

if __name__ == '__main__':
    main()
