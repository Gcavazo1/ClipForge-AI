/*
  # Fix application_logs column and policies

  1. Changes
    - Check if userId column exists before renaming to user_id
    - Update RLS policies to use the correct column name
    - Add index for faster queries
*/

-- Check if userId column exists before renaming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'application_logs' 
    AND column_name = 'userId'
  ) THEN
    ALTER TABLE application_logs RENAME COLUMN "userId" TO "user_id";
  END IF;
END $$;

-- Update RLS policies to use the correct column name
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