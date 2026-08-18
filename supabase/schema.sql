-- Copenhagen Chapter — schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query) once,
-- right after creating your Supabase project.

create extension if not exists "uuid-ossp";

create table phases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_number int not null,
  title text not null,
  start_date date not null,
  end_date date not null,
  goal_text text not null,
  metric_text text not null
);

create table checklist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phase_id uuid not null references phases(id) on delete cascade,
  position int not null default 0,
  text text not null,
  is_done boolean not null default false,
  notes text
);

create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  position int not null default 0
);

create table habit_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  entry_date date not null,
  completed boolean not null default true,
  unique (habit_id, entry_date)
);

create table weekly_notes (
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

create table applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  deadline_date date,
  status text not null default 'Not applied',
  notes text
);

create table monthly_finance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  actual_net_income_dkk numeric,
  savings_dkk numeric,
  unique (user_id, month)
);

create table network_contacts (
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

create table meal_weeks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  notes text not null default '',
  budget_dkk numeric,
  unique (user_id, week_start)
);

create table meal_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  day_of_week int not null,
  dinner text not null default '',
  is_batch_cooked boolean not null default false,
  is_leftovers boolean not null default false,
  unique (user_id, week_start, day_of_week)
);

create table shopping_list_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  item text not null,
  quantity text,
  estimated_price_dkk numeric,
  supermarket text,
  notes text
);

create table schedule_blocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  category text not null default 'Other',
  location text
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

create policy "own rows only" on phases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on checklist_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on habit_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on weekly_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on monthly_finance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on network_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on meal_weeks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on meal_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on shopping_list_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on schedule_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
