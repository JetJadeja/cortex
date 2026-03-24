-- Wipe all session/card/concept data. Leaves profiles and auth intact.
-- Order respects foreign key constraints.

delete from dedup_log;
delete from review_history;
delete from concept_links;
delete from cards;
delete from concepts;
delete from sessions;
