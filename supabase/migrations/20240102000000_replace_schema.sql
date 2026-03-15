-- Drop old schema (reverse dependency order)
drop table if exists review_items cascade;
drop table if exists reviews cascade;
drop table if exists transcripts cascade;
drop table if exists recordings cascade;
drop table if exists users cascade;

-- Drop old indexes (cascade handles these, but being explicit)
drop index if exists idx_recordings_user_id;
drop index if exists idx_transcripts_recording_id;
drop index if exists idx_reviews_user_id;
drop index if exists idx_reviews_transcript_id;
drop index if exists idx_review_items_review_id;
