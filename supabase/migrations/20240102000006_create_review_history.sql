create table review_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references cards(id) on delete set null,
  concept_id uuid not null references concepts(id) on delete cascade,
  review_type text not null check (review_type in ('card', 'quiz')),
  effort_rating integer not null check (effort_rating between 1 and 4),
  confidence_rating integer not null check (confidence_rating between 1 and 4),
  ai_score real,
  was_voice boolean not null default false,
  was_due boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_review_history_user_id on review_history(user_id);
create index idx_review_history_card_id on review_history(card_id);
create index idx_review_history_concept_id on review_history(concept_id);
