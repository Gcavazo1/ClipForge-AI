/*
  # Core Application Schema

  1. New Tables
    - `user_profiles` - Extended user profile information
    - `video_projects` - User video projects
    - `clip_segments` - Video clip segments
    - `transcript_segments` - Video transcript data
    - `analytics_events` - Analytics tracking
    - `user_feedback` - User feedback for AI predictions
    - `prediction_parameters` - AI model parameters per user

  2. Custom Types
    - `project_status` - Video project processing status
    - `segment_type` - Type of clip segment
    - `event_type` - Analytics event types
    - `plan_type` - User subscription plans

  3. Security
    - Row Level Security enabled on all tables
    - Policies for user data isolation
    - Proper foreign key relationships

  4. Functions
    - Trigger functions for updated_at timestamps
    - User profile creation trigger
*/

-- Create custom enum types
CREATE TYPE project_status AS ENUM (
    'uploading',
    'processing', 
    'transcribing',
    'analyzing',
    'ready',
    'error',
    'archived'
);

CREATE TYPE segment_type AS ENUM (
    'highlight',
    'manual',
    'auto_detected',
    'user_created',
    'ai_suggested'
);

CREATE TYPE event_type AS ENUM (
    'view',
    'like',
    'comment',
    'share',
    'download',
    'export',
    'upload'
);

CREATE TYPE plan_type AS ENUM (
    'free',
    'pro',
    'enterprise'
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    avatar_url text,
    plan_type plan_type DEFAULT 'free',
    usage_stats jsonb DEFAULT '{
        "clips_created": 0,
        "exports_used": 0,
        "storage_used": 0,
        "last_reset_date": null
    }'::jsonb,
    preferences jsonb DEFAULT '{
        "notifications": {
            "email": true,
            "push": true
        },
        "default_export_settings": {
            "format": "mp4",
            "quality": "high",
            "include_captions": true
        }
    }'::jsonb,
    onboarding_completed boolean DEFAULT false,
    last_active_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Add indexes for better performance
CREATE INDEX idx_user_profiles_plan_type ON user_profiles(plan_type);
CREATE INDEX idx_user_profiles_last_active ON user_profiles(last_active_at);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Video Projects Table
CREATE TABLE IF NOT EXISTS video_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    video_url text,
    thumbnail_url text,
    original_filename text,
    duration numeric DEFAULT 0,
    file_size bigint DEFAULT 0,
    mime_type text,
    status project_status DEFAULT 'uploading',
    progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    processing_started_at timestamptz,
    processing_completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Add indexes
CREATE INDEX idx_video_projects_user_id ON video_projects(user_id);
CREATE INDEX idx_video_projects_status ON video_projects(status);
CREATE INDEX idx_video_projects_created_at ON video_projects(created_at DESC);
CREATE INDEX idx_video_projects_user_status ON video_projects(user_id, status);

-- Enable RLS
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_projects
CREATE POLICY "Users can view their own projects"
    ON video_projects
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own projects"
    ON video_projects
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects"
    ON video_projects
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects"
    ON video_projects
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER handle_video_projects_updated_at
    BEFORE UPDATE ON video_projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Clip Segments Table
CREATE TABLE IF NOT EXISTS clip_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES video_projects(id) ON DELETE CASCADE NOT NULL,
    title text,
    start_time numeric NOT NULL CHECK (start_time >= 0),
    end_time numeric NOT NULL CHECK (end_time > start_time),
    is_highlight boolean DEFAULT false,
    confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
    segment_type segment_type DEFAULT 'manual',
    summary text,
    metadata jsonb DEFAULT '{}'::jsonb,
    export_count integer DEFAULT 0,
    last_exported_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_clip_segments_project_id ON clip_segments(project_id);
CREATE INDEX idx_clip_segments_highlight ON clip_segments(is_highlight);
CREATE INDEX idx_clip_segments_confidence ON clip_segments(confidence DESC);
CREATE INDEX idx_clip_segments_time_range ON clip_segments(start_time, end_time);

-- Enable RLS
ALTER TABLE clip_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clip_segments
CREATE POLICY "Users can view clips from their projects"
    ON clip_segments
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM video_projects 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can insert clips to their projects"
    ON clip_segments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT id FROM video_projects 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update clips from their projects"
    ON clip_segments
    FOR UPDATE
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM video_projects 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can delete clips from their projects"
    ON clip_segments
    FOR DELETE
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM video_projects 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER handle_clip_segments_updated_at
    BEFORE UPDATE ON clip_segments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Transcript Segments Table
