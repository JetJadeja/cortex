alter table concepts
  drop column quiz_interval,
  drop column quiz_ease_factor,
  drop column quiz_next_review_date;

alter table concepts
  add column quiz_due_at timestamptz not null default now(),
  add column quiz_stability real not null default 0,
  add column quiz_difficulty real not null default 0;
