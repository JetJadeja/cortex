alter table cards
  drop column interval,
  drop column ease_factor,
  drop column next_review_date,
  drop column times_reviewed,
  drop column times_correct;

alter table cards
  add column due_at timestamptz not null default now(),
  add column stability real not null default 0,
  add column difficulty real not null default 0;

drop index idx_cards_next_review_date;
create index idx_cards_due_at on cards(user_id, due_at);
