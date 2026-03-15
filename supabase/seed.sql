-- Seed user must exist in auth.users first (created via Supabase dashboard or auth signup).
-- These seeds assume a test user with this ID exists in auth.users.

-- Test user profile
insert into profiles (user_id, display_name, age, preferences) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Test User', 25, '{}'::jsonb);

-- Sample session
insert into sessions (id, user_id, transcript, processing_status) values
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'So I just read about private credit. It''s basically non-bank lending where borrowers get financing directly from private funds instead of going through traditional banks. The key thing is that these loans are negotiated directly between the borrower and the lender, so the terms can be much more flexible. Bloomberg apparently gets about 80 percent of its revenue from terminals, which is wild. And I was reading about how Morpho uses isolated lending markets to manage risk through structural separation rather than diversification.',
   'complete');

-- Sample concepts from that session
insert into concepts (id, user_id, session_id, title, explanation, type, source_context, priority) values
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Private Credit', 'Non-bank lending where borrowers obtain financing directly from private funds rather than traditional banks. Terms are negotiated directly between borrower and lender, allowing greater flexibility than standardized bank loans.', 'definition',
   'private credit... non-bank lending where borrowers get financing directly from private funds', 'core'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Bloomberg Terminal Revenue', 'Approximately 80% of Bloomberg''s revenue comes from its terminal subscriptions, making it the dominant revenue driver for the company.', 'fact',
   'Bloomberg apparently gets about 80 percent of its revenue from terminals', 'normal'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'Morpho Isolated Lending Markets', 'Morpho uses structurally isolated lending markets to contain risk. Rather than diversifying across a single pool, each market operates independently so that failure in one market cannot cascade to others.', 'framework',
   'Morpho uses isolated lending markets to manage risk through structural separation', 'normal');

-- Sample cards for those concepts
insert into cards (id, user_id, concept_id, card_type, front, back) values
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'flashcard', 'What is private credit?', 'Non-bank lending where borrowers obtain financing directly from private funds. Terms are negotiated directly between borrower and lender, offering more flexibility than bank loans.'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'flashcard', 'How does private credit differ from traditional bank lending?', 'Terms are negotiated directly between borrower and lender (vs. standardized), and financing comes from private funds rather than bank balance sheets.'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
   'flashcard', 'What percentage of Bloomberg''s revenue comes from terminals?', 'Approximately 80%.'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
   'explain_aloud', 'Explain how Morpho manages risk through structural separation.', 'Morpho uses isolated lending markets rather than pooled diversification. Each market operates independently, so failure in one cannot cascade to others. Risk is contained through structural boundaries, not spread across a single system.');

-- Sample concept link
insert into concept_links (concept_id_1, concept_id_2, relationship_description) values
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
   'Both private credit and Morpho''s isolated markets manage risk through structural separation rather than diversification — private credit through direct bilateral negotiation, Morpho through independent market isolation.');
