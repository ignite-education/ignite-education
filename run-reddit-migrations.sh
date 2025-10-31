#!/bin/bash

# Run Reddit configuration migrations
# This script applies the migrations to add and configure Reddit fields for courses

echo "🚀 Running Reddit configuration migrations..."
echo ""

# Check if VITE_SUPABASE_URL is set
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "❌ Error: VITE_SUPABASE_URL environment variable not set"
  echo "Please set your Supabase URL in your environment or .env file"
  exit 1
fi

# Extract connection details from Supabase URL
# Format: https://[project-ref].supabase.co
PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

echo "📊 Project: $PROJECT_REF"
echo ""

# Run migrations using npx supabase
echo "Step 1/4: Adding reddit_channel and reddit_url columns..."
npx supabase db push migrations/add_reddit_fields_to_courses.sql

echo ""
echo "Step 2/4: Configuring Product Manager course..."
npx supabase db push migrations/update_product_management_reddit.sql

echo ""
echo "Step 3/4: Configuring Cybersecurity course..."
npx supabase db push migrations/update_cybersecurity_reddit.sql

echo ""
echo "Step 4/4: Verifying configuration..."
npx supabase db push verify_reddit_configuration.sql

echo ""
echo "✅ Migrations complete!"
echo ""
echo "Next steps:"
echo "1. Check the output above for any errors"
echo "2. Visit your Ignite app and navigate to the Product Manager course"
echo "3. Check if the community forum now loads posts from r/productmanagement"
