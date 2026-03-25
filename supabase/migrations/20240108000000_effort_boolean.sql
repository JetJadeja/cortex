-- Convert effort_rating (integer 1-4) to effort (boolean)
-- Hard cutover: old 1-4 scale is not meaningful under the new binary design

alter table review_history drop column effort_rating;
alter table review_history add column effort boolean not null default true;

-- Index for recycling queries: attempt count per card per day
create index idx_review_history_card_date
  on review_history(user_id, card_id, created_at desc);
