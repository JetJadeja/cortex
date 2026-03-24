import { supabase } from "../lib/supabase";
import { generateEmbeddings, buildEmbedText } from "./embedding";
import { processCardWithDedup, type CardInput } from "./card-writer";

interface ConceptInput {
  title: string;
  explanation: string;
  cards: CardInput[];
}

export async function createSession(
  userId: string,
  transcript: string,
  summary?: string,
): Promise<string> {
  const row: Record<string, unknown> = {
    user_id: userId,
    transcript,
    processing_status: "pending",
  };
  if (summary) row.summary = summary;

  const { data, error } = await supabase
    .from("sessions")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateSessionStatus(
  sessionId: string,
  status: "complete" | "failed",
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ processing_status: status })
    .eq("id", sessionId);

  if (error) throw error;
}

export async function getPendingSessions(): Promise<
  Array<{ id: string; user_id: string; transcript: string }>
> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, transcript")
    .eq("processing_status", "pending");

  if (error) throw error;
  return data;
}

export async function clearSessionData(sessionId: string): Promise<void> {
  const { error: dedupError } = await supabase
    .from("dedup_log")
    .delete()
    .eq("session_id", sessionId);

  if (dedupError) throw dedupError;

  const { error: conceptError } = await supabase
    .from("concepts")
    .delete()
    .eq("session_id", sessionId);

  if (conceptError) throw conceptError;
}

export async function writeConceptsAndCards(
  userId: string,
  sessionId: string,
  concepts: ConceptInput[],
): Promise<void> {
  const allEmbedTexts: string[] = [];

  for (const concept of concepts) {
    for (const card of concept.cards) {
      allEmbedTexts.push(buildEmbedText(card.front, card.back, concept.title));
    }
  }

  let allEmbeddings: Array<number[] | null>;
  try {
    const results = await generateEmbeddings(allEmbedTexts);
    if (results.length !== allEmbedTexts.length) {
      console.error(
        `Embedding count mismatch: expected ${allEmbedTexts.length}, got ${results.length}`,
      );
      allEmbeddings = allEmbedTexts.map(() => null);
    } else {
      allEmbeddings = results;
    }
  } catch (err) {
    console.error(
      "Batch embedding failed, falling back to per-card embedding:",
      err instanceof Error ? err.message : err,
    );
    allEmbeddings = allEmbedTexts.map(() => null);
  }

  let embeddingIdx = 0;
  for (const concept of concepts) {
    const { data: inserted, error: conceptError } = await supabase
      .from("concepts")
      .insert({
        user_id: userId,
        session_id: sessionId,
        title: concept.title,
        explanation: concept.explanation,
      })
      .select("id")
      .single();

    if (conceptError) throw conceptError;

    let cardsAdded = 0;
    for (const card of concept.cards) {
      const embedding = allEmbeddings[embeddingIdx] ?? null;
      embeddingIdx++;
      const action = await processCardWithDedup(
        userId,
        sessionId,
        inserted.id,
        concept.title,
        card,
        embedding,
      );
      if (action === "add") cardsAdded++;
    }

    if (cardsAdded === 0) {
      const { error: deleteError } = await supabase
        .from("concepts")
        .delete()
        .eq("id", inserted.id);
      if (deleteError) {
        console.error(`Failed to delete orphaned concept ${inserted.id}:`, deleteError);
      }
    }
  }
}
