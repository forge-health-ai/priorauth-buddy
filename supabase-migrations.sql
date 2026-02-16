-- Migration: Add subscription_tier, document_type, and case_events.title
-- Run this in Supabase SQL Editor

-- Add subscription tier to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

-- Add document_type to appeals table so we can store both appeal letters AND DOI complaints
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'appeal';

-- Ensure case_events has all needed columns
ALTER TABLE case_events ADD COLUMN IF NOT EXISTS title text;

-- Anonymous outcome tracking (NO user_id, NO PII)
CREATE TABLE IF NOT EXISTS anonymous_outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insurer_name text NOT NULL,
  procedure_type text NOT NULL,
  procedure_category text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('won', 'lost', 'pending')),
  appeal_count integer DEFAULT 1,
  used_peer_review boolean DEFAULT false,
  used_doi_complaint boolean DEFAULT false,
  days_to_resolution integer,
  created_at timestamptz DEFAULT now()
);

-- Allow anyone authenticated to insert (anonymous, no user_id)
ALTER TABLE anonymous_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert outcomes" ON anonymous_outcomes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read outcomes" ON anonymous_outcomes FOR SELECT TO authenticated USING (true);
