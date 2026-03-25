import { supabase } from "../lib/supabase";
import { midnightToday, todayDateString } from "../lib/timezone";

export async function getMidnightForUser(
  userId: string,
): Promise<{ midnight: Date; timezone: string }> {
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("user_id", userId)
    .single();

  const timezone = (data?.preferences?.timezone as string | undefined) ?? "UTC";
  return { midnight: midnightToday(timezone), timezone };
}

/** Due cards minus cards that have been *mastered* today (schedule_applied = true). */
export async function countDueRemaining(
  userId: string,
  timezone: string,
): Promise<number> {
  const masteredIds = await getMasteredCardIdsToday(userId, timezone);
  const today = todayDateString(timezone);
  const { data: dueCards } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .lte("due_date", today);

  return (dueCards ?? []).filter((c) => !masteredIds.has(c.id)).length;
}

export async function countReviewsToday(
  userId: string,
  midnight: Date,
): Promise<number> {
  const { count } = await supabase
    .from("review_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString());

  return count ?? 0;
}

/**
 * Card IDs where FSRS completion call fired today (schedule_applied = true).
 * Under the two-layer system, this means the card is done for the day.
 */
export async function getMasteredCardIdsToday(
  userId: string,
  timezone: string,
): Promise<Set<string>> {
  const midnight = midnightToday(timezone);
  const { data } = await supabase
    .from("review_history")
    .select("card_id")
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString())
    .eq("schedule_applied", true)
    .gte("confidence_rating", 3)
    .not("card_id", "is", null);

  return new Set((data ?? []).map((r) => r.card_id));
}

/** All card IDs that appear in today's review_history (for fresh vs recycled split). */
export async function getReviewedCardIdsToday(
  userId: string,
  midnight: Date,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("review_history")
    .select("card_id")
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString())
    .not("card_id", "is", null);

  return new Set((data ?? []).map((r) => r.card_id));
}
