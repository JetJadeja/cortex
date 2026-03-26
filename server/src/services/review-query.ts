import { supabase } from "../lib/supabase";
import { todayDateString } from "../lib/timezone";
import { generateEmbedding, buildEmbedText } from "./embedding";

export interface CardItem {
  type: "card";
  card_id: string;
  concept_id: string;
  front: string;
  back: string;
}

export interface QuizItem {
  type: "quiz";
  quiz_id: string;
  concept_id: string;
  question: string;
  quiz_type: string;
}

export type ReviewItem = CardItem | QuizItem;

export interface DueCardWithContent {
  id: string;
  concept_id: string;
  concept_title: string;
  front: string;
  back: string;
}

export interface ContextCard {
  id: string;
  front: string;
  back: string;
  concept_title: string;
  similarity: number;
}

/**
 * Build the initial shuffled queue of card IDs for a review session.
 * Simply fetches cards where due_date <= today, sorted by priority tiers.
 * No mastered/reviewed filters — FSRS already pushes due_date forward on mastery.
 */
export async function buildInitialQueue(
  userId: string,
  _midnight: Date,
  timezone: string,
): Promise<string[]> {
  const today = todayDateString(timezone);

  const { data: dueCards } = await supabase
    .from("cards")
    .select("id, due_at, stability, concepts(priority)")
    .eq("user_id", userId)
    .lte("due_date", today)
    .order("due_at", { ascending: true });

  if (!dueCards || dueCards.length === 0) return [];

  const sorted: typeof dueCards = [];
  for (const tier of [0, 1, 2]) {
    sorted.push(
      ...shuffle(dueCards.filter((c) => priorityTier(c) === tier)),
    );
  }

  return sorted.map((c) => c.id);
}

/** Fetch all due cards with full content for quiz generation. */
export async function fetchDueCardsWithContent(
  userId: string,
  timezone: string,
): Promise<DueCardWithContent[]> {
  const today = todayDateString(timezone);

  const { data } = await supabase
    .from("cards")
    .select("id, concept_id, front, back, concepts(title)")
    .eq("user_id", userId)
    .lte("due_date", today);

  if (!data) return [];

  return data.map((card) => {
    const concept = Array.isArray(card.concepts)
      ? card.concepts[0]
      : card.concepts;
    return {
      id: card.id,
      concept_id: card.concept_id,
      concept_title: concept?.title ?? "Unknown",
      front: card.front,
      back: card.back,
    };
  });
}

/**
 * Find similar cards from the library for quiz context.
 * Runs one embedding search per unique concept in the due set,
 * then deduplicates and excludes any cards already in the due set.
 */
export async function fetchSimilarContextCards(
  userId: string,
  dueCards: DueCardWithContent[],
): Promise<ContextCard[]> {
  const dueCardIds = new Set(dueCards.map((c) => c.id));

  const conceptMap = new Map<string, DueCardWithContent>();
  for (const card of dueCards) {
    if (!conceptMap.has(card.concept_id)) {
      conceptMap.set(card.concept_id, card);
    }
  }

  const seen = new Set<string>();
  const contextCards: ContextCard[] = [];

  const searches = Array.from(conceptMap.values()).map(async (representative) => {
    const embedText = buildEmbedText(
      representative.front,
      representative.back,
      representative.concept_title,
    );
    const embedding = await generateEmbedding(embedText);

    const { data } = await supabase.rpc("match_cards", {
      query_embedding: embedding,
      match_user_id: userId,
      match_count: 10,
    });

    if (!data) return;

    for (const match of data) {
      if (dueCardIds.has(match.id) || seen.has(match.id)) continue;
      if (match.similarity < 0.3) continue;
      seen.add(match.id);
      contextCards.push({
        id: match.id,
        front: match.front,
        back: match.back,
        concept_title: match.concept_title,
        similarity: match.similarity,
      });
    }
  });

  await Promise.all(searches);

  return contextCards.sort((a, b) => b.similarity - a.similarity);
}

/** Fetch a single card's data by ID for serving to the client. */
export async function fetchCardById(
  cardId: string,
): Promise<CardItem | null> {
  const { data } = await supabase
    .from("cards")
    .select("id, concept_id, front, back")
    .eq("id", cardId)
    .single();

  if (!data) return null;

  return {
    type: "card",
    card_id: data.id,
    concept_id: data.concept_id,
    front: data.front,
    back: data.back,
  };
}

export async function getNextPhase2Item(
  userId: string,
): Promise<CardItem | null> {
  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total === 0) return null;

  const offset = Math.floor(Math.random() * total);

  const { data: cards } = await supabase
    .from("cards")
    .select("id, concept_id, front, back")
    .eq("user_id", userId)
    .range(offset, offset);

  const card = cards?.[0];
  if (!card) return null;

  return {
    type: "card",
    card_id: card.id,
    concept_id: card.concept_id,
    front: card.front,
    back: card.back,
  };
}

/**
 * Get the most recent review date for a card.
 * Called BEFORE inserting the current review, so data[0] is the real last review.
 */
export async function getLastReviewDate(
  cardId: string,
): Promise<Date | null> {
  const { data } = await supabase
    .from("review_history")
    .select("created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return new Date(data[0].created_at);
  }
  return null;
}

interface DueCard {
  stability: number;
  concepts: { priority: string }[] | { priority: string } | null;
}

/**
 * Priority tiers for Phase 1 ordering:
 * 0 = previously failed (reviewed at least once, stability < 2 days)
 * 1 = core-tagged concepts
 * 2 = everything else
 */
function priorityTier(card: DueCard): number {
  const isFailedCard = card.stability > 0 && card.stability < 2;
  if (isFailedCard) return 0;

  const concept = Array.isArray(card.concepts)
    ? card.concepts[0]
    : card.concepts;
  if (concept?.priority === "core") return 1;

  return 2;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
