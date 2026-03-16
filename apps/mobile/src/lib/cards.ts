import { supabase } from "./supabase";

export type CardType = "flashcard" | "explain_aloud" | "scenario" | "connection";

export interface Card {
  id: string;
  user_id: string;
  concept_id: string;
  card_type: CardType;
  front: string;
  back: string;
  due_at: string;
  stability: number;
  difficulty: number;
  created_at: string;
}

export async function getCard(cardId: string): Promise<Card | null> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

export async function getCardsByConcept(conceptId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getDueCards(userId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAllCards(userId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCard(
  card: Omit<Card, "id" | "created_at" | "due_at" | "stability" | "difficulty">,
): Promise<Card> {
  const { data, error } = await supabase
    .from("cards")
    .insert(card)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCard(
  cardId: string,
  updates: Partial<Pick<Card, "front" | "back" | "due_at" | "stability" | "difficulty">>,
): Promise<Card> {
  const { data, error } = await supabase
    .from("cards")
    .update(updates)
    .eq("id", cardId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId);

  if (error) throw error;
}
