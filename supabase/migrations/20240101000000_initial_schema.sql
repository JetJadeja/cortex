create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recordings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  audio_url text not null,
  duration_seconds integer not null default 0,
  mimetype text not null default 'audio/m4a',
  created_at timestamptz not null default now()
);

create table transcripts (
  id uuid primary key default uuid_generate_v4(),
  recording_id uuid not null references recordings(id) on delete cascade,
  text text not null,
  confidence real not null default 0,
  summary text not null default '',
  key_points jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  transcript_id uuid not null references transcripts(id) on delete cascade,
  score real,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table review_items (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid not null references reviews(id) on delete cascade,
  question text not null,
  expected_answer text not null,
  user_response text,
  score real,
  feedback text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_recordings_user_id on recordings(user_id);
create index idx_transcripts_recording_id on transcripts(recording_id);
create index idx_reviews_user_id on reviews(user_id);
create index idx_reviews_transcript_id on reviews(transcript_id);
create index idx_review_items_review_id on review_items(review_id);
