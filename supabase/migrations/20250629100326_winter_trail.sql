/*
  # Prophecy System Enhancement

  1. New Tables
    - `prophecy_history` - Stores historical predictions with metadata
    - `prophecy_results` - Stores actual results for comparison with predictions
    - `model_experiments` - Tracks A/B testing of different prediction models
    - `content_features` - Stores extracted features from content for prediction

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their own data

  3. Changes
    - Enhance prediction_parameters table with more fields
*/

-- Create prophecy_history table to store all predictions
CREATE TABLE IF NOT EXISTS prophecy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  clip_id UUID REFERENCES clip_segments(id),
  predicted_views INTEGER NOT NULL,
  predicted_likes INTEGER NOT NULL,
  predicted_comments INTEGER NOT NULL,
  predicted_shares INTEGER,
  confidence NUMERIC NOT NULL,
  confidence_interval JSONB,
  model_type TEXT NOT NULL,
  model_version TEXT NOT NULL,
  features JSONB NOT NULL,
  feature_importance JSONB,
  recommendations JSONB,
  insights JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create prophecy_results table to track actual vs predicted performance
CREATE TABLE IF NOT EXISTS prophecy_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prophecy_id UUID REFERENCES prophecy_history(id) NOT NULL,
  actual_views INTEGER,
  actual_likes INTEGER,
  actual_comments INTEGER,
  actual_shares INTEGER,
  accuracy_score NUMERIC,
  platform TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Create model_experiments table for A/B testing
CREATE TABLE IF NOT EXISTS model_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  model_id TEXT NOT NULL,
  experiment_group TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  results JSONB
);

-- Create content_features table to store extracted features
CREATE TABLE IF NOT EXISTS content_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID REFERENCES clip_segments(id) NOT NULL,
  content_features JSONB NOT NULL,
  temporal_features JSONB NOT NULL,
  user_features JSONB NOT NULL,
  platform_features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhance prediction_parameters table
ALTER TABLE prediction_parameters 
ADD COLUMN IF NOT EXISTS model_weights JSONB DEFAULT '{"linear": 0.3, "randomForest": 0.7}';

ALTER TABLE prediction_parameters 
ADD COLUMN IF NOT EXISTS feature_weights JSONB;

ALTER TABLE prediction_parameters 
ADD COLUMN IF NOT EXISTS hyperparameters JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prophecy_history_user_id ON prophecy_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prophecy_history_clip_id ON prophecy_history(clip_id);
CREATE INDEX IF NOT EXISTS idx_prophecy_history_created_at ON prophecy_history(created_at);
CREATE INDEX IF NOT EXISTS idx_prophecy_results_prophecy_id ON prophecy_results(prophecy_id);
CREATE INDEX IF NOT EXISTS idx_model_experiments_user_id ON model_experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_features_clip_id ON content_features(clip_id);

-- Enable Row Level Security
ALTER TABLE prophecy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prophecy_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_features ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own prophecy history"
  ON prophecy_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own prophecy history"
  ON prophecy_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own prophecy results"
  ON prophecy_results
  FOR SELECT
  TO authenticated
  USING (prophecy_id IN (
    SELECT id FROM prophecy_history WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own prophecy results"
  ON prophecy_results
  FOR INSERT
  TO authenticated
  WITH CHECK (prophecy_id IN (
    SELECT id FROM prophecy_history WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own model experiments"
  ON model_experiments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own model experiments"
  ON model_experiments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own content features"
  ON content_features
  FOR SELECT
  TO authenticated
  USING (clip_id IN (
    SELECT cs.id FROM clip_segments cs
    JOIN video_projects vp ON cs.project_id = vp.id
    WHERE vp.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own content features"
  ON content_features
  FOR INSERT
  TO authenticated
  WITH CHECK (clip_id IN (
    SELECT cs.id FROM clip_segments cs
    JOIN video_projects vp ON cs.project_id = vp.id
    WHERE vp.user_id = auth.uid()
  ));

-- Create function to calculate accuracy
CREATE OR REPLACE FUNCTION calculate_prophecy_accuracy(
  predicted_views INTEGER,
  predicted_likes INTEGER,
  predicted_comments INTEGER,
  actual_views INTEGER,
  actual_likes INTEGER,
  actual_comments INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  views_accuracy NUMERIC;
  likes_accuracy NUMERIC;
  comments_accuracy NUMERIC;
  overall_accuracy NUMERIC;
BEGIN
  -- Calculate accuracy for each metric (1 - relative error)
  views_accuracy := CASE 
    WHEN predicted_views = 0 THEN 0
    ELSE GREATEST(0, 1 - ABS(actual_views - predicted_views)::NUMERIC / predicted_views)
  END;
  
  likes_accuracy := CASE 
    WHEN predicted_likes = 0 THEN 0
    ELSE GREATEST(0, 1 - ABS(actual_likes - predicted_likes)::NUMERIC / predicted_likes)
  END;
  
  comments_accuracy := CASE 
    WHEN predicted_comments = 0 THEN 0
    ELSE GREATEST(0, 1 - ABS(actual_comments - predicted_comments)::NUMERIC / predicted_comments)
  END;
  
  -- Weighted average (views 40%, likes 40%, comments 20%)
  overall_accuracy := (views_accuracy * 0.4 + likes_accuracy * 0.4 + comments_accuracy * 0.2) * 100;
  
  RETURN overall_accuracy;
END;
$$ LANGUAGE plpgsql;

-- Create view for prophecy accuracy analysis
CREATE OR REPLACE VIEW prophecy_accuracy_analysis AS
SELECT
  ph.user_id,
  ph.model_type,
  DATE_TRUNC('day', ph.created_at) AS prediction_date,
  AVG(pr.accuracy_score) AS avg_accuracy,
  COUNT(*) AS prediction_count,
  STDDEV(pr.accuracy_score) AS accuracy_stddev
FROM
  prophecy_history ph
JOIN
  prophecy_results pr ON ph.id = pr.prophecy_id
GROUP BY
  ph.user_id,
  ph.model_type,
  DATE_TRUNC('day', ph.created_at)
ORDER BY
  ph.user_id,
  DATE_TRUNC('day', ph.created_at);

-- Create function to get best model for user
CREATE OR REPLACE FUNCTION get_best_model_for_user(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  best_model TEXT;
  best_accuracy NUMERIC := 0;
  model_accuracy NUMERIC;
BEGIN
  -- Find model with highest accuracy for this user
  FOR best_model, model_accuracy IN
    SELECT 
      model_type, 
      AVG(pr.accuracy_score) AS avg_accuracy
    FROM 
      prophecy_history ph
    JOIN 
      prophecy_results pr ON ph.id = pr.prophecy_id
    WHERE 
      ph.user_id = user_uuid
    GROUP BY 
      model_type
    ORDER BY 
      avg_accuracy DESC
  LOOP
    -- Return the first (highest accuracy) model
    RETURN best_model;
  END LOOP;
  
  -- If no data, return default model
  RETURN 'ensemble';
END;
$$ LANGUAGE plpgsql;