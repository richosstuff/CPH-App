-- Copenhagen Chapter — schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run any time the app adds new tables/columns — every statement
-- below is idempotent (IF NOT EXISTS / DROP...IF EXISTS then CREATE), so
-- re-running the whole file after an update only applies what's new.

create extension if not exists "uuid-ossp";

create table if not exists phases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_number int not null,
  title text not null,
  start_date date not null,
  end_date date not null,
  goal_text text not null,
  metric_text text not null
);

create table if not exists checklist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id uuid not null references phases(id) on delete cascade,
  position int not null default 0,
  text text not null,
  is_done boolean not null default false,
  notes text
);

create table if not exists habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  position int not null default 0
);

create table if not exists habit_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  entry_date date not null,
  completed boolean not null default true,
  unique (habit_id, entry_date)
);

create table if not exists weekly_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  monthly_goal text not null default '',
  priority_1 text not null default '',
  priority_2 text not null default '',
  priority_3 text not null default '',
  reflection text not null default '',
  unique (user_id, week_start)
);

create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  deadline_date date,
  status text not null default 'Not applied',
  notes text
);

-- Superseded by `transactions` (below) for day-to-day logging, but left in place —
-- the Income & Savings Plan tab still uses it for the monthly income/savings plan.
create table if not exists monthly_finance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  actual_net_income_dkk numeric,
  savings_dkk numeric,
  unique (user_id, month)
);

create table if not exists network_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  met_where text,
  met_date date,
  last_interaction_date date,
  notes text,
  follow_up boolean not null default false
);

create table if not exists meal_weeks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  notes text not null default '',
  budget_dkk numeric,
  unique (user_id, week_start)
);

create table if not exists meal_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  day_of_week int not null,
  dinner text not null default '',
  is_batch_cooked boolean not null default false,
  is_leftovers boolean not null default false,
  unique (user_id, week_start, day_of_week)
);

create table if not exists shopping_list_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  item text not null,
  quantity text,
  estimated_price_dkk numeric,
  supermarket text,
  notes text
);

create table if not exists schedule_blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  category text not null default 'Other',
  location text
);

-- Superseded by `transactions` (below), which covers both expenses and income.
-- Left in place rather than dropped in case anything was already logged here.
create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null,
  currency text not null default 'DKK',
  amount_dkk numeric not null,
  category text not null default 'Other',
  label text
);

-- The single day-to-day money log — both expenses and income, freely labeled.
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null default 'Expense',
  description text not null,
  amount numeric not null,
  currency text not null default 'DKK',
  amount_dkk numeric not null,
  category text not null default 'Other',
  label text
);

create table if not exists assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'Other',
  institution text,
  currency text not null default 'DKK',
  balance numeric not null default 0,
  last_updated date,
  notes text
);
-- Upgrade path for databases that already had `assets` before `notes` existed.
alter table assets add column if not exists notes text;

create table if not exists liabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  currency text not null default 'DKK',
  last_updated date
);

create table if not exists financial_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  target_date date,
  current_amount numeric not null default 0,
  linked_pot_id uuid references assets(id) on delete set null,
  notes text,
  status text not null default 'On track'
);

-- next_checkpoint is the human-readable description ("10,000 DKK by Jan 2027");
-- next_checkpoint_date is a real date alongside it so the Dashboard can compute
-- "due within 30 days" without parsing dates out of free text.
create table if not exists life_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  dream text not null,
  measurable_target text not null,
  daily_system text not null,
  next_checkpoint text,
  next_checkpoint_date date,
  progress_pct int not null default 0,
  linked_financial_goal_id uuid references financial_goals(id) on delete set null,
  status text not null default 'Active'
);

-- Populated by upserting the current month's computed net worth whenever the
-- Dashboard or Portfolio tab loads, so the sparkline builds itself over time.
create table if not exists net_worth_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  net_worth_dkk numeric not null,
  unique (user_id, month)
);

create table if not exists exchange_rates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null,
  rate_to_dkk numeric not null,
  unique (user_id, currency)
);

-- Row Level Security: every table is private to the row's own user_id.
-- This is the piece that vibe-coded apps most often skip — without it,
-- anyone with an account could read or edit anyone else's data.
alter table phases enable row level security;
alter table checklist_items enable row level security;
alter table habits enable row level security;
alter table habit_entries enable row level security;
alter table weekly_notes enable row level security;
alter table applications enable row level security;
alter table monthly_finance enable row level security;
alter table network_contacts enable row level security;
alter table meal_weeks enable row level security;
alter table meal_days enable row level security;
alter table shopping_list_items enable row level security;
alter table schedule_blocks enable row level security;
alter table expenses enable row level security;
alter table transactions enable row level security;
alter table assets enable row level security;
alter table liabilities enable row level security;
alter table financial_goals enable row level security;
alter table life_goals enable row level security;
alter table net_worth_snapshots enable row level security;
alter table exchange_rates enable row level security;

-- Policies are dropped and recreated each run (Postgres has no
-- CREATE POLICY IF NOT EXISTS) so this file stays safe to re-run.
drop policy if exists "own rows only" on phases;
create policy "own rows only" on phases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on checklist_items;
create policy "own rows only" on checklist_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on habits;
create policy "own rows only" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on habit_entries;
create policy "own rows only" on habit_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on weekly_notes;
create policy "own rows only" on weekly_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on applications;
create policy "own rows only" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on monthly_finance;
create policy "own rows only" on monthly_finance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on network_contacts;
create policy "own rows only" on network_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on meal_weeks;
create policy "own rows only" on meal_weeks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on meal_days;
create policy "own rows only" on meal_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on shopping_list_items;
create policy "own rows only" on shopping_list_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on schedule_blocks;
create policy "own rows only" on schedule_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on expenses;
create policy "own rows only" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on transactions;
create policy "own rows only" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on assets;
create policy "own rows only" on assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on liabilities;
create policy "own rows only" on liabilities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on financial_goals;
create policy "own rows only" on financial_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on life_goals;
create policy "own rows only" on life_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on net_worth_snapshots;
create policy "own rows only" on net_worth_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows only" on exchange_rates;
create policy "own rows only" on exchange_rates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
