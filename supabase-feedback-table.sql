-- Feedback table for PriorAuth Buddy
-- Anonymous feedback (no user_id link for privacy)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow anonymous inserts (anon key can write)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read feedback
CREATE POLICY "Service role reads feedback"
  ON feedback FOR SELECT
  TO service_role
  USING (true);
