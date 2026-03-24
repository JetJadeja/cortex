create extension if not exists vector with schema extensions;
set search_path to public, extensions;

alter table cards add column if not exists embedding vector(3072);
