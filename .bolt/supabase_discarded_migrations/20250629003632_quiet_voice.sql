/*
  # Core Application Tables

  1. New Tables
    - `user_profiles`: Extended user information and preferences
      - Links to `auth.users` with additional profile data
      - Stores plan type, usage stats, and preferences
      - Implements soft delete pattern

    - `video_projects`: Core video project management
      - Stores video metadata, processing status, and file references
      - Links to user profiles for ownership
      - Tracks processing status and progress
      - Implements soft delete pattern

    - `clip_segments`: Video clip segments and highlights
      - Stores clip timing, metadata, and AI confidence scores
      - Links to video projects
      - Supports highlight detection and manual clips
      - Tracks segment types and confidence levels

    - `transcript_segments`: Video transcription data
      - Stores timestamped transcript segments
      - Links to video projects
      - Supports speaker identification and language detection
      - Optimized for timeline synchronization

    - `analytics_events`: Performance tracking and analytics
      - Records video performance across platforms
      - Tracks views, engagement, and user interactions
      - Supports trend analysis and reporting
      - Links to clips and users

    - `user_feedback`: Prophecy feedback and model improvement
      - Collects user feedback on AI predictions
      - Tracks prediction accuracy over time
      - Supports model training and improvement
      - Links to users and analytics events

    - `prediction_parameters`: AI model parameters per user
      - Stores personalized prediction model adjustments
      - Tracks model performance and accuracy
      - Supports A/B testing and optimization
      - User-specific model tuning

  2. Enums
    - `project_status`: Video project processing states
    - `segment_type`: Types of clip segments (highlight, manual, etc.)
    - `event_type`: Analytics event categories
    - `plan_type`: User subscription plan types

  3. Security
    - Enables Row Level Security (RLS) on all tables
    - Implements policies for user data isolation
    - Ensures users can only access their own data
    - Provides secure views for complex queries

  4. Indexes
    - Optimized for common query patterns
    - Supports efficient timeline operations
    - Enables fast analytics aggregations
    - Improves search and filtering performance

  5. Functions
    - User profile management
    - Project status updates
    - Analytics aggregation helpers
    - Cleanup and maintenance functions
*/

-- Create custom types
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
            "quality": "high",
            "format": "mp4",
            "include_captions": true
        }
    }'::jsonb,
    onboarding_completed boolean DEFAULT false,
    last_active_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

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

-- Prediction Parameters Table
CREATE TABLE IF NOT EXISTS prediction_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    adjustment_factors jsonb DEFAULT '{
        "view_multiplier": 1.0,
        "like_multiplier": 1.0,
        "comment_multiplier": 1.0,
        "confidence_adjustment": 0
    }'::jsonb,
    model_version text DEFAULT 'v1.0',
    accuracy_score numeric,
    last_trained_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan_type ON user_profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON user_profiles(last_active_at);

CREATE INDEX IF NOT EXISTS idx_video_projects_user_id ON video_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_status ON video_projects(status);
CREATE INDEX IF NOT EXISTS idx_video_projects_created_at ON video_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_projects_user_status ON video_projects(user_id, status);

CREATE INDEX IF NOT EXISTS idx_clip_segments_project_id ON clip_segments(project_id);
CREATE INDEX IF NOT EXISTS idx_clip_segments_highlight ON clip_segments(is_highlight);
CREATE INDEX IF NOT EXISTS idx_clip_segments_time_range ON clip_segments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_clip_segments_confidence ON clip_segments(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_transcript_segments_project_id ON transcript_segments(project_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_time_range ON transcript_segments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_speaker ON transcript_segments(speaker_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_clip_id ON analytics_events(clip_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_parameters_user_id ON prediction_parameters(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_parameters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

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

-- Create helpful views
CREATE VIEW user_project_stats WITH (security_invoker = true) AS
SELECT 
    p.user_id,
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE p.status = 'ready') as completed_projects,
    COUNT(*) FILTER (WHERE p.status = 'processing') as processing_projects,
    COUNT(*) FILTER (WHERE p.status = 'error') as failed_projects,
    SUM(p.file_size) as total_storage_used,
    AVG(p.duration) as avg_video_duration
FROM video_projects p
WHERE p.deleted_at IS NULL
GROUP BY p.user_id;

CREATE VIEW user_analytics_summary WITH (security_invoker = true) AS
SELECT 
    a.user_id,
    COUNT(*) as total_events,
    SUM(a.views) as total_views,
    SUM(a.likes) as total_likes,
    SUM(a.comments) as total_comments,
    SUM(a.shares) as total_shares,
    AVG(a.engagement_rate) as avg_engagement_rate,
    COUNT(DISTINCT a.platform) as platforms_used
FROM analytics_events a
GROUP BY a.user_id;

-- Grant permissions on views
GRANT SELECT ON user_project_stats TO authenticated;
GRANT SELECT ON user_analytics_summary TO authenticated;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_project_status(
    project_id uuid,
    new_status project_status,
    progress_value integer DEFAULT NULL,
    error_msg text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE video_projects 
    SET 
        status = new_status,
        progress = COALESCE(progress_value, progress),
        error_message = error_msg,
        updated_at = now(),
        processing_completed_at = CASE 
            WHEN new_status IN ('ready', 'error') THEN now()
            ELSE processing_completed_at
        END,
        processing_started_at = CASE 
            WHEN new_status = 'processing' AND processing_started_at IS NULL THEN now()
            ELSE processing_started_at
        END
    WHERE id = project_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION get_user_usage_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'clips_created', COUNT(cs.*),
        'exports_used', SUM(cs.export_count),
        'storage_used', COALESCE(SUM(vp.file_size), 0),
        'projects_count', COUNT(DISTINCT vp.id),
        'last_activity', MAX(vp.updated_at)
    )
    INTO stats
    FROM video_projects vp
    LEFT JOIN clip_segments cs ON vp.id = cs.project_id
    WHERE vp.user_id = user_uuid
    AND vp.deleted_at IS NULL;
    
    RETURN COALESCE(stats, '{}'::jsonb);
END;
$$;

-- Create trigger to automatically create user profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_video_projects_updated_at
    BEFORE UPDATE ON video_projects
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_clip_segments_updated_at
    BEFORE UPDATE ON clip_segments
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_analytics_events_updated_at
    BEFORE UPDATE ON analytics_events
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_prediction_parameters_updated_at
    BEFORE UPDATE ON prediction_parameters
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();