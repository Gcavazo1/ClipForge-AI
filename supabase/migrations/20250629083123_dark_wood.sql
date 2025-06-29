/*
  # Fix application_logs table

  1. Changes
    - Rename userId column to user_id to match Supabase conventions
    - Add indexes for better query performance
    - Update RLS policies to use the new column name
*/

-- Rename userId column to user_id
ALTER TABLE application_logs 
RENAME COLUMN "userId" TO "user_id";

-- Update RLS policies to use the new column name
DROP POLICY IF EXISTS "Users can view their own logs" ON application_logs;
CREATE POLICY "Users can view their own logs"
  ON application_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON application_logs;
CREATE POLICY "Enable insert for authenticated users only"
  ON application_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_logs_user_id_level_timestamp
  ON application_logs (user_id, level, timestamp);