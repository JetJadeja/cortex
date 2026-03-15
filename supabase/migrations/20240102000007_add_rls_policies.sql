-- Enable RLS on all tables
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table concepts enable row level security;
alter table cards enable row level security;
alter table concept_links enable row level security;
alter table review_history enable row level security;

-- profiles: users can only access their own profile
create policy "users can view own profile"
  on profiles for select using (auth.uid() = user_id);
create policy "users can insert own profile"
  on profiles for insert with check (auth.uid() = user_id);
create policy "users can update own profile"
  on profiles for update using (auth.uid() = user_id);

-- sessions: users can only access their own sessions
create policy "users can view own sessions"
  on sessions for select using (auth.uid() = user_id);
create policy "users can insert own sessions"
  on sessions for insert with check (auth.uid() = user_id);

-- concepts: users can only access their own concepts
create policy "users can view own concepts"
  on concepts for select using (auth.uid() = user_id);
create policy "users can insert own concepts"
  on concepts for insert with check (auth.uid() = user_id);
create policy "users can update own concepts"
  on concepts for update using (auth.uid() = user_id);
create policy "users can delete own concepts"
  on concepts for delete using (auth.uid() = user_id);

-- cards: users can only access their own cards
create policy "users can view own cards"
  on cards for select using (auth.uid() = user_id);
create policy "users can insert own cards"
  on cards for insert with check (auth.uid() = user_id);
create policy "users can update own cards"
  on cards for update using (auth.uid() = user_id);
create policy "users can delete own cards"
  on cards for delete using (auth.uid() = user_id);

-- concept_links: users can access links where they own either concept
create policy "users can view own concept links"
  on concept_links for select using (
    exists (select 1 from concepts where id = concept_id_1 and user_id = auth.uid())
  );
create policy "users can insert own concept links"
  on concept_links for insert with check (
    exists (select 1 from concepts where id = concept_id_1 and user_id = auth.uid())
  );
create policy "users can delete own concept links"
  on concept_links for delete using (
    exists (select 1 from concepts where id = concept_id_1 and user_id = auth.uid())
  );

-- review_history: users can only access their own history
create policy "users can view own review history"
  on review_history for select using (auth.uid() = user_id);
create policy "users can insert own review history"
  on review_history for insert with check (auth.uid() = user_id);
