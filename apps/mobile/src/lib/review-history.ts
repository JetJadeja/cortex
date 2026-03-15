import { supabase } from "./supabase";

export type ReviewType = "card" | "quiz";

export interface ReviewEntry {
  id: string;
  user_id: string;
  card_id: string | null;
  concept_id: string;
  review_type: ReviewType;
  effort_rating: number;
  confidence_rating: number;
  ai_score: number | null;
  was_voice: boolean;
  was_due: boolean;
  created_at: string;
}

export async function logReview(
  entry: Omit<ReviewEntry, "id" | "created_at">,
): Promise<ReviewEntry> {
  const { data, error } = await supabase
    .from("review_history")
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getHistoryForCard(cardId: string): Promise<ReviewEntry[]> {
  const { data, error } = await supabase
    .from("review_history")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getHistoryForConcept(conceptId: string): Promise<ReviewEntry[]> {
  const { data, error } = await supabase
    .from("review_history")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRecentHistory(userId: string, hoursAgo: number): Promise<ReviewEntry[]> {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("review_history")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
