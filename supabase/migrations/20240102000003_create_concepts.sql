create table concepts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  title text not null,
  explanation text not null,
  type text not null check (type in ('definition', 'fact', 'framework', 'principle', 'connection')),
  source_context text not null default '',
  quiz_interval real not null default 1,
  quiz_ease_factor real not null default 2.5,
  quiz_next_review_date timestamptz not null default now(),
  priority text not null default 'normal' check (priority in ('core', 'normal')),
  created_at timestamptz not null default now()
);

create index idx_concepts_user_id on concepts(user_id);
create index idx_concepts_session_id on concepts(session_id);
