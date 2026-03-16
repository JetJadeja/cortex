alter table review_history
  drop column was_due;

alter table review_history
  add column phase smallint not null default 1 check (phase in (1, 2)),
  add column schedule_applied boolean not null default true;
