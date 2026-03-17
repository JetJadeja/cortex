create or replace function match_cards(
  query_embedding vector(3072),
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
    cards.id,
    cards.front,
    cards.back,
    concepts.title as concept_title,
    1 - (cards.embedding <=> query_embedding) as similarity
  from cards
  join concepts on cards.concept_id = concepts.id
  where cards.user_id = match_user_id
    and cards.embedding is not null
  order by cards.embedding <=> query_embedding
  limit match_count;
$$;
