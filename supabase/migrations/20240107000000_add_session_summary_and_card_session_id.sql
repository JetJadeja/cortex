-- Add summary column to sessions for display in Explore and Record screens
alter table sessions add column summary text;

-- Add direct session_id to cards for efficient grouping on Explore screen
alter table cards add column session_id uuid references sessions(id) on delete set null;

create index idx_cards_session_id on cards(session_id);
