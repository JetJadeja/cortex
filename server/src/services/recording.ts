import { supabase } from "../lib/supabase";

interface ConceptInput {
  title: string;
  explanation: string;
  type: string;
  source_context: string;
  cards: CardInput[];
}

interface CardInput {
  card_type: string;
  front: string;
  back: string;
}

export async function createSession(userId: string, transcript: string): Promise<string> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      transcript,
      processing_status: "pending",
    })
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

export async function writeConceptsAndCards(
  userId: string,
  sessionId: string,
  concepts: ConceptInput[],
): Promise<void> {
  for (const concept of concepts) {
    const { data: inserted, error: conceptError } = await supabase
      .from("concepts")
      .insert({
        user_id: userId,
        session_id: sessionId,
        title: concept.title,
        explanation: concept.explanation,
        type: concept.type,
        source_context: concept.source_context,
      })
      .select("id")
      .single();

    if (conceptError) throw conceptError;

    if (concept.cards.length > 0) {
      const cardRows = concept.cards.map((card) => ({
        user_id: userId,
        concept_id: inserted.id,
        card_type: card.card_type,
        front: card.front,
        back: card.back,
      }));

      const { error: cardsError } = await supabase
        .from("cards")
        .insert(cardRows);

      if (cardsError) throw cardsError;
    }
  }
}
