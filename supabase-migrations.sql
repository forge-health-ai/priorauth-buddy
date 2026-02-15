-- Migration: Add subscription_tier, document_type, and case_events.title
-- Run this in Supabase SQL Editor

-- Add subscription tier to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

-- Add document_type to appeals table so we can store both appeal letters AND DOI complaints
ALTER TABLE appeals ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'appeal';

-- Ensure case_events has all needed columns
ALTER TABLE case_events ADD COLUMN IF NOT EXISTS title text;
