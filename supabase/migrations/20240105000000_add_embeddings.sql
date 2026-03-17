create extension if not exists vector with schema extensions;

alter table cards add column embedding vector(3072);

create index idx_cards_embedding on cards
  using hnsw (embedding vector_cosine_ops);
