create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  card_type text not null check (card_type in ('flashcard', 'explain_aloud', 'scenario', 'connection')),
  front text not null,
  back text not null,
  interval real not null default 1,
  ease_factor real not null default 2.5,
  next_review_date timestamptz not null default now(),
  times_reviewed integer not null default 0,
  times_correct integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_cards_user_id on cards(user_id);
create index idx_cards_concept_id on cards(concept_id);
create index idx_cards_next_review_date on cards(user_id, next_review_date);
