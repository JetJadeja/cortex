import { supabase } from "../lib/supabase";
import { generateEmbedding, generateEmbeddings, buildEmbedText } from "./embedding";
import { deduplicateCard, DedupDecision } from "./dedup";

interface ConceptInput {
  title: string;
  explanation: string;
  cards: CardInput[];
}

interface CardInput {
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
  const { error } = await supabase
    .from("concepts")
    .delete()
    .eq("session_id", sessionId);

  if (error) throw error;
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

async function processCardWithDedup(
  userId: string,
  sessionId: string,
  conceptId: string,
  conceptTitle: string,
  card: CardInput,
  precomputedEmbedding: number[] | null,
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
    await insertCard(userId, conceptId, card.front, card.back, null);
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

    const effective = await applyDedupDecision(userId, conceptId, card, embedding, decision);
    await logDedupDecision(userId, sessionId, card, effective);
    return effective.action;
  } catch (err) {
    console.error(
      `Dedup failed for card "${card.front}", inserting with embedding:`,
      err instanceof Error ? err.message : err,
    );
    await insertCard(userId, conceptId, card.front, card.back, embedding);
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
  conceptId: string,
  card: CardInput,
  embedding: number[],
  decision: DedupDecision,
): Promise<DedupDecision> {
  switch (decision.action) {
    case "add":
      await insertCard(userId, conceptId, card.front, card.back, embedding);
      return decision;

    case "discard":
      return decision;

    case "merge": {
      if (!decision.mergeTargetId || !decision.mergedBack) {
        await insertCard(userId, conceptId, card.front, card.back, embedding);
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
        await insertCard(userId, conceptId, card.front, card.back, embedding);
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
        await insertCard(userId, conceptId, card.front, card.back, embedding);
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
  conceptId: string,
  front: string,
  back: string,
  embedding: number[] | null,
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    concept_id: conceptId,
    front,
    back,
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
