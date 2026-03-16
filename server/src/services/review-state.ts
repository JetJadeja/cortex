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

export async function countDueNotReviewedToday(userId: string, midnight: Date): Promise<number> {
  const reviewedIds = await getReviewedCardIdsToday(userId, midnight);
  const { data: dueCards } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString());

  return (dueCards ?? []).filter((c) => !reviewedIds.has(c.id)).length;
}

export async function countReviewsToday(userId: string, midnight: Date): Promise<number> {
  const { count } = await supabase
    .from("review_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString());

  return count ?? 0;
}

export async function countPhase1ReviewsToday(userId: string, midnight: Date): Promise<number> {
  const { count } = await supabase
    .from("review_history")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("phase", 1)
    .gte("created_at", midnight.toISOString());

  return count ?? 0;
}

/**
 * After every 3 cards, the 4th slot is a quiz.
 * Quiz positions (1-indexed): 4, 8, 12, 16...
 * So when completedPhase1 % 4 === 3, the next item should be a quiz.
 */
export function isQuizSlot(completedPhase1: number): boolean {
  return completedPhase1 > 0 && completedPhase1 % 4 === 3;
}

export async function getReviewedCardIdsToday(userId: string, midnight: Date): Promise<Set<string>> {
  const { data } = await supabase
    .from("review_history")
    .select("card_id")
    .eq("user_id", userId)
    .gte("created_at", midnight.toISOString())
    .not("card_id", "is", null);

  return new Set((data ?? []).map((r) => r.card_id));
}
