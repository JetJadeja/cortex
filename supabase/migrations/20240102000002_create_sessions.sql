create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript text not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'complete', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_sessions_user_id on sessions(user_id);
