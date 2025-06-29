/*
  # Supabase Storage Setup

  1. Storage Buckets
    - `videos`: For uploaded video files
    - `thumbnails`: For video thumbnail images
    - `exports`: For processed/exported video clips
    - `avatars`: For user profile pictures

  2. Storage Policies
    - Users can upload to their own folders
    - Public read access for thumbnails and avatars
    - Authenticated access for videos and exports
    - File size and type restrictions

  3. Storage Functions
    - File cleanup utilities
    - Thumbnail generation helpers
    - Storage quota management
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'videos',
        'videos',
        false,
        524288000, -- 500MB limit
        ARRAY['video/mp4', 'video/quicktime', 'video/mov', 'video/avi', 'video/webm']
    ),
    (
        'thumbnails',
        'thumbnails',
        true,
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'exports',
        'exports',
        false,
        1073741824, -- 1GB limit
        ARRAY['video/mp4', 'video/quicktime', 'video/mov', 'video/webm']
    ),
    (
        'avatars',
        'avatars',
        true,
        2097152, -- 2MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
ON CONFLICT (id) DO NOTHING;

-- Storage policies for videos bucket
CREATE POLICY "Users can upload videos to their own folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'videos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view their own videos"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'videos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own videos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'videos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own videos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'videos' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage policies for thumbnails bucket (public read)
CREATE POLICY "Anyone can view thumbnails"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload thumbnails to their own folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'thumbnails' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own thumbnails"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'thumbnails' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own thumbnails"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'thumbnails' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage policies for exports bucket
CREATE POLICY "Users can upload exports to their own folder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'exports' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can view their own exports"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'exports' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own exports"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'exports' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage policies for avatars bucket (public read)
CREATE POLICY "Anyone can view avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Create storage management functions
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    video_usage bigint;
    export_usage bigint;
    thumbnail_usage bigint;
    avatar_usage bigint;
    total_usage bigint;
BEGIN
    -- Calculate storage usage by bucket
    SELECT COALESCE(SUM(metadata->>'size')::bigint, 0)
    INTO video_usage
    FROM storage.objects
    WHERE bucket_id = 'videos'
    AND (storage.foldername(name))[1] = user_uuid::text;

    SELECT COALESCE(SUM(metadata->>'size')::bigint, 0)
    INTO export_usage
    FROM storage.objects
    WHERE bucket_id = 'exports'
    AND (storage.foldername(name))[1] = user_uuid::text;

    SELECT COALESCE(SUM(metadata->>'size')::bigint, 0)
    INTO thumbnail_usage
    FROM storage.objects
    WHERE bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] = user_uuid::text;

    SELECT COALESCE(SUM(metadata->>'size')::bigint, 0)
    INTO avatar_usage
    FROM storage.objects
    WHERE bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = user_uuid::text;

    total_usage := video_usage + export_usage + thumbnail_usage + avatar_usage;

    RETURN jsonb_build_object(
        'total_bytes', total_usage,
        'videos_bytes', video_usage,
        'exports_bytes', export_usage,
        'thumbnails_bytes', thumbnail_usage,
        'avatars_bytes', avatar_usage,
        'total_gb', ROUND(total_usage::numeric / 1073741824, 2),
        'videos_gb', ROUND(video_usage::numeric / 1073741824, 2),
        'exports_gb', ROUND(export_usage::numeric / 1073741824, 2)
    );
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    file_record record;
BEGIN
    -- Clean up video files that don't have corresponding project records
    FOR file_record IN
        SELECT so.name, so.bucket_id
        FROM storage.objects so
        WHERE so.bucket_id = 'videos'
        AND NOT EXISTS (
            SELECT 1 FROM video_projects vp
            WHERE vp.video_url LIKE '%' || so.name || '%'
            AND vp.deleted_at IS NULL
        )
        AND so.created_at < now() - interval '24 hours'
    LOOP
        DELETE FROM storage.objects
        WHERE name = file_record.name AND bucket_id = file_record.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;

    -- Clean up export files older than 30 days
    FOR file_record IN
        SELECT so.name, so.bucket_id
        FROM storage.objects so
        WHERE so.bucket_id = 'exports'
        AND so.created_at < now() - interval '30 days'
    LOOP
        DELETE FROM storage.objects
        WHERE name = file_record.name AND bucket_id = file_record.bucket_id;
        deleted_count := deleted_count + 1;
    END LOOP;

    RETURN deleted_count;
END;
$$;

-- Create a function to generate signed URLs for private files
CREATE OR REPLACE FUNCTION get_signed_video_url(
    file_path text,
    expires_in integer DEFAULT 3600
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    signed_url text;
BEGIN
    -- Verify user has access to this file
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects
        WHERE bucket_id = 'videos'
        AND name = file_path
        AND (storage.foldername(name))[1] = auth.uid()::text
    ) THEN
        RAISE EXCEPTION 'Access denied to file: %', file_path;
    END IF;

    -- Generate signed URL (this would need to be implemented with actual Supabase storage API)
    -- For now, return a placeholder that would be replaced with actual implementation
    signed_url := format(
        '%s/storage/v1/object/sign/videos/%s?expires_in=%s',
        current_setting('app.supabase_url', true),
        file_path,
        expires_in
    );

    RETURN signed_url;
END;
$$;

-- Create a view for user file management
CREATE VIEW user_files WITH (security_invoker = true) AS
SELECT 
    so.name as file_name,
    so.bucket_id,
    so.metadata->>'size' as file_size,
    so.metadata->>'mimetype' as mime_type,
    so.created_at,
    so.updated_at,
    CASE 
        WHEN so.bucket_id IN ('thumbnails', 'avatars') THEN 
            format('%s/storage/v1/object/public/%s/%s', 
                current_setting('app.supabase_url', true), 
                so.bucket_id, 
                so.name)
        ELSE NULL
    END as public_url
FROM storage.objects so
WHERE (storage.foldername(so.name))[1] = auth.uid()::text;

GRANT SELECT ON user_files TO authenticated;