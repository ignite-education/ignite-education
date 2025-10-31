-- Fix users with incorrect enrolled_course values
-- Standardize on kebab-case course identifiers

-- Show current state BEFORE fixes
SELECT 'BEFORE FIX - Current enrolled_course values:' as info;

SELECT
  enrolled_course,
  COUNT(*) as user_count
FROM users
GROUP BY enrolled_course
ORDER BY enrolled_course;

-- =============================================================================
-- STEP 1: Fix "Product Manager" (with spaces) → "product-manager"
-- =============================================================================

UPDATE users
SET enrolled_course = 'product-manager'
WHERE enrolled_course = 'Product Manager';

-- =============================================================================
-- STEP 2: Fix "Cyber Security Analyst" (with spaces) → "cyber-security-analyst"
-- =============================================================================

UPDATE users
SET enrolled_course = 'cyber-security-analyst'
WHERE enrolled_course = 'Cyber Security Analyst';

-- =============================================================================
-- STEP 3: Fix any old "product-management" → "product-manager"
-- =============================================================================

UPDATE users
SET enrolled_course = 'product-manager'
WHERE enrolled_course = 'product-management';

-- =============================================================================
-- STEP 4: Verify the updates
-- =============================================================================

SELECT 'AFTER FIX - Updated enrolled_course values:' as info;

SELECT
  enrolled_course,
  COUNT(*) as user_count
FROM users
GROUP BY enrolled_course
ORDER BY enrolled_course;

-- =============================================================================
-- EXPECTED FINAL STATE:
-- Only these values should exist:
-- - product-manager
-- - cyber-security-analyst
-- - NULL (for users who haven't enrolled yet)
-- =============================================================================

SELECT 'Fix complete! Expected values: product-manager, cyber-security-analyst, NULL' as info;
