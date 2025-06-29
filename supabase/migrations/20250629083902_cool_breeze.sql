/*
  # Fix application_logs column name

  1. Changes
     - Safely renames 'userId' column to 'user_id' if it exists
     - Adds 'user_id' column if neither exists
     - Updates RLS policies to use the correct column name
     - Adds index for better query performance
*/

-- Check if the column exists before trying to rename it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'application_logs' 
    AND column_name = 'userId'
  ) THEN
    ALTER TABLE application_logs RENAME COLUMN "userId" TO "user_id";
  ELSIF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'application_logs' 
    AND column_name = 'user_id'
  ) THEN
    -- If neither userId nor user_id exists, add the user_id column
    ALTER TABLE application_logs ADD COLUMN "user_id" uuid REFERENCES auth.users(id);
  END IF;
END $$;

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