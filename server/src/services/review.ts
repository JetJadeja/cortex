import { supabase } from "../lib/supabase";
import { scheduleCard, gradeFromRating, Rating } from "../lib/fsrs";
import { getReviewedCardIdsToday } from "./review-state";

export interface RatingInput {
  card_id: string;
  concept_id: string;
  review_type: "card" | "quiz";
  effort: number;
  confidence: number;
  phase: 1 | 2;
  user_answer?: string;
}

export interface ReviewItem {
  type: "card";
  card_id: string;
  concept_id: string;
  front: string;
  back: string;
}

export async function processRating(userId: string, input: RatingInput): Promise<void> {
  const grade = gradeFromRating(input.effort, input.confidence);
  const shouldApplySchedule = input.phase === 1 || grade === Rating.Again;

  await supabase.from("review_history").insert({
    user_id: userId,
    card_id: input.card_id,
    concept_id: input.concept_id,
    review_type: input.review_type,
    effort_rating: input.effort,
    confidence_rating: input.confidence,
    was_voice: !!input.user_answer,
    phase: input.phase,
    schedule_applied: shouldApplySchedule,
  });

  if (!shouldApplySchedule) return;

  const { data: card } = await supabase
    .from("cards")
    .select("due_at, stability, difficulty")
    .eq("id", input.card_id)
    .single();

  if (!card) return;

  const lastReviewedAt = await getLastReviewDate(input.card_id);
  const now = new Date();

  const next = scheduleCard(
    { due_at: new Date(card.due_at), stability: card.stability, difficulty: card.difficulty },
    grade,
    now,
    lastReviewedAt,
  );

  await supabase
    .from("cards")
    .update({
      due_at: next.due_at.toISOString(),
      stability: next.stability,
      difficulty: next.difficulty,
    })
    .eq("id", input.card_id);
}

export async function getNextPhase1Item(userId: string, midnight: Date): Promise<ReviewItem | null> {
  const reviewedIds = await getReviewedCardIdsToday(userId, midnight);
  const now = new Date().toISOString();

  const { data: dueCards } = await supabase
    .from("cards")
    .select("id, concept_id, front, back, due_at, stability, concepts(priority)")
    .eq("user_id", userId)
    .lte("due_at", now)
    .order("due_at", { ascending: true });

  if (!dueCards) return null;

  const unreviewed = dueCards.filter((c) => !reviewedIds.has(c.id));
  if (unreviewed.length === 0) return null;

  const sorted = unreviewed.sort((a, b) => {
    const pa = priorityTier(a);
    const pb = priorityTier(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const card = sorted[0];

  return {
    type: "card",
    card_id: card.id,
    concept_id: card.concept_id,
    front: card.front,
    back: card.back,
  };
}

export async function getNextPhase2Item(userId: string, midnight: Date): Promise<ReviewItem | null> {
  const reviewedIds = await getReviewedCardIdsToday(userId, midnight);
  const now = new Date().toISOString();

  const { data: cards } = await supabase
    .from("cards")
    .select("id, concept_id, front, back")
    .eq("user_id", userId)
    .gt("due_at", now)
    .order("due_at", { ascending: true })
    .limit(50);

  if (!cards) return null;

  const card = cards.find((c) => !reviewedIds.has(c.id));
  if (!card) return null;

  return {
    type: "card",
    card_id: card.id,
    concept_id: card.concept_id,
    front: card.front,
    back: card.back,
  };
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

  const concept = Array.isArray(card.concepts) ? card.concepts[0] : card.concepts;
  if (concept?.priority === "core") return 1;

  return 2;
}

async function getLastReviewDate(cardId: string): Promise<Date | null> {
  const { data } = await supabase
    .from("review_history")
    .select("created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(2);

  // The first row is the review we just inserted, so we want the second
  if (data && data.length > 1) {
    return new Date(data[1].created_at);
  }
  return null;
}
