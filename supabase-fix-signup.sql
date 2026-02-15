-- PriorAuth Buddy Signup Fix
-- This script fixes the broken database trigger that's causing 500 errors on signup
-- Run this in the Supabase SQL Editor

-- ============================================
-- PART 1: Clean up the broken trigger/function
-- ============================================

-- Drop the broken trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Drop the broken function if it exists
drop function if exists public.handle_new_user();

-- ============================================
-- PART 2: Ensure profiles table has all needed columns
-- ============================================

-- Add terms columns if they don't exist (idempotent)
alter table public.profiles 
  add column if not exists terms_accepted_at timestamp with time zone,
  add column if not exists terms_accepted_version text;

-- ============================================
-- PART 3: Create working trigger function
-- ============================================

-- Create a simple, bulletproof trigger function
-- SECURITY DEFINER allows it to bypass RLS and insert directly
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer -- This is key: runs with owner privileges, bypasses RLS
as $$
begin
  -- Simple insert with only id and email
  -- ON CONFLICT makes it idempotent (safe to run multiple times)
  insert into public.profiles (id, email)
  values (
    new.id,           -- The user's UUID from auth.users
    new.email         -- The user's email from auth.users
  )
  on conflict (id) do nothing;  -- If profile already exists, do nothing
  
  return new;
end;
$$;

-- ============================================
-- PART 4: Create the trigger
-- ============================================

-- Create trigger that runs AFTER insert on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================
-- PART 5: Ensure RLS policies exist on profiles
-- ============================================

-- Enable RLS on profiles (idempotent)
alter table public.profiles enable row level security;

-- Drop existing policies to avoid conflicts, then recreate
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Create SELECT policy: users can only see their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Create UPDATE policy: users can only update their own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- NOTE: No INSERT policy needed! The trigger uses SECURITY DEFINER
-- which bypasses RLS entirely, so it can insert without a policy.

-- ============================================
-- VERIFICATION QUERIES (run these to confirm)
-- ============================================

-- Check trigger exists:
-- select * from pg_trigger where tgname = 'on_auth_user_created';

-- Check function exists:
-- select * from pg_proc where proname = 'handle_new_user';

-- Check policies exist:
-- select * from pg_policies where tablename = 'profiles';

-- Test the trigger manually (optional):
-- This should create a profile for an existing auth user that doesn't have one:
-- insert into auth.users (id, email) values ('test-id', 'test@example.com') on conflict do nothing;
-- Then check: select * from profiles where email = 'test@example.com';
