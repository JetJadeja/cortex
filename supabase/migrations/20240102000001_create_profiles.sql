create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  age integer,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
