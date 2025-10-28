-- STEP 1: Review all current courses
-- Run this FIRST to see what you have
SELECT
  id,
  name,
  title,
  status,
  modules,
  lessons,
  display_order,
  CASE
    WHEN (modules IS NULL OR modules = '' OR modules = '-') AND (lessons = 0 OR lessons IS NULL) AND (description IS NULL OR description = '' OR LENGTH(description) < 50) THEN 'WILL BE DELETED'
    ELSE 'WILL BE KEPT'
  END as action,
  LEFT(COALESCE(description, 'NO DESCRIPTION'), 60) as description_preview
FROM courses
ORDER BY display_order, name;

-- After reviewing the above results, uncomment and run the sections below one by one

-- STEP 2: Delete ONLY incomplete test entries (no description)
/*
DELETE FROM courses
WHERE (
  (modules IS NULL OR modules = '' OR modules = '-')
  AND (lessons = 0 OR lessons IS NULL)
  AND (description IS NULL OR description = '' OR LENGTH(description) < 50)
);
*/

-- STEP 3: Remove exact duplicates (same name AND title)
/*
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name, title
      ORDER BY
        CASE WHEN description IS NOT NULL AND description != '' THEN 1 ELSE 0 END DESC,
        CASE WHEN modules IS NOT NULL AND modules != '' AND modules != '-' THEN 1 ELSE 0 END DESC,
        lessons DESC,
        id DESC
    ) as rn
  FROM courses
)
DELETE FROM courses
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- STEP 4: Fix modules that show '-' to 'Multiple'
/*
UPDATE courses
SET modules = 'Multiple'
WHERE modules IS NULL OR modules = '' OR modules = '-';
*/

-- STEP 5: Update display order for main courses
/*
UPDATE courses
SET display_order = CASE
  WHEN LOWER(name) LIKE '%product%' AND LOWER(name) LIKE '%manager%' THEN 1
  WHEN LOWER(title) LIKE '%product%' AND LOWER(title) LIKE '%manager%' THEN 1
  WHEN LOWER(name) LIKE '%cyber%' OR LOWER(name) LIKE '%security%' THEN 2
  WHEN LOWER(title) LIKE '%cyber%' OR LOWER(title) LIKE '%security%' THEN 2
  WHEN LOWER(name) LIKE '%data%' AND LOWER(name) LIKE '%analyst%' THEN 3
  WHEN LOWER(title) LIKE '%data%' AND LOWER(title) LIKE '%analyst%' THEN 3
  WHEN LOWER(name) LIKE '%ux%' OR LOWER(name) LIKE '%designer%' THEN 4
  WHEN LOWER(title) LIKE '%ux%' OR LOWER(title) LIKE '%designer%' THEN 4
  ELSE display_order
END
WHERE display_order IS NULL OR display_order = 0 OR display_order IN (1, 2, 3, 4);
*/

-- STEP 6: View final cleaned data
/*
SELECT
  id,
  name,
  title,
  status,
  modules,
  lessons,
  display_order,
  LEFT(description, 60) as description_preview
FROM courses
ORDER BY display_order, name;
*/
