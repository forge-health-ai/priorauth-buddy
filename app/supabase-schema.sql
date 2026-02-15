-- PriorAuth Buddy - Supabase Schema
-- Run this in the SQL Editor after creating the project

-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  is_pro boolean default false,
  fight_score integer default 0,
  streak_days integer default 0,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insurance companies reference
create table public.insurers (
  id serial primary key,
  name text not null unique,
  denial_rate_pct numeric(5,2),
  avg_appeal_days integer,
  doi_complaint_url text,
  created_at timestamptz default now()
);

-- Seed top insurers
insert into public.insurers (name, denial_rate_pct, avg_appeal_days) values
  ('UnitedHealthcare', 12.8, 45),
  ('Anthem / Elevance', 10.2, 38),
  ('Cigna', 11.5, 42),
  ('Aetna / CVS Health', 9.8, 35),
  ('Humana', 8.4, 40),
  ('Blue Cross Blue Shield', 7.6, 36),
  ('Kaiser Permanente', 6.2, 30),
  ('Molina Healthcare', 9.1, 44),
  ('Centene', 10.5, 41),
  ('Medicare Advantage', 4.1, 60),
  ('Medicaid', 5.3, 50),
  ('Other', null, null);

-- Cases (core table)
create table public.cases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  procedure_name text not null,
  procedure_code text, -- CPT code if known
  insurer_id integer references public.insurers(id),
  insurer_name text, -- fallback if not in reference table
  policy_number text,
  reference_number text, -- PA reference number
  provider_name text, -- doctor/facility name
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'appealing', 'appeal_won', 'appeal_denied', 'escalated', 'complaint_filed')),
  denial_reason text,
  denial_date date,
  appeal_deadline date,
  submitted_date date default current_date,
  urgency text default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  notes text,
  fight_score integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cases enable row level security;
create policy "Users can CRUD own cases" on public.cases for all using (auth.uid() = user_id);

-- Case timeline events
create table public.case_events (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references public.cases(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null check (event_type in ('created', 'status_change', 'call_logged', 'appeal_submitted', 'appeal_generated', 'document_added', 'complaint_filed', 'deadline_alert', 'note')),
  title text not null,
  description text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.case_events enable row level security;
create policy "Users can CRUD own events" on public.case_events for all using (auth.uid() = user_id);

-- Appeal letters (AI-generated)
create table public.appeals (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references public.cases(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  letter_text text not null,
  letter_html text,
  model_used text default 'claude-haiku',
  prompt_tokens integer,
  completion_tokens integer,
  cost_usd numeric(10,6),
  created_at timestamptz default now()
);

alter table public.appeals enable row level security;
create policy "Users can CRUD own appeals" on public.appeals for all using (auth.uid() = user_id);

-- Call logs
create table public.call_logs (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references public.cases(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rep_name text,
  rep_id text,
  call_date timestamptz default now(),
  duration_minutes integer,
  outcome text check (outcome in ('info_gathered', 'escalated', 'promised_callback', 'approved', 'denied', 'other')),
  notes text,
  promises jsonb default '[]', -- array of { promise, deadline }
  created_at timestamptz default now()
);

alter table public.call_logs enable row level security;
create policy "Users can CRUD own call logs" on public.call_logs for all using (auth.uid() = user_id);

-- DOI Complaints
create table public.doi_complaints (
  id uuid default gen_random_uuid() primary key,
  case_id uuid references public.cases(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  state_code text not null, -- US state
  complaint_text text not null,
  filed_date date,
  status text default 'draft' check (status in ('draft', 'filed', 'acknowledged', 'resolved', 'closed')),
  response_text text,
  created_at timestamptz default now()
);

alter table public.doi_complaints enable row level security;
create policy "Users can CRUD own complaints" on public.doi_complaints for all using (auth.uid() = user_id);

-- Gamification: achievements
create table public.achievements (
  id serial primary key,
  slug text unique not null,
  title text not null,
  description text,
  icon text, -- emoji or icon name
  points integer default 10
);

insert into public.achievements (slug, title, description, icon, points) values
  ('first_case', 'First Steps', 'Added your first case', '🛡️', 10),
  ('first_call', 'Phone Warrior', 'Logged your first insurance call', '📞', 15),
  ('first_appeal', 'Fight Back', 'Generated your first appeal letter', '✊', 20),
  ('streak_7', 'Week Strong', 'Tracked cases for 7 days straight', '🔥', 25),
  ('streak_30', 'Monthly Champion', 'Tracked cases for 30 days straight', '💪', 50),
  ('first_win', 'Victory!', 'Won your first appeal', '🎉', 100),
  ('doi_filed', 'Nuclear Option', 'Filed a DOI complaint', '⚡', 30),
  ('three_wins', 'Hat Trick', 'Won 3 appeals', '👑', 150);

-- User achievements junction
create table public.user_achievements (
  user_id uuid references public.profiles(id) on delete cascade,
  achievement_id integer references public.achievements(id),
  earned_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
create policy "Users can view own achievements" on public.user_achievements for select using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cases_updated_at before update on public.cases
  for each row execute procedure update_updated_at();

-- Indexes
create index idx_cases_user_id on public.cases(user_id);
create index idx_cases_status on public.cases(status);
create index idx_cases_appeal_deadline on public.cases(appeal_deadline);
create index idx_case_events_case_id on public.case_events(case_id);
create index idx_appeals_case_id on public.appeals(case_id);
create index idx_call_logs_case_id on public.call_logs(case_id);
