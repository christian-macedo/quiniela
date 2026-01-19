-- Add Storage RLS Policies for user-avatars and team-logos buckets

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This is typically enabled by default in Supabase

-- Policies for user-avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to all avatars (bucket is public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- Policies for team-logos bucket
-- Allow authenticated users to upload team logos
CREATE POLICY "Authenticated users can upload team logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-logos');

-- Allow authenticated users to update team logos
CREATE POLICY "Authenticated users can update team logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-logos')
WITH CHECK (bucket_id = 'team-logos');

-- Allow authenticated users to delete team logos
CREATE POLICY "Authenticated users can delete team logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'team-logos');

-- Allow public read access to all team logos (bucket is public)
CREATE POLICY "Anyone can view team logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'team-logos');
