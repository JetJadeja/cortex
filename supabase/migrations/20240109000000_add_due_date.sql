-- Add due_date column to cards for timezone-aware due queries.
-- due_date is derived from due_at in the user's local timezone.

ALTER TABLE cards ADD COLUMN due_date date;

-- Backfill: convert due_at to date in each user's timezone.
-- LEFT JOIN ensures cards for users without profiles get UTC fallback.
UPDATE cards
SET due_date = (
  due_at AT TIME ZONE COALESCE(p.tz, 'UTC')
)::date
FROM (
  SELECT
    c.id AS card_id,
    pr.preferences->>'timezone' AS tz
  FROM cards c
  LEFT JOIN profiles pr ON pr.user_id = c.user_id
) p
WHERE cards.id = p.card_id;

-- Make non-nullable now that backfill is done.
ALTER TABLE cards ALTER COLUMN due_date SET NOT NULL;

-- New cards default to tomorrow (server overrides this explicitly, but safe fallback).
ALTER TABLE cards ALTER COLUMN due_date SET DEFAULT (CURRENT_DATE + 1);

-- Index for the primary query pattern: "give me this user's due cards today"
CREATE INDEX idx_cards_due_date ON cards(user_id, due_date);