CREATE TABLE IF NOT EXISTS transcript_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES video_projects(id) ON DELETE CASCADE NOT NULL,
    start_time numeric NOT NULL CHECK (start_time >= 0),
    end_time numeric NOT NULL CHECK (end_time > start_time),
    text text NOT NULL,
    speaker_id text,
    speaker_name text,
    confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
    language text DEFAULT 'en',
    word_count integer,
    created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_transcript_segments_project_id ON transcript_segments(project_id);
CREATE INDEX idx_transcript_segments_time_range ON transcript_segments(start_time, end_time);
CREATE INDEX idx_transcript_segments_speaker ON transcript_segments(speaker_id);

-- Enable RLS
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transcript_segments
CREATE POLICY "Users can view transcripts from their projects"
    ON transcript_segments
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT id FROM video_projects 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY "Users can insert transcripts to their projects"
    ON transcript_segments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT id FROM video_projects 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id uuid REFERENCES video_projects(id) ON DELETE CASCADE,
    clip_id uuid REFERENCES clip_segments(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    platform text,
    views integer DEFAULT 0,
    likes integer DEFAULT 0,
    comments integer DEFAULT 0,
    shares integer DEFAULT 0,
    watch_time numeric DEFAULT 0,
    engagement_rate numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    posted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_project_id ON analytics_events(project_id);
CREATE INDEX idx_analytics_events_clip_id ON analytics_events(clip_id);
CREATE INDEX idx_analytics_events_platform ON analytics_events(platform);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
CREATE POLICY "Users can view their own analytics"
    ON analytics_events
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own analytics"
    ON analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analytics"
    ON analytics_events
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER handle_analytics_events_updated_at
    BEFORE UPDATE ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    prophecy_id text NOT NULL,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    was_helpful boolean,
    comment text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_feedback
CREATE POLICY "Users can view their own feedback"
    ON user_feedback
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own feedback"
    ON user_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Prediction Parameters Table
CREATE TABLE IF NOT EXISTS prediction_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    adjustment_factors jsonb DEFAULT '{
        "like_multiplier": 1.0,
        "view_multiplier": 1.0,
        "comment_multiplier": 1.0,
        "confidence_adjustment": 0
    }'::jsonb,
    model_version text DEFAULT 'v1.0',
    accuracy_score numeric,
    last_trained_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_prediction_parameters_user_id ON prediction_parameters(user_id);

-- Enable RLS
ALTER TABLE prediction_parameters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prediction_parameters
CREATE POLICY "Users can view their own prediction parameters"
    ON prediction_parameters
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own prediction parameters"
    ON prediction_parameters
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own prediction parameters"
    ON prediction_parameters
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER handle_prediction_parameters_updated_at
    BEFORE UPDATE ON prediction_parameters
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create helpful views
CREATE VIEW user_project_stats WITH (security_invoker) AS
SELECT 
    user_id,
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE status = 'ready') as completed_projects,
    COUNT(*) FILTER (WHERE status IN ('processing', 'transcribing', 'analyzing')) as processing_projects,
    COUNT(*) FILTER (WHERE status = 'error') as failed_projects,
    COALESCE(SUM(file_size), 0) as total_storage_used,
    COALESCE(AVG(duration), 0) as avg_video_duration
FROM video_projects 
WHERE deleted_at IS NULL
GROUP BY user_id;

CREATE VIEW user_analytics_summary WITH (security_invoker) AS
SELECT 
    user_id,
    COUNT(*) as total_events,
    COALESCE(SUM(views), 0) as total_views,
    COALESCE(SUM(likes), 0) as total_likes,
    COALESCE(SUM(comments), 0) as total_comments,
    COALESCE(SUM(shares), 0) as total_shares,
    COALESCE(AVG(engagement_rate), 0) as avg_engagement_rate,
    COUNT(DISTINCT platform) as platforms_used
FROM analytics_events
GROUP BY user_id;

-- Create a view for user files (if using Supabase Storage)
CREATE VIEW user_files WITH (security_invoker) AS
SELECT 
    name as file_name,
    bucket_id,
    metadata->>'size' as file_size,
    metadata->>'mimetype' as mime_type,
    created_at,
    updated_at,
    CASE 
        WHEN bucket_id = 'avatars' THEN 
            'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/' || bucket_id || '/' || name
        ELSE 
            'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/sign/' || bucket_id || '/' || name
    END as public_url
FROM storage.objects 
WHERE owner = auth.uid();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT SELECT ON user_project_stats TO authenticated;
GRANT SELECT ON user_analytics_summary TO authenticated;
GRANT SELECT ON user_files TO authenticated;