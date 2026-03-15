create table concept_links (
  concept_id_1 uuid not null references concepts(id) on delete cascade,
  concept_id_2 uuid not null references concepts(id) on delete cascade,
  relationship_description text not null,
  created_at timestamptz not null default now(),
  primary key (concept_id_1, concept_id_2),
  check (concept_id_1 < concept_id_2)
);

create index idx_concept_links_1 on concept_links(concept_id_1);
create index idx_concept_links_2 on concept_links(concept_id_2);
