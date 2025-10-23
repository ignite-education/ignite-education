-- Add suggested_question column to lessons table
-- This allows content creators to specify custom suggested questions for each content block
-- These questions will appear in the learning hub when users scroll to that section

ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS suggested_question TEXT;

-- Add comment to document the column
COMMENT ON COLUMN lessons.suggested_question IS 'Custom suggested question that appears when users scroll to this content section in the learning hub';
