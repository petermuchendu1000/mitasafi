-- ===========================================
-- MITASAFI: STORAGE BUCKET & RLS POLICIES
-- ===========================================
-- This migration sets up Supabase Storage for:
-- - Property photos (listing images)
-- - Avatars (user profile pictures)
-- - Documents (lease agreements, IDs, etc.)
-- ===========================================

-- ===========================================
-- 0. DROP EXISTING POLICIES (if any)
-- ===========================================
-- Property photos policies
DROP POLICY IF EXISTS "Users can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view property photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own property photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own property photos" ON storage.objects;

-- Avatars policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Documents policies
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- ===========================================
-- 1. CREATE STORAGE BUCKETS
-- ===========================================

-- Property Photos Bucket (for listing images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars Bucket (for profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Documents Bucket (for leases, IDs - private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ===========================================
-- 2. PROPERTY PHOTOS RLS POLICIES
-- ===========================================

-- Allow authenticated users to upload to their own folder: listings/{user_id}/*
CREATE POLICY "Users can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos'
  AND (storage.foldername(name))[1] = 'listings'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow public read access to all property photos
CREATE POLICY "Public can view property photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-photos');

-- Allow users to update their own photos (for replacing images)
CREATE POLICY "Users can update own property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ===========================================
-- 3. AVATARS RLS POLICIES
-- ===========================================

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ===========================================
-- 4. DOCUMENTS RLS POLICIES (Private Bucket)
-- ===========================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view only their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MITASAFI STORAGE SETUP COMPLETE!';
    RAISE NOTICE 'Buckets: property-photos, avatars, documents';
    RAISE NOTICE 'RLS policies applied for all buckets';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Upload paths:';
    RAISE NOTICE '  Property photos: listings/{user_id}/{filename}';
    RAISE NOTICE '  Avatars: {user_id}/{filename}';
    RAISE NOTICE '  Documents: {user_id}/{filename}';
    RAISE NOTICE '========================================';
END $$;
