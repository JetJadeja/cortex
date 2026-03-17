-- concepts.type: no longer extracted from prompt, make nullable
alter table concepts alter column type drop not null;
alter table concepts drop constraint if exists concepts_type_check;

-- cards.card_type: no longer extracted from prompt, make nullable
alter table cards alter column card_type drop not null;
alter table cards drop constraint if exists cards_card_type_check;
