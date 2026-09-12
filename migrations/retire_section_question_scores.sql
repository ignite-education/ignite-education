-- Retire the per-section scoring path, replaced by lesson_checkpoint_attempts.
--
-- Run AFTER create_lesson_checkpoint_attempts.sql — that migration redefines
-- refresh_achievement_percentile_stats() to stop reading section_question_scores,
-- and dropping the table first would leave the function broken in between.
--
-- Nothing of value is lost. At the time of writing production held 4 rows from a
-- single user, every one of them already orphaned: the scores sat at section_number
-- 14, 20, 23 and 33 while the actual scored_question blocks were at 15, 24 and 34.
-- CurriculumUpload renumbers blocks on save, so positional score keys drift the
-- moment anyone edits a lesson.

DROP TABLE IF EXISTS section_question_scores;

-- The three scored_question blocks (all in product-manager M1 L1). The block type
-- is gone from shared/lesson/blockTypes.js, so these rows would render nothing and
-- would still occupy their own screen in the player's pagination.
DELETE FROM lessons WHERE content_type = 'scored_question';
