-- PriorAuth Buddy Database Schema
-- Safe to run even if some tables exist (fully idempotent)

create extension if not exists "uuid-ossp";

-- Add terms columns to existing profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS terms_accepted_version text;

-- Cases table
create table if not exists public.cases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  procedure_name text not null,
  procedure_code text,
  diagnosis text,
  insurance_company text not null,
  insurance_phone text,
  reference_number text,
  date_submitted date not null,
  deadline_days integer default 14,
  status text default 'pending' check (status in ('pending', 'approved', 'denied', 'appealing', 'appeal_approved', 'appeal_denied', 'expired')),
  denial_reason text,
  denial_date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Case updates (activity log)
create table if not exists public.case_updates (
  id uuid default uuid_generate_v4() primary key,
  case_id uuid references public.cases on delete cascade not null,
  update_type text not null check (update_type in ('call', 'letter_sent', 'letter_received', 'status_change', 'appeal_submitted', 'note')),
  summary text not null,
  contact_name text,
  contact_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Generated appeals
create table if not exists public.appeals (
  id uuid default uuid_generate_v4() primary key,
  case_id uuid references public.cases on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  denial_reason text not null,
  patient_context text,
  generated_letter text not null,
  was_sent boolean default false,
  outcome text check (outcome in ('pending', 'approved', 'denied')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Call scripts library
create table if not exists public.call_scripts (
  id uuid default uuid_generate_v4() primary key,
  scenario text not null,
  script_intro text not null,
  key_phrases text[] not null,
  rebuttals jsonb,
  tips text[],
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_updates enable row level security;
alter table public.appeals enable row level security;
alter table public.call_scripts enable row level security;

-- Policies (drop first to avoid duplicates)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own cases" on public.cases;
drop policy if exists "Users can insert own cases" on public.cases;
drop policy if exists "Users can update own cases" on public.cases;
drop policy if exists "Users can delete own cases" on public.cases;
drop policy if exists "Users can view own case updates" on public.case_updates;
drop policy if exists "Users can insert own case updates" on public.case_updates;
drop policy if exists "Users can view own appeals" on public.appeals;
drop policy if exists "Users can insert own appeals" on public.appeals;
drop policy if exists "Anyone can view call scripts" on public.call_scripts;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can view own cases" on public.cases for select using (auth.uid() = user_id);
create policy "Users can insert own cases" on public.cases for insert with check (auth.uid() = user_id);
create policy "Users can update own cases" on public.cases for update using (auth.uid() = user_id);
create policy "Users can delete own cases" on public.cases for delete using (auth.uid() = user_id);
create policy "Users can view own case updates" on public.case_updates for select using (
  exists (select 1 from public.cases where cases.id = case_updates.case_id and cases.user_id = auth.uid())
);
create policy "Users can insert own case updates" on public.case_updates for insert with check (
  exists (select 1 from public.cases where cases.id = case_updates.case_id and cases.user_id = auth.uid())
);
create policy "Users can view own appeals" on public.appeals for select using (auth.uid() = user_id);
create policy "Users can insert own appeals" on public.appeals for insert with check (auth.uid() = user_id);
create policy "Anyone can view call scripts" on public.call_scripts for select using (true);

-- Indexes
create index if not exists cases_user_id_idx on public.cases(user_id);
create index if not exists cases_status_idx on public.cases(status);
create index if not exists case_updates_case_id_idx on public.case_updates(case_id);
create index if not exists appeals_case_id_idx on public.appeals(case_id);

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_cases_updated_at on public.cases;
create trigger update_cases_updated_at before update on public.cases
  for each row execute function update_updated_at_column();
