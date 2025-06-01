-- Create logging table
CREATE TABLE IF NOT EXISTS application_logs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    level text NOT NULL,
    message text NOT NULL,
    context jsonb,
    timestamp timestamp with time zone NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_logs_level ON application_logs(level);
CREATE INDEX idx_logs_timestamp ON application_logs(timestamp);
CREATE INDEX idx_logs_user_id ON application_logs(user_id);

-- Enable RLS
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserts, no updates or deletes
CREATE POLICY "Enable insert for authenticated users only"
    ON application_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow users to view their own logs
CREATE POLICY "Users can view their own logs"
    ON application_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow admins to view all logs
CREATE POLICY "Admins can view all logs"
    ON application_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );