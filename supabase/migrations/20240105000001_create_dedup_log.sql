create table dedup_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  new_card_front text not null,
  new_card_back text not null,
  action text not null check (action in ('add', 'discard', 'merge')),
  matched_card_id uuid references cards(id) on delete set null,
  similarity real,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_dedup_log_session on dedup_log(session_id);

alter table dedup_log enable row level security;

create policy "users can view own dedup log"
  on dedup_log for select using (auth.uid() = user_id);
create policy "users can insert own dedup log"
  on dedup_log for insert with check (auth.uid() = user_id);
