# Reddit Configuration Migration Guide

This guide explains how to fix the Product Manager community forum so it matches the Cybersecurity configuration.

## Problem
The Product Manager course community forum doesn't load posts because the database is missing Reddit configuration fields.

## Solution
Run the migrations to add `reddit_channel` and `reddit_url` fields to the courses table, then configure both courses.

---

## Method 1: Supabase Dashboard (Recommended - Easiest)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://app.supabase.com/project/YOUR_PROJECT/editor
   - Click on "SQL Editor" in the left sidebar

2. **Run Migration 1: Add Reddit Fields**
   - Create a new query
   - Copy and paste the contents of: `migrations/add_reddit_fields_to_courses.sql`
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - You should see: `Success. No rows returned`

3. **Run Migration 2: Configure Product Manager**
   - Create a new query
   - Copy and paste the contents of: `migrations/update_product_management_reddit.sql`
   - Click "Run"
   - You should see 1 row updated

4. **Run Migration 3: Configure Cybersecurity**
   - Create a new query
   - Copy and paste the contents of: `migrations/update_cybersecurity_reddit.sql`
   - Click "Run"
   - You should see 1 row updated

5. **Verify Configuration**
   - Create a new query
   - Copy and paste the contents of: `verify_reddit_configuration.sql`
   - Click "Run"
   - You should see both courses with their Reddit channels configured

---

## Method 2: Using psql Command Line

If you have PostgreSQL client installed:

```bash
# Set your database connection URL
export DATABASE_URL="your-supabase-connection-string"

# Run migrations in order
psql $DATABASE_URL < migrations/add_reddit_fields_to_courses.sql
psql $DATABASE_URL < migrations/update_product_management_reddit.sql
psql $DATABASE_URL < migrations/update_cybersecurity_reddit.sql

# Verify
psql $DATABASE_URL < verify_reddit_configuration.sql
```

---

## Method 3: Using Supabase CLI

If you have Supabase CLI installed and linked:

```bash
# Make sure you're linked to your project
npx supabase link

# Push migrations
npx supabase db push

# This will apply all new migrations in the migrations folder
```

---

## Expected Results

After running the migrations, you should see:

### Courses Table
```
name                    | title                    | reddit_channel        | reddit_url
------------------------|--------------------------|----------------------|----------------------------------
product-manager         | Product Manager          | r/productmanagement  | https://www.reddit.com/r/productmanagement/
cyber-security-analyst  | Cyber Security Analyst   | r/cybersecurity      | https://www.reddit.com/r/cybersecurity/
```

### What This Fixes

1. **Product Manager Community Forum** → Will load posts from `r/productmanagement`
2. **Cybersecurity Community Forum** → Will load posts from `r/cybersecurity`
3. **Both courses** → Use the same cached Reddit API structure from server.js
4. **Server cache** → Already configured to fetch from `productmanagement` and `cybersecurity` subreddits

---

## Testing

After running the migrations:

1. **Visit your Ignite app** (http://localhost:5173 or your deployment URL)
2. **Navigate to Product Manager course** → Progress Hub
3. **Check Community Forum tab** → Should now display posts from r/productmanagement
4. **Navigate to Cybersecurity course** → Progress Hub (if available)
5. **Check Community Forum tab** → Should display posts from r/cybersecurity

---

## Troubleshooting

### "Column already exists" error
- This is fine! It means the column was already added (possibly manually)
- Continue with the next migration

### "No rows updated"
- Check that your course `name` field matches:
  - Product Manager: `product-manager` or `product-management`
  - Cybersecurity: `cyber-security-analyst` or `cybersecurity-analyst`
- You can check with: `SELECT name, title FROM courses;`

### Still no posts showing
1. **Check server is running**: The backend server (server.js) needs to be running
2. **Check server logs**: Look for Reddit cache messages in server console
3. **Manually trigger cache refresh**:
   ```bash
   curl -X POST http://localhost:3001/api/reddit-cache/refresh
   ```
4. **Check browser console**: Look for errors in the browser dev tools

---

## Files Created

- ✅ `migrations/add_reddit_fields_to_courses.sql` - Adds reddit_channel and reddit_url columns
- ✅ `migrations/update_product_management_reddit.sql` - Sets Product Manager Reddit config
- ✅ `migrations/update_cybersecurity_reddit.sql` - Sets Cybersecurity Reddit config
- ✅ `verify_reddit_configuration.sql` - Verification queries
- ✅ `run-reddit-migrations.sh` - Bash script helper (optional)
- ✅ `run-reddit-migrations.py` - Python script helper (optional)

---

## Questions?

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Check the server logs (node server.js output)
3. Check browser console for any API errors
4. Verify the subreddit names are correct (lowercase, no typos)
