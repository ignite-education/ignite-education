-- Setup Supabase Storage for lesson audio files
-- Run this in Supabase SQL Editor

-- 1. Create the storage bucket for lesson audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-audio', 'lesson-audio', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access to lesson audio files
CREATE POLICY "Public read access for lesson audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-audio');

-- 3. Allow service role to upload/delete files
CREATE POLICY "Service role full access for lesson audio"
ON storage.objects FOR ALL
USING (bucket_id = 'lesson-audio' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'lesson-audio' AND auth.role() = 'service_role');

-- 4. Update lesson_audio table to store file paths instead of base64
-- The section_audio JSONB will now store:
-- [{section_index, text, audio_path, alignment, duration_seconds}]
-- where audio_path is the Storage path like "product-manager/1/1/section_0.mp3"

-- Make sure audio_base64 is nullable (we did this already)
ALTER TABLE lesson_audio ALTER COLUMN audio_base64 DROP NOT NULL;
ALTER TABLE lesson_audio ALTER COLUMN alignment_data DROP NOT NULL;
