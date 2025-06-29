/*
  # Fix application logs table

  1. Changes
     - Rename userId column to user_id to match naming convention
     - Add indexes for better query performance
     - Add constraints for data integrity

  2. Security
     - Maintain existing RLS policies
*/

-- Check if the column exists and rename it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'application_logs' AND column_name = 'userId'
  ) THEN
    ALTER TABLE application_logs RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

-- Check if the column doesn't exist and add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'application_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE application_logs ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'application_logs' AND indexname = 'idx_logs_user_id'
  ) THEN
    CREATE INDEX idx_logs_user_id ON application_logs(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'application_logs' AND indexname = 'idx_logs_level'
  ) THEN
    CREATE INDEX idx_logs_level ON application_logs(level);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'application_logs' AND indexname = 'idx_logs_timestamp'
  ) THEN
    CREATE INDEX idx_logs_timestamp ON application_logs("timestamp");
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'application_logs' AND indexname = 'idx_logs_user_id_level_timestamp'
  ) THEN
    CREATE INDEX idx_logs_user_id_level_timestamp ON application_logs(user_id, level, "timestamp");
  END IF;
END $$;