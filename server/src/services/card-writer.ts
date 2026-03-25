import { supabase } from "../lib/supabase";
import { generateEmbedding, buildEmbedText } from "./embedding";
import { deduplicateCard, DedupDecision } from "./dedup";
import { newCardDueAt, newCardDueDate } from "../lib/due-date";

export interface CardInput {
  front: string;
  back: string;
}

export async function processCardWithDedup(
  userId: string,
  sessionId: string,
  conceptId: string,
  conceptTitle: string,
  card: CardInput,
  precomputedEmbedding: number[] | null,
  timezone: string,
): Promise<"add" | "discard" | "merge"> {
  let embedding = precomputedEmbedding;

  if (embedding === null) {
    try {
      const embedText = buildEmbedText(card.front, card.back, conceptTitle);
      embedding = await generateEmbedding(embedText);
    } catch (err) {
      console.error(
        `Embedding failed for card "${card.front}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (embedding === null) {
    await insertCard(userId, sessionId, conceptId, card.front, card.back, null, timezone);
    await logDedupDecision(userId, sessionId, card, {
      action: "add",
      mergeTargetId: null,
      mergedBack: null,
      reason: "Embedding failed, inserted without dedup",
      bestSimilarity: null,
    });
    return "add";
  }

  try {
    const decision = await deduplicateCard(
      userId,
      card.front,
      card.back,
      conceptTitle,
      embedding,
    );

    const effective = await applyDedupDecision(
      userId,
      sessionId,
      conceptId,
      card,
      embedding,
      decision,
      timezone,
    );
    await logDedupDecision(userId, sessionId, card, effective);
    return effective.action;
  } catch (err) {
    console.error(
      `Dedup failed for card "${card.front}", inserting with embedding:`,
      err instanceof Error ? err.message : err,
    );
    await insertCard(userId, sessionId, conceptId, card.front, card.back, embedding, timezone);
    await logDedupDecision(userId, sessionId, card, {
      action: "add",
      mergeTargetId: null,
      mergedBack: null,
      reason: "Dedup failed, inserted with embedding",
      bestSimilarity: null,
    });
    return "add";
  }
}

async function applyDedupDecision(
  userId: string,
  sessionId: string,
  conceptId: string,
  card: CardInput,
  embedding: number[],
  decision: DedupDecision,
  timezone: string,
): Promise<DedupDecision> {
  switch (decision.action) {
    case "add":
      await insertCard(userId, sessionId, conceptId, card.front, card.back, embedding, timezone);
      return decision;

    case "discard":
      return decision;

    case "merge": {
      if (!decision.mergeTargetId || !decision.mergedBack) {
        await insertCard(userId, sessionId, conceptId, card.front, card.back, embedding, timezone);
        return {
          ...decision,
          action: "add",
          reason: "Merge missing target or text, fell back to add",
        };
      }

      const { data: existing, error: fetchError } = await supabase
        .from("cards")
        .select("front, concepts(title)")
        .eq("id", decision.mergeTargetId)
        .single();

      if (fetchError || !existing) {
        await insertCard(userId, sessionId, conceptId, card.front, card.back, embedding, timezone);
        return {
          ...decision,
          action: "add",
          reason: fetchError
            ? `Merge target fetch failed: ${fetchError.message}`
            : "Merge target not found, fell back to add",
        };
      }

      const existingFront = existing.front;
      const concept = Array.isArray(existing?.concepts)
        ? existing.concepts[0]
        : existing?.concepts;
      const existingConceptTitle = (concept as { title: string } | null)?.title ?? "";

      const mergeEmbedText = buildEmbedText(
        existingFront,
        decision.mergedBack,
        existingConceptTitle,
      );
      const mergeEmbedding = await generateEmbedding(mergeEmbedText);
      const updated = await updateCardMerge(
        decision.mergeTargetId,
        decision.mergedBack,
        mergeEmbedding,
      );

      if (!updated) {
        await insertCard(userId, sessionId, conceptId, card.front, card.back, embedding, timezone);
        return {
          ...decision,
          action: "add",
          reason: "Merge target was deleted, fell back to add",
        };
      }

      return decision;
    }
  }
}

async function insertCard(
  userId: string,
  sessionId: string,
  conceptId: string,
  front: string,
  back: string,
  embedding: number[] | null,
  timezone: string,
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    session_id: sessionId,
    concept_id: conceptId,
    front,
    back,
    due_at: newCardDueAt(timezone).toISOString(),
    due_date: newCardDueDate(timezone),
  };
  if (embedding) {
    row.embedding = embedding;
  }

  const { error } = await supabase.from("cards").insert(row);
  if (error) throw error;
}

async function updateCardMerge(
  cardId: string,
  newBack: string,
  newEmbedding: number[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from("cards")
    .update({ back: newBack, embedding: newEmbedding })
    .eq("id", cardId)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function logDedupDecision(
  userId: string,
  sessionId: string,
  card: CardInput,
  decision: DedupDecision,
): Promise<void> {
  const { error } = await supabase.from("dedup_log").insert({
    user_id: userId,
    session_id: sessionId,
    new_card_front: card.front,
    new_card_back: card.back,
    action: decision.action,
    matched_card_id: decision.mergeTargetId,
    similarity: decision.bestSimilarity,
    reason: decision.reason,
  });

  if (error) {
    console.error("Failed to log dedup decision:", error);
  }
}
