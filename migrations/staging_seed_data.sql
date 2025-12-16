-- ============================================================================
-- STAGING SEED DATA
-- ============================================================================
-- Run this AFTER staging_schema.sql to add test data
-- This creates sample courses and a test admin user
-- ============================================================================

-- ============================================================================
-- SAMPLE COURSES (copy your production courses here)
-- ============================================================================
-- You'll need to export this from your production Supabase and paste here
-- Go to Production Supabase > Table Editor > courses > Export as SQL

-- Example structure (update with your actual data):
INSERT INTO courses (name, title, status, modules, lessons, description, display_order, reddit_channel, reddit_url)
VALUES
  ('product-manager', 'Product Manager', 'live', '3', 15, 'Master the fundamentals of product management, from strategy to execution.', 1, 'r/productmanagement', 'https://www.reddit.com/r/productmanagement/'),
  ('cyber-security-analyst', 'Cyber Security Analyst', 'coming_soon', 'Multiple', 0, 'Learn essential cybersecurity skills to protect systems and data from threats.', 2, 'r/cybersecurity', 'https://www.reddit.com/r/cybersecurity/'),
  ('data-analyst', 'Data Analyst', 'coming_soon', 'Multiple', 0, 'Analyze data to drive business insights and drive decision-making.', 3, NULL, NULL),
  ('ux-designer', 'UX Designer', 'coming_soon', 'Multiple', 0, 'Design user-centered experiences that delight and engage.', 4, NULL, NULL)
ON CONFLICT (name) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  description = EXCLUDED.description;

-- ============================================================================
-- NOTE: To copy lesson content from production
-- ============================================================================
-- 1. Go to Production Supabase > SQL Editor
-- 2. Run: SELECT * FROM lessons WHERE course_id = 'product-manager';
-- 3. Export as SQL INSERT statements
-- 4. Paste the INSERT statements below
-- 5. Run this file in Staging Supabase

-- LESSONS DATA GOES HERE:
-- (Export from production and paste)

-- ============================================================================
-- TEST ADMIN USER
-- ============================================================================
-- After creating a user through the app, run this to make them admin:
-- UPDATE users SET role = 'admin' WHERE id = 'your-user-id';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ BEGIN RAISE NOTICE 'Staging seed data inserted successfully!'; END $$;
