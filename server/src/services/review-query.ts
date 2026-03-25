import { supabase } from "../lib/supabase";
import { todayDateString } from "../lib/timezone";
import {
  getMasteredCardIdsToday,
  getReviewedCardIdsToday,
} from "./review-state";

export interface ReviewItem {
  type: "card";
  card_id: string;
  concept_id: string;
  front: string;
  back: string;
}

/** Build the initial shuffled queue of card IDs for a review session. */
export async function buildInitialQueue(
  userId: string,
  midnight: Date,
  timezone: string,
): Promise<string[]> {
  const [masteredIds, reviewedIds] = await Promise.all([
    getMasteredCardIdsToday(userId, timezone),
    getReviewedCardIdsToday(userId, midnight),
  ]);

  const today = todayDateString(timezone);

  const { data: dueCards } = await supabase
    .from("cards")
    .select("id, due_at, stability, concepts(priority)")
    .eq("user_id", userId)
    .lte("due_date", today)
    .order("due_at", { ascending: true });

  if (!dueCards) return [];

  const remaining = dueCards.filter((c) => !masteredIds.has(c.id));
  if (remaining.length === 0) return [];

  const fresh: typeof remaining = [];
  const recycled: typeof remaining = [];

  for (const card of remaining) {
    if (reviewedIds.has(card.id)) {
      recycled.push(card);
    } else {
      fresh.push(card);
    }
  }

  const shuffledFresh: typeof remaining = [];
  for (const tier of [0, 1, 2]) {
    shuffledFresh.push(
      ...shuffle(fresh.filter((c) => priorityTier(c) === tier)),
    );
  }

  shuffle(recycled);

  return [...shuffledFresh, ...recycled].map((c) => c.id);
}

/** Fetch a single card's data by ID for serving to the client. */
export async function fetchCardById(
  cardId: string,
): Promise<ReviewItem | null> {
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
): Promise<ReviewItem | null> {
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
