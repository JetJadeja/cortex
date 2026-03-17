-- Reduce embedding dimensions from 3072 to 1024.
-- pgvector HNSW indexes have a 2000-dim limit for the vector type.
-- The original 3072-dim index silently failed to create.

-- Drop the old index and function that reference vector(3072)
drop index if exists idx_cards_embedding;
drop function if exists match_cards;

-- Replace the column: drop old, add new at 1024 dims
-- Existing embeddings are invalidated (generated at 3072 dims) and must be backfilled.
alter table cards drop column if exists embedding;
alter table cards add column embedding vector(1024);

-- Recreate HNSW index (now within the 2000-dim limit)
create index idx_cards_embedding on cards
  using hnsw (embedding vector_cosine_ops);

-- Recreate match_cards with subquery isolation so the JOIN
-- doesn't prevent the planner from using the HNSW index.
create or replace function match_cards(
  query_embedding vector(1024),
  match_user_id uuid,
  match_count int
)
returns table (
  id uuid,
  front text,
  back text,
  concept_title text,
  similarity float
)
language sql stable
as $$
  select
    m.id,
    m.front,
    m.back,
    c.title as concept_title,
    m.similarity
  from (
    select
      cards.id,
      cards.front,
      cards.back,
      cards.concept_id,
      1 - (cards.embedding <=> query_embedding) as similarity
    from cards
    where cards.user_id = match_user_id
    order by cards.embedding <=> query_embedding
    limit match_count
  ) m
  join concepts c on m.concept_id = c.id;
$$;
