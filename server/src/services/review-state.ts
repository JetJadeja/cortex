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

/** Count cards where due_date <= today. That's it. */
export async function countDueRemaining(
  userId: string,
  timezone: string,
): Promise<number> {
  const today = todayDateString(timezone);
  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("due_date", today);

  return count ?? 0;
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
