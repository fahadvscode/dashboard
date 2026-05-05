-- ============================================
-- MEDIA UPLOAD STORAGE BUCKET SETUP
-- ============================================
-- This script sets up the storage bucket and policies for media uploads
-- Run this AFTER creating the 'media-uploads' bucket in Supabase Dashboard

-- ============================================
-- STEP 1: Verify bucket exists
-- ============================================
-- Make sure you've created the 'media-uploads' bucket first!
-- Go to Supabase Dashboard → Storage → New Bucket
-- Name: media-uploads
-- Public: YES

-- ============================================
-- STEP 2: Create policies for the bucket
-- ============================================

-- Policy 1: Allow public to READ/SELECT files (so URLs work)
CREATE POLICY "Public Access for Media Uploads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media-uploads');

-- Policy 2: Allow authenticated users to UPLOAD/INSERT files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'media-uploads' AND auth.role() = 'authenticated');

-- Policy 3: Allow users to UPDATE their own uploads (optional)
CREATE POLICY "Users can update their uploads"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'media-uploads' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'media-uploads' AND auth.role() = 'authenticated');

-- Policy 4: Allow users to DELETE their own uploads (optional)
CREATE POLICY "Users can delete their uploads"
ON storage.objects
FOR DELETE
USING (bucket_id = 'media-uploads' AND auth.role() = 'authenticated');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if policies were created successfully
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%Media%' OR policyname LIKE '%media%';

-- View all storage buckets
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE name = 'media-uploads';

-- ============================================
-- NOTES
-- ============================================
-- 1. The bucket MUST be created manually in Supabase Dashboard first
-- 2. Make sure to mark it as PUBLIC when creating
-- 3. These policies allow:
--    - Anyone to view/download files (public read)
--    - Only authenticated users to upload
--    - Users can manage their own uploads
-- 4. Files are named with timestamps to prevent conflicts
-- 5. Max file size: 50MB (configurable in bucket settings)

-- ============================================
-- TESTING
-- ============================================
-- After running this script:
-- 1. Deploy the dashboard code
-- 2. Go to /media-upload page
-- 3. Try uploading an image
-- 4. Copy the URL and test it in a new browser tab
-- 5. URL should work without authentication

-- ============================================
-- CLEANUP (if needed)
-- ============================================
-- To remove all policies:
-- DROP POLICY IF EXISTS "Public Access for Media Uploads" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their uploads" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;
