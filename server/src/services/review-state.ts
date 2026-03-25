import { supabase } from "../lib/supabase";
import { midnightToday } from "../lib/timezone";

export async function getMidnightForUser(userId: string): Promise<Date> {
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("user_id", userId)
    .single();

  const timezone = data?.preferences?.timezone as string | undefined;
  return midnightToday(timezone);
}

/** Due cards minus cards that have been *passed* today (confidence >= 3). */
export async function countDueRemaining(userId: string, midnight: Date): Promise<number> {
  const passedIds = await getPassedCardIdsToday(userId, midnight);
  const { data: dueCards } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString());

  return (dueCards ?? []).filter((c) => !passedIds.has(c.id)).length;
}

export async function countReviewsToday(userId: string, midnight: Date): Promise<number> {
  const { count } = await supabase
    .from("review_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString());

  return count ?? 0;
}

/** Card IDs that the user has successfully recalled today (confidence >= 3). */
export async function getPassedCardIdsToday(userId: string, midnight: Date): Promise<Set<string>> {
  const { data } = await supabase
    .from("review_history")
    .select("card_id")
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString())
    .gte("confidence_rating", 3)
    .not("card_id", "is", null);

  return new Set((data ?? []).map((r) => r.card_id));
}

/** All card IDs that appear in today's review_history (for fresh vs recycled split). */
export async function getReviewedCardIdsToday(userId: string, midnight: Date): Promise<Set<string>> {
  const { data } = await supabase
    .from("review_history")
    .select("card_id")
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString())
    .not("card_id", "is", null);

  return new Set((data ?? []).map((r) => r.card_id));
}

/** How many times this card has been reviewed today (for attempt-degraded grading). */
export async function getAttemptCountToday(
  userId: string,
  cardId: string,
  midnight: Date,
): Promise<number> {
  const { count } = await supabase
    .from("review_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .gte("created_at", midnight.toISOString());

  return count ?? 0;
}
