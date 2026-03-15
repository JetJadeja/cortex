insert into users (id, email, display_name) values
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'test@example.com', 'Test User');

insert into recordings (id, user_id, title, audio_url, duration_seconds) values
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Intro to Mitochondria', 'https://storage.example.com/recordings/sample-1.m4a', 320),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'World War II Overview', 'https://storage.example.com/recordings/sample-2.m4a', 540);

insert into transcripts (id, recording_id, text, confidence, summary, key_points) values
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration, converting glucose and oxygen into energy.',
   0.95,
   'Overview of mitochondrial function and ATP production through cellular respiration.',
   '["Mitochondria produce ATP", "Cellular respiration converts glucose and oxygen to energy", "Mitochondria are the powerhouse of the cell"]'::jsonb);

insert into reviews (id, user_id, transcript_id) values
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

insert into review_items (id, review_id, question, expected_answer) values
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'What is the primary function of mitochondria?', 'Mitochondria produce ATP (adenosine triphosphate) through cellular respiration, serving as the energy source for the cell.'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'What inputs does cellular respiration require?', 'Cellular respiration requires glucose and oxygen to produce ATP energy.');
