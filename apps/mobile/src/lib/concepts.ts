import { supabase } from "./supabase";

export type ConceptType = "definition" | "fact" | "framework" | "principle" | "connection";
export type ConceptPriority = "core" | "normal";

export interface Concept {
  id: string;
  user_id: string;
  session_id: string;
  title: string;
  explanation: string;
  type: ConceptType;
  source_context: string;
  quiz_due_at: string;
  quiz_stability: number;
  quiz_difficulty: number;
  priority: ConceptPriority;
  created_at: string;
}

export async function getConcept(conceptId: string): Promise<Concept | null> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", conceptId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

export async function getConceptsBySession(sessionId: string): Promise<Concept[]> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function searchConcepts(userId: string, query: string): Promise<Concept[]> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("user_id", userId)
    .or(`title.ilike.%${query}%,explanation.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllConcepts(userId: string): Promise<Concept[]> {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createConcept(
  concept: Omit<Concept, "id" | "created_at" | "quiz_due_at" | "quiz_stability" | "quiz_difficulty">,
): Promise<Concept> {
  const { data, error } = await supabase
    .from("concepts")
    .insert(concept)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateConcept(
  conceptId: string,
  updates: Partial<Pick<Concept, "title" | "explanation" | "priority" | "quiz_due_at" | "quiz_stability" | "quiz_difficulty">>,
): Promise<Concept> {
  const { data, error } = await supabase
    .from("concepts")
    .update(updates)
    .eq("id", conceptId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConcept(conceptId: string): Promise<void> {
  const { error } = await supabase
    .from("concepts")
    .delete()
    .eq("id", conceptId);

  if (error) throw error;
}
